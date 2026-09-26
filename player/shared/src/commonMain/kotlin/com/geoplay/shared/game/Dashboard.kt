package com.geoplay.shared.game

import com.geoplay.shared.model.Anchor
import com.geoplay.shared.model.ConditionType
import com.geoplay.shared.model.Game
import com.geoplay.shared.model.GameNode

// Tableau de bord (change player-home-dashboard) : calculs purs partagés.
// Compte à rebours d'un POI = première condition TIMER non satisfaite :
// `ancre + délai − nowMs` (jamais négatif). Ancre NODE_COMPLETION absente
// → null (pas de compte à rebours fictif). Aucune condition TIMER ou
// toutes satisfaites → null. Zéro nouvelle donnée auteur.

// Vue par défaut (2.2) : le tableau de bord s'affiche quand presentation
// inclut HOME et qu'aucune modale n'est ACTIVE. Combinable
// (HOME + MAP + TOOLBOX) : chaque règle reste indépendante. Sans HOME :
// comportement actuel inchangé.
fun showHomeDashboard(game: Game, activeNodeId: String? = null): Boolean =
    "HOME" in game.global.presentation && activeNodeId == null

// Nœud principal à l'arrivée (change player-immersion-parcours) : lecture
// pure du graphe + états, zéro donnée auteur. Ordre : nœud `start`
// éligible non terminé > premier nœud racine non terminé (aucune
// dépendance NODE_COMPLETED/POOL_DRAWN entrante, ordre des nœuds,
// déterministe) > tête de file non terminée > null (repli liste).
// L'ouverture reste une présentation d'éligible : aucune transition,
// aucun event.
fun noeudPrincipal(
    game: Game,
    unlocked: List<String>,
    completedIds: Set<String>,
    queue: List<String>
): String? {
    val eligibleOpen = unlocked.filter { it !in completedIds }
    game.nodes.find { it.id == "start" && it.id in eligibleOpen }?.let { return it.id }
    game.nodes.firstOrNull { n ->
        n.id in eligibleOpen && n.activation.requires.none {
            it.type == ConditionType.NODE_COMPLETED || it.type == ConditionType.POOL_DRAWN
        }
    }?.let { return it.id }
    return queue.firstOrNull { it !in completedIds }
}

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

// Verrouillage à venir d'un POI (change game-temps-global-fenetres) :
// première borne `avantSecondes` non encore atteinte → ms restantes.
// Aucune borne ou toutes atteintes → null. Zéro nouvelle donnée auteur.
fun verrouillageDansMs(node: GameNode, nowMs: Long): Long? {
    for (c in node.activation.requires) {
        if (c.type != ConditionType.WINDOW) continue
        val avant = c.avantSecondes ?: continue
        val restant = avant * 1000L - nowMs
        if (restant > 0L) return restant
    }
    return null
}
