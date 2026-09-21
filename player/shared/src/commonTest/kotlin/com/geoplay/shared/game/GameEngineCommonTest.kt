package com.geoplay.shared.game

import com.geoplay.shared.model.Activation
import com.geoplay.shared.model.Condition
import com.geoplay.shared.model.ConditionType
import com.geoplay.shared.model.Game
import com.geoplay.shared.model.GameNode
import com.geoplay.shared.model.ModuleData
import com.geoplay.shared.model.Operator
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
    fun presentKeepsSingleModalFifo() {
        val first = present(listOf("a", "b"), emptyList(), null)
        assertEquals("a", first.activeId)
        assertEquals(listOf("b"), first.queue)
        // La modale reste latchée tant que a est éligible.
        val second = present(listOf("a", "c"), first.queue, first.activeId)
        assertEquals("a", second.activeId)
        assertTrue(second.queue.contains("c"))
    }
}
