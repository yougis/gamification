package com.geoplay.player

import com.geoplay.shared.game.Sim
import com.geoplay.shared.game.drawPool
import com.geoplay.shared.game.evaluate
import com.geoplay.shared.game.present
import com.geoplay.shared.model.Game
import kotlinx.serialization.json.Json
import org.junit.Assert.*
import org.junit.Test

// Preuve 2.1 : partie reference-5poi tirage -> branche -> FIN (machine LOCKED->UNLOCKED->ACTIVE->COMPLETED).
class GameEngineTest {

    private val json = Json { ignoreUnknownKeys = true; coerceInputValues = true }

    private fun loadReference(): Game {
        val text = java.io.File("src/main/assets/reference-5poi.json").readText()
        return json.decodeFromString(Game.serializer(), text)
    }

    @Test
    fun reference5poi_poolBranchFin() {
        val game = loadReference()
        val pool = game.nodes.first { it.id == "pool" }
        assertEquals(5, pool.randomPool!!.candidates.size)
        assertEquals(1, pool.randomPool!!.drawCount)

        // Tirage sans remise : exactement 1 candidat.
        val drawn = drawPool(pool, "session-test")
        assertEquals(1, drawn.size)
        assertTrue(pool.randomPool!!.candidates.contains(drawn.first()))

        // Force chaque branche tour a tour : la branche tiree + geofence simulee debloque le noeud.
        for (candidate in pool.randomPool!!.candidates) {
            val draws = mapOf("pool" to listOf(candidate))
            val done = mapOf("start" to 0L, "pool" to 0L)
            val sim = Sim(
                present = mutableSetOf(candidate),
                dwellOk = mutableSetOf(candidate),
                throughOk = mutableSetOf(),
                nowMs = 60_000L,
                accuracyM = 5
            )
            val ev = evaluate(game, sim, draws, done, emptyMap(), emptySet())
            assertTrue("branche $candidate debloquee", ev.unlocked.contains(candidate))
        }

        // FIN en OR : un seul candidat COMPLETED suffit.
        val draws = mapOf("pool" to listOf(drawn.first()))
        val done = mapOf("start" to 0L, drawn.first() to 1L)
        val sim = Sim(nowMs = 120_000L)
        val ev = evaluate(game, sim, draws, done, mapOf(drawn.first() to 1), emptySet())
        assertTrue("FIN debloquee en OR", ev.unlocked.contains("fin"))
    }

    @Test
    fun fifoSingleModal_latchEviction() {
        // File FIFO a modale unique : 2e geofence attend, sortie de file si relock.
        val first = present(listOf("a", "b"), emptyList(), null)
        assertEquals("a", first.activeId)
        assertEquals(listOf("b"), first.queue)
        // Relock de b : eviction de la file, a reste ACTIVE (latche).
        val second = present(listOf("a"), first.queue, first.activeId)
        assertEquals("a", second.activeId)
        assertTrue(second.queue.isEmpty())
    }

    @Test
    fun poolDraw_isDeterministicPerSession() {
        // Reprendre = meme sessionId relit : meme seed -> meme tirage (pas de re-tirage).
        val game = loadReference()
        val pool = game.nodes.first { it.id == "pool" }
        assertEquals(drawPool(pool, "s1"), drawPool(pool, "s1"))
    }
}
