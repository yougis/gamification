package com.geoplay.player.data

import android.content.Context
import androidx.room.Room
import com.geoplay.shared.db.GameDao
import com.geoplay.shared.db.GeoPlayDatabase
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import com.geoplay.shared.model.GameProgressEntity
import com.geoplay.shared.model.InventoryEntity
import com.geoplay.shared.model.InventoryEventEntity
import com.geoplay.shared.model.NodeCompletionEntity
import com.geoplay.shared.model.RandomDrawEntity
import com.geoplay.shared.model.ScoreEntity
import com.geoplay.shared.model.SessionEntity

class GameRepository(
    private val dao: GameDao,
    private val context: Context
) {
    companion object {
        @Volatile
        private var INSTANCE: GameRepository? = null

        fun getInstance(context: Context): GameRepository {
            return INSTANCE ?: synchronized(this) {
                val db = Room.databaseBuilder(
                    context.applicationContext,
                    GeoPlayDatabase::class.java,
                    "geoplay.db"
                ).fallbackToDestructiveMigration().build()
                val instance = GameRepository(
                    db.gameDao(),
                    context.applicationContext
                )
                INSTANCE = instance
                instance
            }
        }
    }

    suspend fun createSession(gameId: String, sessionId: String): SessionEntity {
        val session = SessionEntity(
            sessionId = sessionId,
            gameId = gameId,
            startedAt = System.currentTimeMillis()
        )
        dao.insertSessionWithTransaction(session)
        return session
    }

    suspend fun getSession(sessionId: String): SessionEntity? = dao.getSession(sessionId)

    suspend fun completeSession(sessionId: String) {
        dao.completeSession(sessionId, System.currentTimeMillis())
    }

    suspend fun getProgress(sessionId: String) = dao.getProgress(sessionId)

    suspend fun saveProgress(progress: GameProgressEntity) {
        dao.upsertProgress(progress)
    }

    suspend fun getNodeCompletion(sessionId: String, nodeId: String): NodeCompletionEntity? =
        dao.getNodeCompletion(sessionId, nodeId)

    suspend fun getCompletions(sessionId: String): List<NodeCompletionEntity> =
        dao.getAllCompletionsForSession(sessionId)

    suspend fun completeNode(
        sessionId: String,
        nodeId: String,
        score: Int = 0,
        isReplay: Boolean = false,
        isCheat: Boolean = false
    ): Long {
        val completion = NodeCompletionEntity(
            sessionId = sessionId,
            nodeId = nodeId,
            completedAt = System.currentTimeMillis(),
            score = score,
            isReplay = isReplay,
            isCheat = isCheat
        )
        return withContext(Dispatchers.IO) {
            dao.insertNodeCompletion(completion)
        }
    }

    suspend fun getCompletionCount(sessionId: String, nodeId: String): Int =
        dao.getCompletionCount(sessionId, nodeId)

    suspend fun getReplayCount(sessionId: String, nodeId: String): Int =
        dao.getReplayCount(sessionId, nodeId)

    suspend fun getRandomDraw(sessionId: String, poolNodeId: String): RandomDrawEntity? =
        dao.getRandomDraw(sessionId, poolNodeId)

    suspend fun saveRandomDraw(draw: RandomDrawEntity) {
        dao.insertRandomDrawWithTransaction(draw)
    }

    suspend fun getRandomDrawsForSession(sessionId: String): List<RandomDrawEntity> =
        dao.getAllRandomDrawsForSession(sessionId)

    suspend fun recordScore(sessionId: String, nodeId: String, score: Int, isCheat: Boolean) {
        val scoreEntity = ScoreEntity(
            sessionId = sessionId,
            nodeId = nodeId,
            score = score,
            isCheat = isCheat,
            completedAt = System.currentTimeMillis()
        )
        dao.insertScore(scoreEntity)
    }

    suspend fun getScores(sessionId: String): List<ScoreEntity> = dao.getScoresForSession(sessionId)

    suspend fun getTotalScore(sessionId: String): Int = dao.getTotalScore(sessionId) ?: 0

    suspend fun getLastScoreForNode(sessionId: String, nodeId: String): ScoreEntity? =
        dao.getLastScoreForNode(sessionId, nodeId)

    suspend fun getSessionsForGame(gameId: String): List<SessionEntity> =
        dao.getSessionsForGame(gameId)

    // Inventory
    suspend fun addItem(sessionId: String, itemId: String, quantity: Int = 1, isCheat: Boolean = false) {
        val entry = InventoryEntity(
            sessionId = sessionId,
            itemId = itemId,
            quantity = quantity,
            isCheat = isCheat
        )
        withContext(Dispatchers.IO) {
            dao.insertInventoryWithTransaction(entry)
            // Le journal EST le bus (change inventory-events-hints) : l'effet
            // GIVE_ITEM émet ITEM_GIVEN dans le même flux d'écriture.
            dao.insertInventoryEventWithTransaction(
                InventoryEventEntity(sessionId = sessionId, eventType = "ITEM_GIVEN", itemId = itemId, isCheat = isCheat)
            )
        }
    }

    suspend fun removeItem(sessionId: String, itemId: String, isCheat: Boolean = false) {
        withContext(Dispatchers.IO) {
            dao.removeInventoryItem(sessionId, itemId)
            dao.insertInventoryEventWithTransaction(
                InventoryEventEntity(sessionId = sessionId, eventType = "ITEM_REMOVED", itemId = itemId, isCheat = isCheat)
            )
        }
    }

    suspend fun getInventory(sessionId: String): List<InventoryEntity> =
        withContext(Dispatchers.IO) { dao.getInventory(sessionId) }

    suspend fun hasItem(sessionId: String, itemId: String): Boolean =
        dao.getInventoryCount(sessionId, itemId) > 0

    suspend fun getInventoryCount(sessionId: String, itemId: String): Int =
        dao.getInventoryCount(sessionId, itemId)

    suspend fun clearInventory(sessionId: String) {
        withContext(Dispatchers.IO) { dao.clearInventory(sessionId) }
    }

    // Journal d'événements d'inventaire (change inventory-events-hints) :
    // écriture immédiate, relecture par sessionId (reprise après kill).
    suspend fun logInventoryEvent(sessionId: String, eventType: String, itemId: String? = null, isCheat: Boolean = false) {
        withContext(Dispatchers.IO) {
            dao.insertInventoryEventWithTransaction(
                InventoryEventEntity(sessionId = sessionId, eventType = eventType, itemId = itemId, isCheat = isCheat)
            )
        }
    }

    suspend fun getInventoryEvents(sessionId: String): List<InventoryEventEntity> =
        withContext(Dispatchers.IO) { dao.getInventoryEvents(sessionId) }

    // Combinaison d'atelier (change inventory-crafting) : la confirmation
    // du joueur appelle explicitement cette méthode après
    // `availableRecipes` (proposition). Tout-ou-rien : entrées incomplètes
    // → false, ZÉRO écriture ; sinon REMOVE des consommées + GIVE de la
    // sortie + journal ITEM_COMBINED dans le même flux d'écriture.
    suspend fun craft(sessionId: String, recipe: com.geoplay.shared.model.Recipe): Boolean {
        val owned = withContext(Dispatchers.IO) {
            dao.getInventory(sessionId).associate { it.itemId to it.quantity }
        }
        val decided = com.geoplay.shared.game.applyRecipe(
            recipe,
            com.geoplay.shared.game.InventoryState(items = owned)
        ) ?: return false
        withContext(Dispatchers.IO) {
            // L'état décidé par le moteur pur fait foi : une ligne par
            // objet avec sa quantité exacte (réconciliation totale).
            for (itemId in owned.keys + decided.items.keys) {
                dao.removeInventoryItem(sessionId, itemId)
                val qty = decided.items[itemId] ?: 0
                if (qty > 0) {
                    dao.insertInventoryWithTransaction(
                        com.geoplay.shared.model.InventoryEntity(sessionId = sessionId, itemId = itemId, quantity = qty)
                    )
                }
            }
            dao.insertInventoryEventWithTransaction(
                InventoryEventEntity(sessionId = sessionId, eventType = "ITEM_COMBINED", itemId = recipe.output)
            )
        }
        return true
    }
}
