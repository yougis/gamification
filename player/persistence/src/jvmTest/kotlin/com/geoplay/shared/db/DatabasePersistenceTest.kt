package com.geoplay.shared.db

import androidx.room.Room
import androidx.sqlite.driver.bundled.BundledSQLiteDriver
import com.geoplay.shared.model.GameProgressEntity
import com.geoplay.shared.model.HoldJournalEntity
import com.geoplay.shared.model.InventoryEntity
import com.geoplay.shared.model.NodeCompletionEntity
import com.geoplay.shared.model.RandomDrawEntity
import com.geoplay.shared.model.ScoreEntity
import com.geoplay.shared.model.SessionEntity
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

/**
 * Preuve runtime du schéma partagé (sessions, tirages, événements, inventaire).
 * Tourne sur JVM avec le driver SQLite bundlé, en base mémoire.
 */
class DatabasePersistenceTest {

    private fun openDb(): GeoPlayDatabase =
        Room.inMemoryDatabaseBuilder<GeoPlayDatabase>()
            .setDriver(BundledSQLiteDriver())
            .build()

    @Test
    fun sessionAndInventoryRoundTrip() = runTest {
        val db = openDb()
        try {
            db.gameDao().insertSessionWithTransaction(SessionEntity("s1", "g1"))
            assertEquals("g1", db.gameDao().getSession("s1")?.gameId)

            db.gameDao().insertInventoryWithTransaction(InventoryEntity(sessionId = "s1", itemId = "cle"))
            db.gameDao().insertInventoryWithTransaction(InventoryEntity(sessionId = "s1", itemId = "lampe"))
            assertEquals(2, db.gameDao().getInventory("s1").size)
            assertNotNull(db.gameDao().getInventoryItem("s1", "cle"))

            db.gameDao().removeInventoryItem("s1", "cle")
            assertNull(db.gameDao().getInventoryItem("s1", "cle"))
            assertEquals(1, db.gameDao().getInventory("s1").size)
        } finally {
            db.close()
        }
    }

    @Test
    fun drawsCompletionsScoresAndProgressRoundTrip() = runTest {
        val db = openDb()
        try {
            // Tirage persisté (jamais recalculé).
            db.gameDao().insertRandomDrawWithTransaction(
                RandomDrawEntity(sessionId = "s1", poolNodeId = "pool", drawnNodeId = "b")
            )
            assertEquals("b", db.gameDao().getRandomDraw("s1", "pool")?.drawnNodeId)

            // Complétion + score avec flag triche.
            db.gameDao().insertNodeCompletionWithTransaction(
                NodeCompletionEntity(sessionId = "s1", nodeId = "a", completedAt = 1000L, score = 10)
            )
            assertEquals(1, db.gameDao().getCompletionCount("s1", "a"))
            db.gameDao().insertScore(
                ScoreEntity(sessionId = "s1", nodeId = "a", score = 10, isCheat = true)
            )
            // Seul le score non-triche compte.
            assertEquals(null, db.gameDao().getTotalScore("s1"))

            // Progression + journal HOLD.
            db.gameDao().upsertProgress(GameProgressEntity(sessionId = "s1", gameId = "g1"))
            assertEquals("g1", db.gameDao().getProgress("s1")?.gameId)
            db.gameDao().insertHoldJournalWithTransaction(
                HoldJournalEntity(sessionId = "s1", eventType = "holdLock", success = true)
            )
            assertEquals(1, db.gameDao().getHoldJournal("s1").size)
            assertTrue(db.gameDao().getHoldJournal("s1").first().success)
        } finally {
            db.close()
        }
    }
}
