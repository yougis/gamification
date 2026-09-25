package com.geoplay.shared.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.geoplay.shared.model.Game
import com.geoplay.shared.model.NodeState
import com.geoplay.shared.ui.graph.GameGraphScreen
import com.geoplay.shared.ui.quiz.QuizScreen
import com.geoplay.shared.ui.quiz.parseQuizQuestions
import com.geoplay.shared.ui.theme.GeoPlayTheme
import com.geoplay.shared.ui.toolbox.ToolboxDialog
import com.geoplay.shared.ui.toolbox.ToolboxIconButton
import com.geoplay.shared.game.toolboxIconVisible
import com.geoplay.shared.ui.home.HomeDashboard

// Navigation commune (change player-kmp-migration, 4.1) : graphe -> module.
// Les apps Android/iOS hébergent `GeoPlayApp` et fournissent états + callbacks.
object GeoPlayRoutes {
    const val GRAPH = "graph"
    const val QUIZ = "quiz"
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
        val node = game.nodes.find { it.id == id } ?: return
        if (node.module.type == "QUIZ") {
            selectedNodeId = id
            navController.navigate(GeoPlayRoutes.QUIZ)
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
                if ("HOME" in game.global.presentation && activeId == null) {
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
                    )
                } else {
                GameGraphScreen(
                    nodes = game.nodes,
                    states = states,
                    onNodeClick = { id ->
                        val node = game.nodes.find { it.id == id } ?: return@GameGraphScreen
                        if (node.module.type == "QUIZ") {
                            selectedNodeId = id
                            navController.navigate(GeoPlayRoutes.QUIZ)
                        }
                    },
                )
                }
            }
            composable(GeoPlayRoutes.QUIZ) {
                val nodeId = selectedNodeId.orEmpty()
                val node = game.nodes.find { it.id == nodeId }
                QuizScreen(
                    questions = parseQuizQuestions(node?.module?.data ?: emptyMap()),
                    onComplete = { score ->
                        onQuizComplete(nodeId, score)
                        navController.popBackStack()
                    },
                )
            }
        }
        }
    }
}
