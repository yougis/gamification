package com.geoplay.shared.ui.home

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.geoplay.shared.model.Game
import com.geoplay.shared.model.NodeState
import com.geoplay.shared.ui.graph.nodeStateLabel

// Tableau de bord joueur (change player-home-dashboard) : vue par défaut
// quand aucune modale ACTIVE et que presentation inclut HOME. Présentation
// pure — états, file et journal inchangés : ouvrir passe par la file
// existante, fermer/revenir = reprise exacte. Temps limites d'épreuve
// exclus par construction (vivent dans les écrans d'étapes).
fun formatDuration(ms: Long): String {
    val totalSec = (ms.coerceAtLeast(0L) / 1000L).toInt()
    val h = totalSec / 3600
    val m = (totalSec % 3600) / 60
    val s = totalSec % 60
    fun two(n: Int) = n.toString().padStart(2, '0')
    return if (h > 0) "$h:${two(m)}:${two(s)}" else "${two(m)}:${two(s)}"
}

@Composable
fun HomeDashboard(
    game: Game,
    states: Map<String, NodeState>,
    elapsedMs: Long,
    countdownsMs: Map<String, Long?>,
    queueHeadId: String?,
    showInventoryEntry: Boolean,
    inventoryCount: Int,
    onOpen: (String) -> Unit,
    onInventoryOpen: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.padding(16.dp)) {
        Text(
            text = "⏱ ${formatDuration(elapsedMs)}",
            style = MaterialTheme.typography.headlineSmall,
        )
        if (showInventoryEntry) {
            TextButton(onClick = onInventoryOpen) {
                Text(text = "🎒 Boîte à outils ($inventoryCount)")
            }
        }
        for (node in game.nodes) {
            if (node.randomPool != null) continue
            val state = states[node.id] ?: NodeState.LOCKED
            val remaining = countdownsMs[node.id]
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
            ) {
                Row(modifier = Modifier.padding(12.dp)) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(text = node.id, style = MaterialTheme.typography.titleMedium)
                        Text(
                            text = nodeStateLabel(state),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    if (remaining != null) {
                        Text(
                            text = "dans ${formatDuration(remaining)}",
                            style = MaterialTheme.typography.labelLarge,
                            color = MaterialTheme.colorScheme.primary,
                        )
                    }
                }
            }
        }
        if (queueHeadId != null) {
            Button(
                onClick = { onOpen(queueHeadId) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp),
            ) {
                Text(text = "Ouvrir : $queueHeadId")
            }
        }
    }
}
