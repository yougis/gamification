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
) {
    val navController = rememberNavController()
    // Id du nœud en cours hoisté (pas d'arguments de route : `Bundle.getString`
    // n'existe pas en commonMain navigation-compose).
    var selectedNodeId by remember { mutableStateOf<String?>(null) }
    var toolboxOpen by remember { mutableStateOf(false) }
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
