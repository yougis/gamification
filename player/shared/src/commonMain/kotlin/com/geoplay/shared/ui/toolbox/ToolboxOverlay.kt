package com.geoplay.shared.ui.toolbox

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.geoplay.shared.game.toolboxIconVisible
import com.geoplay.shared.model.Game
import com.geoplay.shared.model.NodeState

// Boîte à outils en overlay (change player-inventory-toolbox) : ouvrir
// n'est PAS un changement d'écran — pas de transition d'état, pas d'event
// de progression. Fermer reprend l'écran exact (états, modale, file
// inchangés). Position configurable par experienceStyle.components.toolbox,
// jamais codée en dur (repli : coin haut-droit).
@Composable
fun ToolboxIconButton(
    game: Game,
    states: Map<String, NodeState>,
    onOpen: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val activeId = states.entries.find { it.value == NodeState.ACTIVE }?.key
    if (!toolboxIconVisible(game, activeId)) return
    Row(modifier = modifier.fillMaxWidth()) {
        androidx.compose.foundation.layout.Spacer(modifier = Modifier.weight(1f))
        IconButton(onClick = onOpen) {
            Text(text = "🎒", style = MaterialTheme.typography.titleLarge)
        }
    }
}

@Composable
fun ToolboxDialog(
    game: Game,
    inventory: Map<String, Int>,
    onSelect: (String) -> Unit,
    onClose: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onClose,
        title = { Text(text = "Boîte à outils") },
        text = {
            if (inventory.isEmpty()) {
                Text(
                    text = "Boîte à outils vide.",
                    style = MaterialTheme.typography.bodyMedium,
                )
            } else {
                Column {
                    for ((itemId, qty) in inventory) {
                        val name = game.objects.find { it.id == itemId }?.name ?: itemId
                        Text(
                            text = "$name × $qty",
                            style = MaterialTheme.typography.bodyLarge,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onSelect(itemId) }
                                .padding(vertical = 8.dp),
                        )
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onClose) { Text(text = "Fermer") }
        },
    )
}
