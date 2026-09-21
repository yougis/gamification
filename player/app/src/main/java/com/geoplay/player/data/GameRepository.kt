package com.geoplay.player.data

import android.content.Context
import androidx.room.Room
import com.geoplay.shared.db.GameDao
import com.geoplay.shared.db.GeoPlayDatabase
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import com.geoplay.shared.model.GameProgressEntity
import com.geoplay.shared.model.InventoryEntity
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
        withContext(Dispatchers.IO) { dao.insertInventoryWithTransaction(entry) }
    }

    suspend fun removeItem(sessionId: String, itemId: String) {
        withContext(Dispatchers.IO) { dao.removeInventoryItem(sessionId, itemId) }
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
}
