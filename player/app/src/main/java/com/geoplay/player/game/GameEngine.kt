package com.geoplay.player.game

import com.geoplay.player.model.ConditionType
import com.geoplay.player.model.DrawTiming
import com.geoplay.player.model.Game
import com.geoplay.player.model.GameNode
import com.geoplay.player.model.HoldExit
import com.geoplay.player.model.HoldMode
import com.geoplay.player.model.ModuleData
import com.geoplay.player.model.Operator
import com.geoplay.player.model.Predicate
import com.geoplay.player.model.RandomPool
import com.geoplay.player.model.*
import kotlin.math.abs

// Port Kotlin du cœur TS prouvé (studio/src/game/evaluate.ts + runtime.ts).
// Sémantique opposable = specs 000/100 : latch, file FIFO à modale unique,
// pools persistés, WINDOW/CONDITIONAL ignorés gracieusement, HOLD kiosque.

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

private val ENV = setOf(ConditionType.GEOFENCE, ConditionType.TIMER, ConditionType.PROXIMITY_MASTER)

private fun condTrue(
    nodeId: String,
    c: com.geoplay.player.model.Condition,
    sim: Sim,
    draws: Map<String, List<String>>,
    completedAt: Map<String, Long>
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
            val anchor = if (c.anchor == com.geoplay.player.model.Anchor.NODE_COMPLETION) {
                completedAt[c.anchorNodeId] ?: Long.MAX_VALUE
            } else {
                0L
            }
            if (anchor == Long.MAX_VALUE) return false
            sim.nowMs >= anchor + (c.delaySeconds ?: 0L) * 1000L
        }
        ConditionType.POOL_DRAWN -> !draws[c.poolNodeId].isNullOrEmpty()
        else -> false
    }
}

private fun evalNode(
    n: GameNode,
    sim: Sim,
    draws: Map<String, List<String>>,
    completedAt: Map<String, Long>
): Boolean {
    val vals = n.activation.requires.map { condTrue(n.id, it, sim, draws, completedAt) }
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
    prevUnlocked: Set<String>
): EvalResult {
    val unlocked = mutableListOf<String>()
    for (n in game.nodes) {
        if (n.randomPool != null) continue
        if ((completedCount[n.id] ?: 0) > 0) continue
        val ok = evalNode(n, sim, draws, completedAt)
        if (ok) {
            unlocked.add(n.id)
        } else if (prevUnlocked.contains(n.id) && n.activation.latch) {
            unlocked.add(n.id)
        }
    }
    fun hasEnv(id: String): Boolean {
        val node = game.nodes.find { it.id == id } ?: return false
        return node.activation.requires.any { ENV.contains(it.type) }
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
    return SessionEvent(type = "holdLock", timestamp = System.currentTimeMillis(), sessionId = sessionId)
}

fun holdUnlock(mode: HoldMode, method: HoldExitMethod, sessionId: String): SessionEvent {
    return SessionEvent(type = "holdUnlock", timestamp = System.currentTimeMillis(), sessionId = sessionId)
}

fun holdExitAttempt(sessionId: String): SessionEvent {
    return SessionEvent(type = "holdExitAttempt", timestamp = System.currentTimeMillis(), sessionId = sessionId)
}

fun holdForceExit(sessionId: String): SessionEvent {
    return SessionEvent(type = "holdForceExit", timestamp = System.currentTimeMillis(), sessionId = sessionId)
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
        } else if (game.holdExit.method == null) {
            errors.add("holdExit.method requis")
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
    // Si HOLD actif, l'application est verrouillée : aucune nouvelle modale.
    if (holdActive && holdMode != HoldMode.NONE) {
        val queue = prevQueue.filter { stillThere.contains(it) && it != prevActive }.toMutableList()
        for (id in unlocked) if (id != prevActive && !queue.contains(id)) queue.add(id)
        return Presentation(prevActive, queue)
    }
    return present(unlocked, prevQueue, prevActive)
}
