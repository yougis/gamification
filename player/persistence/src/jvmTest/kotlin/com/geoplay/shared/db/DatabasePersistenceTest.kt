package com.geoplay.shared.db

import androidx.room.Room
import androidx.sqlite.driver.bundled.BundledSQLiteDriver
import com.geoplay.shared.model.GameProgressEntity
import com.geoplay.shared.model.HoldJournalEntity
import com.geoplay.shared.model.InventoryEntity
import com.geoplay.shared.model.InventoryEventEntity
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

    @Test
    fun inventoryEventsJournalRoundTrip() = runTest {
        val db = openDb()
        try {
            // Écriture immédiate des 6 types, relecture par sessionId
            // (chemin de reprise après kill : même sessionId relit tout).
            val writer = db.gameDao()
            writer.insertInventoryEventWithTransaction(InventoryEventEntity(sessionId = "s1", eventType = "INVENTORY_OPENED"))
            writer.insertInventoryEventWithTransaction(InventoryEventEntity(sessionId = "s1", eventType = "ITEM_SELECTED", itemId = "loupe"))
            writer.insertInventoryEventWithTransaction(InventoryEventEntity(sessionId = "s1", eventType = "ITEM_USED", itemId = "cle", isCheat = true))
            writer.insertInventoryEventWithTransaction(InventoryEventEntity(sessionId = "s1", eventType = "ITEM_COMBINED"))
            writer.insertInventoryEventWithTransaction(InventoryEventEntity(sessionId = "s1", eventType = "ITEM_GIVEN", itemId = "poudre"))
            writer.insertInventoryEventWithTransaction(InventoryEventEntity(sessionId = "s1", eventType = "ITEM_REMOVED", itemId = "poudre"))

            // Relecture via une autre référence DAO (comme à la reprise).
            val reader = db.gameDao()
            val events = reader.getInventoryEvents("s1")
            assertEquals(6, events.size)
            assertEquals(
                listOf("INVENTORY_OPENED", "ITEM_SELECTED", "ITEM_USED", "ITEM_COMBINED", "ITEM_GIVEN", "ITEM_REMOVED"),
                events.map { it.eventType }
            )
            assertEquals("loupe", events[1].itemId)
            assertTrue(events[2].isCheat)
            assertEquals("s1", events.first().sessionId)
            // Isolation par session.
            assertTrue(reader.getInventoryEvents("s2").isEmpty())
        } finally {
            db.close()
        }
    }

    @Test
    fun craftOutcomePersistsBySession() = runTest {
        val db = openDb()
        try {
            // Séquence d'écriture d'un craft confirmé (miroir
            // GameRepository.craft) : REMOVE consommées + GIVE sortie +
            // journal ITEM_COMBINED, puis relecture par sessionId (reprise).
            val dao = db.gameDao()
            dao.insertInventoryWithTransaction(InventoryEntity(sessionId = "s1", itemId = "poudre"))
            dao.insertInventoryWithTransaction(InventoryEntity(sessionId = "s1", itemId = "lettre"))
            dao.removeInventoryItem("s1", "poudre")
            dao.removeInventoryItem("s1", "lettre")
            dao.insertInventoryWithTransaction(InventoryEntity(sessionId = "s1", itemId = "message"))
            dao.insertInventoryEventWithTransaction(InventoryEventEntity(sessionId = "s1", eventType = "ITEM_COMBINED", itemId = "message"))

            val reader = db.gameDao()
            assertEquals(listOf("message"), reader.getInventory("s1").map { it.itemId })
            val events = reader.getInventoryEvents("s1")
            assertEquals(1, events.size)
            assertEquals("ITEM_COMBINED", events.first().eventType)
            assertEquals("message", events.first().itemId)
        } finally {
            db.close()
        }
    }
}
