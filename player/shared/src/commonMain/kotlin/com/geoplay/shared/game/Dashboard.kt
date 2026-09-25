package com.geoplay.shared.game

import com.geoplay.shared.model.Anchor
import com.geoplay.shared.model.ConditionType
import com.geoplay.shared.model.GameNode

// Vue par défaut (change player-home-dashboard, 2.2) : le tableau de bord
// s'affiche quand presentation inclut HOME et qu'aucune modale n'est
// ACTIVE. Combinable (HOME + MAP + TOOLBOX) : chaque règle reste
// indépendante. Sans HOME : comportement actuel inchangé.
fun showHomeDashboard(game: Game, activeNodeId: String? = null): Boolean =
    "HOME" in game.global.presentation && activeNodeId == null
fun timerRemainingMs(
    node: GameNode,
    completedAt: Map<String, Long>,
    nowMs: Long
): Long? {
    for (c in node.activation.requires) {
        if (c.type != ConditionType.TIMER) continue
        val anchor = if (c.anchor == Anchor.NODE_COMPLETION) {
            completedAt[c.anchorNodeId] ?: return null
        } else {
            0L
        }
        val dueAt = anchor + (c.delaySeconds ?: 0L) * 1000L
        if (nowMs >= dueAt) continue
        return dueAt - nowMs
    }
    return null
}
