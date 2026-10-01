package com.geoplay.shared.ui.navigation

import androidx.compose.runtime.Composable
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
import com.geoplay.shared.game.widgetsCarteEcran
import com.geoplay.shared.model.Game
import com.geoplay.shared.model.NodeState
import com.geoplay.shared.model.ScreenWidget
import com.geoplay.shared.ui.graph.GameGraphScreen
import com.geoplay.shared.ui.quiz.QuizScreen
import com.geoplay.shared.ui.quiz.parseQuizQuestions
import com.geoplay.shared.ui.map.MapWidgetBlock
import com.geoplay.shared.ui.screen.CarteContexte
import com.geoplay.shared.ui.screen.ScreenRenderer
import com.geoplay.shared.ui.theme.GeoPlayTheme
import com.geoplay.shared.ui.toolbox.ToolboxDialog
import com.geoplay.shared.ui.toolbox.ToolboxIconButton
import com.geoplay.shared.game.toolboxIconVisible
import com.geoplay.shared.game.showHomeDashboard
import com.geoplay.shared.game.Navigation
import com.geoplay.shared.game.VueMode
import com.geoplay.shared.game.modeVue
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
    // Tableau de bord (change player-home-dashboard, home-player-runtime 7.2) :
    // vue par defaut quand aucune epreuve n'est ouverte et presentation
    // inclut HOME. Defauts = pas de tableau.
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
    // Navigation explicite (change simulateur-compose-sans-pwa : cycle sans
    // etat intermediaire) :
    // `nav` est la position vue (HOME ou etape + mode). Aucune ouverture
    // auto, aucune avance auto : Valider/Abandonner reviennent ici via le shell.
    val nav: Navigation = remember(selectedNodeId, states) {
        val id = selectedNodeId
        if (id == null) Navigation.Home else Navigation.Etape(id, modeVue(states[id]))
    }
    // Epreuve en cours = etape ouverte en mode jouable/rejouable. Le plein
    // ecran carte est inaccessible pendant une epreuve (vues exclusives).
    val epreuveEnCours = (nav as? Navigation.Etape)?.let { it.mode == VueMode.JOUABLE || it.mode == VueMode.REJEU } == true
    var toolboxOpen by remember { mutableStateOf(false) }
    // Carte plein écran (change widget-cartographie) : remplace HOME (pas un
    // overlay), un seul à la fois, inaccessible pendant une epreuve.
    // Retour via l'entrée Accueil : ni transition ni event.
    var cartePleinEcran by remember { mutableStateOf<ScreenWidget?>(null) }
    fun ouvrirCartePleinEcran(w: ScreenWidget) {
        if (!epreuveEnCours) cartePleinEcran = w
    }
    fun openNode(id: String) {
        // Hook hôte (change player-android-compose) : l'hôte suit l'ouverture
        // (bookkeeping : étape vue, journal) SANS remplacer la navigation.
        // La présentation de l'éligible reste interne et inconditionnelle.
        onOpenNode?.invoke(id)
        // Routage par type via le registre (change parite-player) : tout
        // type s'ouvre, l'inconnu dégrade gracieusement dans l'écran
        // (message, jamais de crash).
        if (game.nodes.any { it.id == id }) {
            selectedNodeId = id
            navController.navigate(GeoPlayRoutes.NODE)
        }
    }
    // Retour HOME systematique (change home-player-runtime, 7.2 : fin de
    // l'avance auto). Apres ecriture (persistance par le shell via le
    // callback), depiler vers HOME/liste. Abandon/retour ne font que depiler.
    // Aucune transition moteur, aucun event : seule la navigation bouge.
    fun completeAndAdvance(id: String, finish: () -> Unit) {
        finish()
        navController.popBackStack()
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
                viewedId = (nav as? Navigation.Etape)?.id,
            )
            if (toolboxOpen) {
                ToolboxDialog(
                    game = game,
                    inventory = inventory,
                    onSelect = onItemSelected,
                    onClose = { toolboxOpen = false },
                )
            }
        val carteActive = cartePleinEcran
        if (carteActive != null && !epreuveEnCours) {
            // Plein écran carte (change widget-cartographie) : remplace HOME,
            // retour via l'entrée Accueil. Navigation pure : ni transition
            // ni event. Un seul à la fois (remplacement, pas de file).
            Column(modifier = Modifier.weight(1f)) {
                TextButton(onClick = { cartePleinEcran = null }) { Text("← Accueil") }
                // Position GPS (change carte-joueur-navigable, phase 2).
                val positionJoueur = com.geoplay.shared.ui.map.rememberPositionJoueur()
                MapWidgetBlock(
                    widget = carteActive,
                    game = game,
                    states = states,
                    onOpenNode = ::openNode,
                    onPleinEcran = null,
                    position = positionJoueur,
                )
            }
        } else {
        NavHost(navController = navController, startDestination = GeoPlayRoutes.GRAPH, modifier = Modifier.weight(1f)) {
            composable(GeoPlayRoutes.GRAPH) {
                // Etape vue (tous modes) : le tableau est le defaut quand
                // aucune epreuve n'est ouverte. Navigation pure.
                val etapeVue = (nav as? Navigation.Etape)?.id
                // Onglet Accueil permanent (change studio-home-accueil) : quand
                // HOME est présent, le tableau reste accessible à tout moment
                // via l'onglet, sans changer la règle d'affichage par défaut
                // (tableau si aucune epreuve ouverte). Navigation pure : ni
                // transition d'état ni event.
                val homeDisponible = game.global.presentation.contains("HOME")
                var ongletAccueil by remember(game, etapeVue) { mutableStateOf(showHomeDashboard(game, etapeVue)) }
                if (homeDisponible) {
                    Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp)) {
                        TextButton(onClick = { ongletAccueil = true }) { Text("Accueil") }
                        TextButton(onClick = { ongletAccueil = false }) { Text("Vue") }
                    }
                }
                if ((homeDisponible && ongletAccueil) || (!homeDisponible && showHomeDashboard(game, etapeVue))) {
                    HomeDashboard(
                        game = game,
                        states = states,
                        elapsedMs = elapsedMs,
                        countdownsMs = countdownsMs,
                        queueHeadId = queueHeadId,
                        showInventoryEntry = toolboxIconVisible(game, etapeVue),
                        inventoryCount = inventory.values.sum(),
                        onOpen = ::openNode,
                        onInventoryOpen = {
                            toolboxOpen = true
                            onInventoryOpen()
                        },
                        tempsRestantMs = tempsRestantMs,
                        verrouillagesMs = verrouillagesMs,
                        horsDelai = horsDelai,
                        iconesCarte = widgetsCarteEcran(game.global.screen),
                        onOuvrirCarte = ::ouvrirCartePleinEcran,
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
                // Lu depuis `nav` (identique à selectedNodeId : nav etape ⟺ id).
                val nodeId = (nav as? Navigation.Etape)?.id.orEmpty()
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
                        // Carte strate 2 (change widget-cartographie) : lecture
                        // passive + plein écran (refusé pendant une modale).
                        carte = CarteContexte(
                            game = game,
                            states = states,
                            onOpenNode = ::openNode,
                            onPleinEcran = ::ouvrirCartePleinEcran,
                        ),
                    )
                }
            }
        }
        }
        }
    }
}
