package com.geoplay.shared.game

import com.geoplay.shared.model.Game

// Icône d'inventaire persistante (change player-inventory-toolbox) : UNE
// règle, natif comme PWA, lue du JSON des deux côtés.
// Visible ssi : le jeu définit des objets ET presentation inclut TOOLBOX
// ET le nœud courant ne la masque pas. Le nœud ne peut que masquer
// (inventoryAccess = false), jamais forcer : pas d'icône sans inventaire.
fun toolboxIconVisible(game: Game, activeNodeId: String? = null): Boolean {
    if (game.objects.isEmpty()) return false
    if (!game.global.presentation.contains("TOOLBOX")) return false
    if (activeNodeId == null) return true
    return game.nodes.find { it.id == activeNodeId }?.inventoryAccess != false
}
