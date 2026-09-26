package com.geoplay.shared.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.ui.unit.dp
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.geoplay.shared.game.resolveScreen
import com.geoplay.shared.game.resolveWidgetStyle
import com.geoplay.shared.model.Game
import com.geoplay.shared.model.NodeState
import com.geoplay.shared.ui.graph.GameGraphScreen
import com.geoplay.shared.ui.quiz.QuizScreen
import com.geoplay.shared.ui.quiz.parseQuizQuestions
import com.geoplay.shared.ui.screen.ScreenRenderer
import com.geoplay.shared.ui.theme.GeoPlayTheme
import com.geoplay.shared.ui.toolbox.ToolboxDialog
import com.geoplay.shared.ui.toolbox.ToolboxIconButton
import com.geoplay.shared.game.toolboxIconVisible
import com.geoplay.shared.game.noeudPrincipal
import com.geoplay.shared.game.showHomeDashboard
import com.geoplay.shared.ui.home.HomeDashboard

// Navigation commune (change player-kmp-migration, 4.1) : graphe -> module.
// Les apps Android/iOS hébergent `GeoPlayApp` et fournissent états + callbacks.
object GeoPlayRoutes {
    const val GRAPH = "graph"
    const val NODE = "node"
}

@Composable
fun GeoPlayApp(
    game: Game,
    states: Map<String, NodeState>,
    onQuizComplete: (nodeId: String, score: Int) -> Unit,
    onBack: () -> Unit = {},
    modifier: Modifier = Modifier,
    // Boîte à outils (change player-inventory-toolbox) : overlay, jamais
    // une navigation. Défauts vides = aucune icône (pas d'inventaire réel).
    inventory: Map<String, Int> = emptyMap(),
    onInventoryOpen: () -> Unit = {},
    onItemSelected: (String) -> Unit = {},
    // Tableau de bord (change player-home-dashboard) : vue par défaut quand
    // aucune modale ACTIVE et presentation inclut HOME. Défauts = pas de
    // tableau (comportement actuel inchangé).
    elapsedMs: Long = 0L,
    countdownsMs: Map<String, Long?> = emptyMap(),
    queueHeadId: String? = null,
    onOpenNode: ((String) -> Unit)? = null,
    // Temps global (change game-temps-global-fenetres) : ms restantes de
    // partie, verrouillages par POI, flag hors délai. Défauts = tableau
    // historique inchangé.
    tempsRestantMs: Long? = null,
    verrouillagesMs: Map<String, Long?> = emptyMap(),
    horsDelai: Boolean = false,
    // File d'éligibilité (change player-immersion-parcours) : sert la règle
    // d'arrivée et l'avance auto. Défauts = pas d'ouverture auto (repli liste).
    unlocked: List<String> = emptyList(),
    queue: List<String> = emptyList(),
    // Contenu d'image (change parite-player) : le shell résout `src`
    // vers ses assets du pack. Défaut = rien (jamais de réseau).
    imageContent: @Composable (src: String, alt: String?) -> Unit = { _, _ -> },
    // Complétion d'un module sans renderer dédié (Terminer par triche).
    // Défaut = même effet qu'un quiz à 0 point.
    onModuleComplete: (nodeId: String) -> Unit = { onQuizComplete(it, 0) },
) {
    val navController = rememberNavController()
    // Id du nœud en cours hoisté (pas d'arguments de route : `Bundle.getString`
    // n'existe pas en commonMain navigation-compose).
    var selectedNodeId by remember { mutableStateOf<String?>(null) }
    var toolboxOpen by remember { mutableStateOf(false) }
    fun openNode(id: String) {
        if (onOpenNode != null) {
            onOpenNode(id)
            return
        }
        // Routage par type via le registre (change parite-player) : tout
        // type s'ouvre, l'inconnu dégrade gracieusement dans l'écran
        // (message, jamais de crash).
        if (game.nodes.any { it.id == id }) {
            selectedNodeId = id
            navController.navigate(GeoPlayRoutes.NODE)
        }
    }
    // Avance auto (change player-immersion-parcours) : après complétion
    // enregistrée (persistance par le shell via les callbacks), naviguer
    // vers le premier éligible non terminé ; sinon tableau (HOME) ou liste
    // (repli, déjà affichés). Abandon/retour n'avance jamais. Aucune
    // transition moteur, aucun event : seule la navigation bouge.
    var advanceFrom by remember { mutableStateOf<String?>(null) }
    fun completeAndAdvance(id: String, finish: () -> Unit) {
        finish()
        navController.popBackStack()
        advanceFrom = id
    }
    LaunchedEffect(states, advanceFrom) {
        val from = advanceFrom ?: return@LaunchedEffect
        // Attendre l'état frais : le nœud doit être COMPLETED.
        if (states[from] != NodeState.COMPLETED) return@LaunchedEffect
        advanceFrom = null
        val completed = states.filterValues { it == NodeState.COMPLETED }.keys
        noeudPrincipal(game, unlocked, completed, queue)?.let { openNode(it) }
    }
    // Arrivée immersive (change player-immersion-parcours) : une seule fois
    // par jeu, ouvrir l'écran du nœud principal. Avec HOME : le tableau
    // pilote (pas d'ouverture auto). Sans éligible : repli liste.
    // Présentation d'éligible uniquement : aucune transition, aucun event.
    LaunchedEffect(game) {
        val activeId = states.entries.find { it.value == NodeState.ACTIVE }?.key
        if (!showHomeDashboard(game, activeId)) {
            val completed = states.filterValues { it == NodeState.COMPLETED }.keys
            noeudPrincipal(game, unlocked, completed, queue)?.let { openNode(it) }
        }
    }
    GeoPlayTheme {
        androidx.compose.foundation.layout.Column(modifier = modifier) {
            ToolboxIconButton(
                game = game,
                states = states,
                onOpen = {
                    toolboxOpen = true
                    onInventoryOpen()
                },
            )
            if (toolboxOpen) {
                ToolboxDialog(
                    game = game,
                    inventory = inventory,
                    onSelect = onItemSelected,
                    onClose = { toolboxOpen = false },
                )
            }
        NavHost(navController = navController, startDestination = GeoPlayRoutes.GRAPH, modifier = Modifier.weight(1f)) {
            composable(GeoPlayRoutes.GRAPH) {
                val activeId = states.entries.find { it.value == NodeState.ACTIVE }?.key
                // Onglet Accueil permanent (change studio-home-accueil) : quand
                // HOME est présent, le tableau reste accessible à tout moment
                // via l'onglet, sans changer la règle d'affichage par défaut
                // (tableau si aucune modale ACTIVE). Navigation pure : ni
                // transition d'état ni event.
                val homeDisponible = game.global.presentation.contains("HOME")
                var ongletAccueil by remember(game, activeId) { mutableStateOf(showHomeDashboard(game, activeId)) }
                if (homeDisponible) {
                    Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp)) {
                        TextButton(onClick = { ongletAccueil = true }) { Text("Accueil") }
                        TextButton(onClick = { ongletAccueil = false }) { Text("Vue") }
                    }
                }
                if ((homeDisponible && ongletAccueil) || (!homeDisponible && showHomeDashboard(game, activeId))) {
                    HomeDashboard(
                        game = game,
                        states = states,
                        elapsedMs = elapsedMs,
                        countdownsMs = countdownsMs,
                        queueHeadId = queueHeadId,
                        showInventoryEntry = toolboxIconVisible(game, activeId),
                        inventoryCount = inventory.values.sum(),
                        onOpen = ::openNode,
                        onInventoryOpen = {
                            toolboxOpen = true
                            onInventoryOpen()
                        },
                        tempsRestantMs = tempsRestantMs,
                        verrouillagesMs = verrouillagesMs,
                        horsDelai = horsDelai,
                    )
                } else {
                GameGraphScreen(
                    nodes = game.nodes,
                    states = states,
                    onNodeClick = { id -> openNode(id) },
                )
                }
            }
            composable(GeoPlayRoutes.NODE) {
                val nodeId = selectedNodeId.orEmpty()
                val node = game.nodes.find { it.id == nodeId }
                if (node == null) {
                    Text("Étape introuvable.", modifier = Modifier.padding(16.dp))
                } else {
                    ScreenRenderer(
                        screen = resolveScreen(game, node),
                        branding = game.branding,
                        moduleSlot = {
                            if (node.module.type == "QUIZ") {
                                QuizScreen(
                                    questions = parseQuizQuestions(node.module.data),
                                    onComplete = { score ->
                                        completeAndAdvance(nodeId) { onQuizComplete(nodeId, score) }
                                    },
                                )
                            } else {
                                // Module sans renderer joueur : état explicite
                                // non bloquant (terminer/abandonner).
                                Column(
                                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                                    verticalArrangement = Arrangement.spacedBy(12.dp),
                                ) {
                                    Text("Module ${node.module.type} : rendu joueur bientôt disponible.")
                                    Button(onClick = {
                                        completeAndAdvance(nodeId) { onModuleComplete(nodeId) }
                                    }) { Text("Terminer") }
                                    Button(onClick = { navController.popBackStack() }) { Text("Retour") }
                                }
                            }
                        },
                        imageContent = imageContent,
                        styleOf = { resolveWidgetStyle(game, node, it) },
                        // Pagination des sous-pages (change screen-subpages) :
                        // Terminer complète le nœud comme le bouton du slot.
                        sousPages = true,
                        onTerminer = {
                            completeAndAdvance(nodeId) { onModuleComplete(nodeId) }
                        },
                    )
                }
            }
        }
        }
    }
}
