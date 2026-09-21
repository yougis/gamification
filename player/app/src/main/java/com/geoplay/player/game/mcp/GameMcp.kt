package com.geoplay.player.game.mcp

import com.geoplay.shared.model.Activation
import com.geoplay.shared.model.Anchor
import com.geoplay.shared.model.Branding
import com.geoplay.shared.model.Condition
import com.geoplay.shared.model.ConditionType
import com.geoplay.shared.model.ExperienceStyle
import com.geoplay.shared.model.Game
import com.geoplay.shared.model.GameNode
import com.geoplay.shared.model.HoldExit
import com.geoplay.shared.model.HoldExitMethod
import com.geoplay.shared.model.HoldMode
import com.geoplay.shared.model.ModuleData
import com.geoplay.shared.model.Operator
import com.geoplay.shared.model.GameMode
import com.geoplay.shared.model.Difficulty

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

fun setExperienceStyle(game: Game, style: ExperienceStyle): Game {
    return game.copy(experienceStyle = style)
}

fun setBranding(game: Game, branding: Branding): Game {
    return game.copy(branding = branding)
}

fun setGameMode(game: Game, mode: GameMode): Game {
    return game.copy(gameMode = mode)
}

fun setDifficulty(game: Game, difficulty: Difficulty): Game {
    return game.copy(difficulty = difficulty)
}

fun getGameMode(game: Game): GameMode = game.gameMode
fun getDifficulty(game: Game): Difficulty = game.difficulty
