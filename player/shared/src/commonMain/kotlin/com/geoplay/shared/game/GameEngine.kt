package com.geoplay.shared.game

import com.geoplay.shared.model.ConditionType
import com.geoplay.shared.model.DrawTiming
import com.geoplay.shared.model.DiscoveryMode
import com.geoplay.shared.model.ExperienceStyle
import com.geoplay.shared.model.Game
import com.geoplay.shared.model.GameNode
import com.geoplay.shared.model.GlobalData
import com.geoplay.shared.model.HoldExit
import com.geoplay.shared.model.HoldMode
import com.geoplay.shared.model.ModuleData
import com.geoplay.shared.model.NavigationModel
import com.geoplay.shared.model.Operator
import com.geoplay.shared.model.Predicate
import com.geoplay.shared.model.RandomPool
import com.geoplay.shared.model.*
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive
import kotlin.math.abs
import kotlin.time.Clock

private val ENV = setOf(ConditionType.GEOFENCE, ConditionType.TIMER, ConditionType.PROXIMITY_MASTER, ConditionType.WINDOW)
private val ITEM_CONDITIONS = setOf(ConditionType.ITEM_REQUIRED, ConditionType.ITEM_USED)

// Port Kotlin du cœur TS prouvé (studio/src/game/evaluate.ts + runtime.ts).
// Sémantique opposable = specs 000/100 : latch, file FIFO à modale unique,
// pools persistés, CONDITIONAL ignoré gracieusement, HOLD kiosque.
// WINDOW est évalué (fenêtre relative, révocable même contre latch).

// Fenêtre WINDOW expirée (change game-temps-global-fenetres) : l'échéance
// fait retomber LOCKED même si latch (révocable, comme GEOFENCE).
private fun windowExpiree(n: GameNode, sim: Sim): Boolean =
    n.activation.requires.any { c ->
        c.type == ConditionType.WINDOW && c.avantSecondes != null && sim.nowMs >= c.avantSecondes * 1000L
    }

// Durée globale (change game-temps-global-fenetres) : mêmes formules que le
// Studio et la PWA (elapsed local, GAME_START = 0, reprise exacte).
fun dureeTotaleMs(game: Game): Long? =
    game.global.dureeTotale?.takeIf { it >= 0L }?.times(1000L)

fun partieTermineeParTemps(game: Game, nowMs: Long): Boolean {
    val d = dureeTotaleMs(game) ?: return false
    return nowMs >= d
}

fun estHorsDelai(game: Game, nowMs: Long): Boolean =
    partieTermineeParTemps(game, nowMs) && game.global.finDeTemps != "terminer"

data class DiscoveryState(val discovered: Set<String> = emptySet(), val items: Map<String, Int> = emptyMap(), val variables: Map<String, Any> = emptyMap())

data class InventoryState(val items: Map<String, Int> = emptyMap(), val variables: Map<String, Any> = emptyMap())

fun evaluateDiscovery(node: GameNode, discoveryState: DiscoveryState): Boolean {
    val d = node.discovery ?: return true
    return when (d.mode) {
        DiscoveryMode.VISIBLE_NOW -> true
        DiscoveryMode.ON_COMPLETED -> d.sourceNode != null && discoveryState.discovered.contains(d.sourceNode)
        DiscoveryMode.ON_CLUE -> d.clueId != null && discoveryState.discovered.contains(d.clueId)
        DiscoveryMode.ON_ITEM -> d.sourceNode != null && discoveryState.items.containsKey(d.sourceNode)
        DiscoveryMode.ON_PUZZLE -> d.sourceNode != null && discoveryState.discovered.contains(d.sourceNode)
        DiscoveryMode.ON_PROXIMITY -> d.sourceNode != null && discoveryState.discovered.contains(d.sourceNode)
        DiscoveryMode.ON_TIME -> true
        DiscoveryMode.MAP -> true
    }
}

fun applyEffects(node: GameNode, inventory: InventoryState): InventoryState {
    var state = inventory
    for (effect in node.effects) {
        when (effect.type) {
            "GIVE_ITEM" -> {
                val itemId = effect.itemId ?: continue
                val qty = effect.value?.let { it as? JsonPrimitive }?.content?.toInt() ?: 1
                state = state.copy(items = state.items + (itemId to (state.items[itemId] ?: 0) + qty))
            }
            "REMOVE_ITEM" -> {
                val itemId = effect.itemId ?: continue
                state = state.copy(items = state.items - itemId)
            }
            "MODIFY_VARIABLE" -> {
                val vid = effect.variableId ?: continue
                state = state.copy(variables = state.variables + (vid to (effect.value?.let { it as? JsonPrimitive }?.content?.toBoolean() ?: true)))
            }
            "REVEAL_NODE", "UNLOCK_NODE" -> { /* handled by discovery */ }
        }
    }
    return state
}

data class HoldState(val active: Boolean, val mode: HoldMode, val attempts: Int = 0, val journal: List<String> = emptyList())
data class SessionEvent(val type: String, val timestamp: Long, val sessionId: String)

data class Sim(
    val present: MutableSet<String> = mutableSetOf(),
    val dwellOk: MutableSet<String> = mutableSetOf(),
    val throughOk: MutableSet<String> = mutableSetOf(),
    var nowMs: Long = 0L,
    val completedAt: Map<String, Long> = emptyMap(),
    var accuracyM: Int = 5
)

data class EvalResult(
    val unlocked: List<String>,
    val auto: List<String>,
    val choice: List<String>,
    val queue: List<String> = unlocked
)

private fun hashSeed(s: String): Int {
    var h = 2166136261.toInt()
    for (c in s) {
        h = h xor c.code
        h = h * 16777619
    }
    return h
}

private fun rng(seed: Int): () -> Double {
    var s = seed
    return {
        s = (s + 0x6d2b79f5.toInt())
        var t = (s xor (s ushr 15)) * (1 or s)
        t = (t + ((t xor (t ushr 7)) * (61 or t))) xor t
        ((t xor (t ushr 14)) ushr 0).toUInt().toDouble() / 4294967296.0
    }
}

fun drawPool(pool: GameNode, seedStr: String, forced: List<String>? = null): List<String> {
    val rp = pool.randomPool ?: return emptyList()
    if (!forced.isNullOrEmpty()) return forced.take(rp.drawCount)
    val rand = rng(hashSeed(seedStr + pool.id))
    val bag = rp.candidates.toMutableList()
    val out = mutableListOf<String>()
    while (out.size < rp.drawCount && bag.isNotEmpty()) {
        out.add(bag.removeAt((rand() * bag.size).toInt().coerceIn(0, bag.size - 1)))
    }
    return out
}

private fun condTrue(
    nodeId: String,
    c: Condition,
    sim: Sim,
    draws: Map<String, List<String>>,
    completedAt: Map<String, Long>,
    inventory: InventoryState = InventoryState(),
    discoveryState: DiscoveryState = DiscoveryState()
): Boolean {
    return when (c.type) {
        ConditionType.GEOFENCE -> {
            val maxAcc = c.maxAccuracyM
            if (maxAcc != null && sim.accuracyM > maxAcc) return false
            val p = sim.present.contains(nodeId)
            when (c.predicate) {
                Predicate.EXIT -> !p
                Predicate.DWELL -> p && sim.dwellOk.contains(nodeId)
                Predicate.THROUGH -> sim.throughOk.contains(nodeId)
                else -> p
            }
        }
        ConditionType.PROXIMITY_MASTER -> {
            val p = sim.present.contains(nodeId)
            when (c.predicate) {
                Predicate.EXIT -> !p
                Predicate.DWELL -> p && sim.dwellOk.contains(nodeId)
                Predicate.THROUGH -> sim.throughOk.contains(nodeId)
                else -> p
            }
        }
        ConditionType.NODE_COMPLETED -> (completedAt[c.nodeId] ?: -1L) >= 0L
        ConditionType.TIMER -> {
            val anchor = if (c.anchor == Anchor.NODE_COMPLETION) {
                completedAt[c.anchorNodeId] ?: Long.MAX_VALUE
            } else {
                0L
            }
            if (anchor == Long.MAX_VALUE) return false
            sim.nowMs >= anchor + (c.delaySeconds ?: 0L) * 1000L
        }
        ConditionType.POOL_DRAWN -> !draws[c.poolNodeId].isNullOrEmpty()
        ConditionType.WINDOW -> {
            val apres = c.apresSecondes
            if (apres != null && sim.nowMs < apres * 1000L) return false
            val avant = c.avantSecondes
            if (avant != null && sim.nowMs >= avant * 1000L) return false
            true
        }
        ConditionType.ITEM_REQUIRED -> c.itemId?.let { inventory.items.containsKey(it) } ?: false
        ConditionType.ITEM_USED -> c.itemId?.let { inventory.items.containsKey(it) && c.consumed } ?: false
        ConditionType.CODE_INPUT -> c.code != null
        ConditionType.CLUE_RESOLVED -> c.clueId?.let { id -> discoveryState.discovered.contains(id) } ?: false
        else -> false
    }
}

private fun evalNode(
    n: GameNode,
    sim: Sim,
    draws: Map<String, List<String>>,
    completedAt: Map<String, Long>,
    inventory: InventoryState = InventoryState(),
    discoveryState: DiscoveryState = DiscoveryState()
): Boolean {
    val vals = n.activation.requires.map { condTrue(n.id, it, sim, draws, completedAt, inventory, discoveryState) }
    if (n.activation.requires.size > 1) {
        return if (n.activation.operator == Operator.OR) vals.any { it } else vals.all { it }
    }
    return vals.firstOrNull() ?: false
}

fun evaluate(
    game: Game,
    sim: Sim,
    draws: Map<String, List<String>>,
    completedAt: Map<String, Long>,
    completedCount: Map<String, Int>,
    prevUnlocked: Set<String>,
    inventory: InventoryState = InventoryState(),
    discoveryState: DiscoveryState = DiscoveryState()
): EvalResult {
    val unlocked = mutableListOf<String>()
    for (n in game.nodes) {
        if (n.randomPool != null) continue
        if ((completedCount[n.id] ?: 0) > 0) continue
        val discoveryOk = evaluateDiscovery(n, discoveryState)
        if (!discoveryOk) continue
        val ok = evalNode(n, sim, draws, completedAt, inventory, discoveryState)
        if (ok) {
            unlocked.add(n.id)
        } else if (prevUnlocked.contains(n.id) && n.activation.latch && !windowExpiree(n, sim)) {
            unlocked.add(n.id)
        }
    }
    fun hasEnv(id: String): Boolean {
        val node = game.nodes.find { it.id == id } ?: return false
        return node.activation.requires.any { ENV.contains(it.type) || ITEM_CONDITIONS.contains(it.type) }
    }
    val nextInventory = unlocked.fold(inventory) { acc, id ->
        val node = game.nodes.find { it.id == id } ?: return@fold acc
        applyEffects(node, acc)
    }
    return EvalResult(
        unlocked = unlocked,
        auto = unlocked.filter { hasEnv(it) },
        choice = unlocked.filter { !hasEnv(it) },
        queue = unlocked.toList()
    )
}

// File FIFO à modale unique (runtime.ts present) : ACTIVE latché, éviction au relock.
data class Presentation(val activeId: String?, val queue: List<String>)

fun present(unlocked: List<String>, prevQueue: List<String>, prevActive: String?): Presentation {
    val stillThere = unlocked.toSet()
    if (prevActive != null && stillThere.contains(prevActive)) {
        val queue = prevQueue.filter { stillThere.contains(it) && it != prevActive }.toMutableList()
        for (id in unlocked) if (id != prevActive && !queue.contains(id)) queue.add(id)
        return Presentation(prevActive, queue)
    }
    val queue = prevQueue.filter { stillThere.contains(it) }.toMutableList()
    for (id in unlocked) if (!queue.contains(id)) queue.add(id)
    val next = queue.firstOrNull()
    val rest = if (next != null) queue.drop(1) else emptyList()
    return Presentation(next, rest)
}

fun isPoolDue(pool: GameNode, timing: DrawTiming): Boolean =
    pool.randomPool?.drawTiming == timing

fun accuracyMessage(accuracyM: Int, maxAccuracyM: Int?): String? {
    if (maxAccuracyM == null || accuracyM <= maxAccuracyM) return null
    return "Précision insuffisante ($accuracyM m pour $maxAccuracyM m requis) : avance vers un ciel dégagé, l'étape reste en attente."
}

// --- HOLD kiosque meta-etat (Kotlin) ---
fun createHoldState(mode: HoldMode): HoldState {
    return HoldState(active = mode != HoldMode.NONE, mode = mode)
}

fun holdLock(mode: HoldMode, sessionId: String): SessionEvent {
    return SessionEvent(type = "holdLock", timestamp = Clock.System.now().toEpochMilliseconds(), sessionId = sessionId)
}

fun holdUnlock(mode: HoldMode, method: HoldExitMethod, sessionId: String): SessionEvent {
    return SessionEvent(type = "holdUnlock", timestamp = Clock.System.now().toEpochMilliseconds(), sessionId = sessionId)
}

fun holdExitAttempt(sessionId: String): SessionEvent {
    return SessionEvent(type = "holdExitAttempt", timestamp = Clock.System.now().toEpochMilliseconds(), sessionId = sessionId)
}

fun holdForceExit(sessionId: String): SessionEvent {
    return SessionEvent(type = "holdForceExit", timestamp = Clock.System.now().toEpochMilliseconds(), sessionId = sessionId)
}

fun holdNeedsUnlock(holdMode: HoldMode): Boolean = holdMode != HoldMode.NONE

/** Verifie si le mode HOLD est actif. */
fun isHoldBlocking(holdMode: HoldMode): Boolean = holdMode != HoldMode.NONE

/** Verifie la coherence holdMode/holdExit (couche applicative). */
fun validateHoldConfig(game: Game): List<String> {
    val errors = mutableListOf<String>()
    val holdMode = game.holdMode
    if (holdMode != HoldMode.NONE) {
        if (game.holdExit == null) {
            errors.add("holdExit requis quand holdMode=$holdMode")
        }
    }
    // Vérifie que les modules needsLock ne sont pas en mode none
    val needsLockNodes = game.nodes.filter { (it.module.data["needsLock"] as? Boolean) == true }
    if (holdMode == HoldMode.NONE && needsLockNodes.isNotEmpty()) {
        errors.add("Modules ${needsLockNodes.map { it.id }} nécessitent holdMode != none")
    }
    return errors
}

fun presentWithHold(
    unlocked: List<String>,
    prevQueue: List<String>,
    prevActive: String?,
    holdActive: Boolean,
    holdMode: HoldMode
): Presentation {
    if (holdActive && holdMode != HoldMode.NONE) {
        val queue = prevQueue.filter { unlocked.contains(it) && it != prevActive }.toMutableList()
        for (id in unlocked) if (id != prevActive && !queue.contains(id)) queue.add(id)
        return Presentation(prevActive, queue)
    }
    return present(unlocked, prevQueue, prevActive)
}

fun resolveExperienceStyle(game: Game): ExperienceStyle {
    val preset = game.experienceStyle?.preset ?: "BASIC"
    val defaults = defaultExperienceStyleForPreset(preset)
    val override = game.experienceStyle ?: ExperienceStyle()
    return ExperienceStyle(
        preset = preset,
        identity = override.identity ?: defaults.identity,
        visual = override.visual ?: defaults.visual,
        components = override.components.ifEmpty { defaults.components },
        media = override.media.ifEmpty { defaults.media },
        motion = override.motion.ifEmpty { defaults.motion },
        map = override.map.ifEmpty { defaults.map },
        voice = override.voice.ifEmpty { defaults.voice }
    )
}

fun defaultExperienceStyleForPreset(preset: String): ExperienceStyle {
    return when (preset) {
        "GUIDED" -> ExperienceStyle(
            preset = preset,
            visual = ExperienceStyleVisual(primaryColor = "#2196F3", secondaryColor = "#9C27B0", fontFamily = "system-ui")
        )
        "TREASURE_HUNT" -> ExperienceStyle(
            preset = preset,
            visual = ExperienceStyleVisual(primaryColor = "#4CAF50", secondaryColor = "#FF9800", fontFamily = "system-ui"),
            components = mapOf<String, JsonElement>("cluePanel" to JsonPrimitive("expanded"), "mapStyle" to JsonPrimitive("satellite"))
        )
        "ESCAPE_GAME" -> ExperienceStyle(
            preset = preset,
            visual = ExperienceStyleVisual(primaryColor = "#F44336", secondaryColor = "#2196F3", fontFamily = "monospace"),
            components = mapOf<String, JsonElement>("toolbox" to JsonPrimitive("expanded"), "cluePanel" to JsonPrimitive("always-visible"))
        )
        "OPEN_EXPLORATION" -> ExperienceStyle(
            preset = preset,
            visual = ExperienceStyleVisual(primaryColor = "#795548", secondaryColor = "#607D8B", fontFamily = "system-ui"),
            components = mapOf<String, JsonElement>("mapStyle" to JsonPrimitive("topographic"), "navigationBar" to JsonPrimitive("minimal"))
        )
        else -> ExperienceStyle(preset = "BASIC")
    }
}

fun getExperienceStyle(game: Game): ExperienceStyle {
    return game.experienceStyle ?: resolveExperienceStyle(game)
}

fun getNavigationModel(game: Game): NavigationModel {
    return game.global.navigationModel
}

fun isAutoActivated(game: Game, nodeId: String): Boolean {
    val node = game.nodes.find { it.id == nodeId } ?: return false
    val model = getNavigationModel(game)
    return when (model) {
        NavigationModel.GUIDED -> true
        NavigationModel.ESCAPE_GAME -> node.activation.requires.any { it.type == ConditionType.CODE_INPUT || it.type == ConditionType.CLUE_RESOLVED }
        NavigationModel.TREASURE_HUNT -> node.activation.requires.any { it.type == ConditionType.GEOFENCE || it.type == ConditionType.PROXIMITY_MASTER }
        NavigationModel.OPEN_EXPLORATION -> true
        NavigationModel.BASIC -> node.activation.requires.any { t -> t.type in ENV }
    }
}

fun selectPresentation(presentations: List<String>): String {
    return presentations.firstOrNull() ?: "MAP"
}

fun combinePresentations(presentations: List<String>): List<String> {
    return presentations.ifEmpty { listOf("MAP") }
}
