package com.geoplay.shared.game

import com.geoplay.shared.model.Activation
import com.geoplay.shared.model.Anchor
import com.geoplay.shared.model.Condition
import com.geoplay.shared.model.ConditionType
import com.geoplay.shared.model.Game
import com.geoplay.shared.model.GameNode
import com.geoplay.shared.model.ModuleData
import com.geoplay.shared.model.Operator
import com.geoplay.shared.model.Predicate
import com.geoplay.shared.model.RandomPool
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

private fun node(
    id: String,
    requires: List<Condition> = emptyList(),
    operator: Operator? = null,
    latch: Boolean = true,
    randomPool: RandomPool? = null,
): GameNode = GameNode(
    id = id,
    module = ModuleData(type = "INFO"),
    activation = Activation(requires = requires, operator = operator, latch = latch),
    randomPool = randomPool,
)

private fun nodeCompleted(nodeId: String) = Condition(type = ConditionType.NODE_COMPLETED, nodeId = nodeId)

class GameEngineCommonTest {

    @Test
    fun nodeCompletedUnlocksDependent() {
        val game = Game(
            gameId = "test",
            nodes = listOf(
                node("a"),
                node("b", requires = listOf(nodeCompleted("a"))),
            ),
        )
        val sim = Sim()
        // Rien complété : b reste verrouillé.
        val before = evaluate(game, sim, emptyMap(), emptyMap(), emptyMap(), emptySet())
        assertTrue(before.unlocked.isEmpty())
        // a complété : b se déverrouille.
        val after = evaluate(game, sim, emptyMap(), mapOf("a" to 1L), emptyMap(), emptySet())
        assertEquals(listOf("b"), after.unlocked)
    }

    @Test
    fun latchKeepsEligibility() {
        val game = Game(
            gameId = "test",
            nodes = listOf(node("b", requires = listOf(nodeCompleted("a")), latch = true)),
        )
        val sim = Sim()
        val unlocked = evaluate(game, sim, emptyMap(), mapOf("a" to 1L), emptyMap(), emptySet())
        assertEquals(listOf("b"), unlocked.unlocked)
        // La condition retombe mais le latch conserve l'éligibilité.
        val latched = evaluate(game, sim, emptyMap(), emptyMap(), emptyMap(), setOf("b"))
        assertEquals(listOf("b"), latched.unlocked)
    }

    @Test
    fun poolDrawIsDeterministic() {
        val pool = node(
            "pool",
            randomPool = RandomPool(candidates = listOf("a", "b", "c", "d", "e"), drawCount = 1),
        )
        val first = drawPool(pool, "session-1")
        val second = drawPool(pool, "session-1")
        assertEquals(1, first.size)
        assertEquals(first, second)
    }

    @Test
    fun presentKeepsSingleModalFifo() {        val first = present(listOf("a", "b"), emptyList(), null)
        assertEquals("a", first.activeId)
        assertEquals(listOf("b"), first.queue)
        // La modale reste latchée tant que a est éligible.
        val second = present(listOf("a", "c"), first.queue, first.activeId)
        assertEquals("a", second.activeId)
        assertTrue(second.queue.contains("c"))
    }

    @Test
    fun geofencePresentUnlocks() {
        val geo = Condition(type = ConditionType.GEOFENCE, lat = 48.01, lng = 2.01, radiusMeters = 30, predicate = Predicate.ENTER)
        val game = Game(gameId = "test", nodes = listOf(node("poi", requires = listOf(geo))))
        val absent = evaluate(game, Sim(), emptyMap(), emptyMap(), emptyMap(), emptySet())
        assertTrue(absent.unlocked.isEmpty())
        val sim = Sim(present = mutableSetOf("poi"))
        val present = evaluate(game, sim, emptyMap(), emptyMap(), emptyMap(), emptySet())
        assertEquals(listOf("poi"), present.unlocked)
    }

    @Test
    fun timerDelayRespected() {
        val timer = Condition(type = ConditionType.TIMER, anchor = Anchor.GAME_START, delaySeconds = 60L)
        val game = Game(gameId = "test", nodes = listOf(node("t", requires = listOf(timer))))
        val early = evaluate(game, Sim(nowMs = 0L), emptyMap(), emptyMap(), emptyMap(), emptySet())
        assertTrue(early.unlocked.isEmpty())
        val due = evaluate(game, Sim(nowMs = 60_000L), emptyMap(), emptyMap(), emptyMap(), emptySet())
        assertEquals(listOf("t"), due.unlocked)
    }

    @Test
    fun poolDrawnUnlocks() {
        val drawn = Condition(type = ConditionType.POOL_DRAWN, poolNodeId = "pool")
        val game = Game(gameId = "test", nodes = listOf(node("c", requires = listOf(drawn))))
        val none = evaluate(game, Sim(), emptyMap(), emptyMap(), emptyMap(), emptySet())
        assertTrue(none.unlocked.isEmpty())
        val drawnState = evaluate(game, Sim(), mapOf("pool" to listOf("c")), emptyMap(), emptyMap(), emptySet())
        assertEquals(listOf("c"), drawnState.unlocked)
    }
}
