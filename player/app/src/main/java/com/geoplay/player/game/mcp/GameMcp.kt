package com.geoplay.player.game.mcp

import com.geoplay.player.model.Activation
import com.geoplay.player.model.Anchor
import com.geoplay.player.model.Condition
import com.geoplay.player.model.ConditionType
import com.geoplay.player.model.Game
import com.geoplay.player.model.GameNode
import com.geoplay.player.model.HoldExit
import com.geoplay.player.model.HoldExitMethod
import com.geoplay.player.model.HoldMode
import com.geoplay.player.model.ModuleData
import com.geoplay.player.model.Operator

// Port de studio/src/game/mcp.ts addSecoursCode : secours QUIZ + OR sur les avals.
fun addSecoursCode(game: Game, nodeId: String): Game {
    val sid = "secours-$nodeId"
    if (game.nodes.any { it.id == sid }) throw IllegalArgumentException("secours existe déjà")
    val secours = GameNode(
        id = sid,
        module = ModuleData(type = "QUIZ"),
        activation = Activation(
            requires = listOf(
                Condition(type = ConditionType.TIMER, anchor = Anchor.GAME_START, delaySeconds = 0)
            )
        )
    )
    val nodes = (game.nodes + secours).map { m ->
        val uses = m.activation.requires.any { it.type == ConditionType.NODE_COMPLETED && it.nodeId == nodeId }
        if (!uses) return@map m
        val requires = m.activation.requires + Condition(
            type = ConditionType.NODE_COMPLETED,
            nodeId = sid
        )
        m.copy(activation = m.activation.copy(requires = requires, operator = Operator.OR))
    }
    return game.copy(nodes = nodes)
}

fun setHoldMode(game: Game, mode: HoldMode): Game {
    return game.copy(holdMode = mode)
}

fun setHoldExit(game: Game, exitConfig: HoldExit): Game {
    return game.copy(holdExit = exitConfig)
}

fun getHoldConfig(game: Game): Pair<HoldMode, HoldExit?> {
    return Pair(game.holdMode, game.holdExit)
}
