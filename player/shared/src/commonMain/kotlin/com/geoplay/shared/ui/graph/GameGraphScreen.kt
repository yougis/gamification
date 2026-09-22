package com.geoplay.shared.ui.graph

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.geoplay.shared.model.GameNode
import com.geoplay.shared.model.NodeState

// Libellé d'état (pur, testé en commonTest) : jamais de couleur seule,
// le texte porte toujours l'état pour l'accessibilité.
fun nodeStateLabel(state: NodeState): String = when (state) {
    NodeState.LOCKED -> "Verrouillée"
    NodeState.UNLOCKED -> "Disponible"
    NodeState.ACTIVE -> "En cours"
    NodeState.COMPLETED -> "Terminée"
}

// Écran du graphe de jeu (change player-kmp-migration, 4.2) : liste des
// nœuds avec leurs états. Composant bête — l'orchestrateur (GameEngine)
// fournit `states`, le clic remonte l'id.
@Composable
fun GameGraphScreen(
    nodes: List<GameNode>,
    states: Map<String, NodeState>,
    onNodeClick: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    LazyColumn(modifier = modifier) {
        items(nodes, key = { it.id }) { node ->
            val state = states[node.id] ?: NodeState.LOCKED
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 6.dp)
                    .clickable { onNodeClick(node.id) },
            ) {
                Row(modifier = Modifier.padding(12.dp)) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(text = node.id, style = MaterialTheme.typography.titleMedium)
                        Text(
                            text = node.module.type,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Text(
                        text = nodeStateLabel(state),
                        style = MaterialTheme.typography.labelLarge,
                        color = if (state == NodeState.COMPLETED) MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.onSurface,
                    )
                }
            }
        }
    }
}
