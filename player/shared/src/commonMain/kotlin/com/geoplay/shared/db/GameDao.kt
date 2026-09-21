package com.geoplay.shared.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Update
import com.geoplay.shared.model.GameProgressEntity
import com.geoplay.shared.model.HoldJournalEntity
import com.geoplay.shared.model.InventoryEntity
import com.geoplay.shared.model.NodeCompletionEntity
import com.geoplay.shared.model.RandomDrawEntity
import com.geoplay.shared.model.ScoreEntity
import com.geoplay.shared.model.SessionEntity

@Dao
interface GameDao {

    // GameProgress
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProgress(progress: GameProgressEntity)

    @Query("SELECT * FROM game_progress WHERE sessionId = :sessionId")
    suspend fun getProgress(sessionId: String): GameProgressEntity?

    @Query("DELETE FROM game_progress WHERE sessionId = :sessionId")
    suspend fun deleteProgress(sessionId: String)

    @Transaction
    suspend fun upsertProgress(progress: GameProgressEntity) {
        insertProgress(progress)
    }

    // NodeCompletion
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertNodeCompletion(completion: NodeCompletionEntity): Long

    @Query("SELECT * FROM node_completion WHERE sessionId = :sessionId AND nodeId = :nodeId")
    suspend fun getNodeCompletion(sessionId: String, nodeId: String): NodeCompletionEntity?

    @Query("SELECT * FROM node_completion WHERE sessionId = :sessionId")
    suspend fun getAllCompletionsForSession(sessionId: String): List<NodeCompletionEntity>

    @Query("SELECT COUNT(*) FROM node_completion WHERE sessionId = :sessionId AND nodeId = :nodeId AND isReplay = 0")
    suspend fun getCompletionCount(sessionId: String, nodeId: String): Int

    @Query("SELECT COUNT(*) FROM node_completion WHERE sessionId = :sessionId AND nodeId = :nodeId AND isReplay = 1")
    suspend fun getReplayCount(sessionId: String, nodeId: String): Int

    @Query("SELECT MAX(completedAt) FROM node_completion WHERE sessionId = :sessionId AND nodeId = :nodeId")
    suspend fun getLastCompletionAt(sessionId: String, nodeId: String): Long?

    @Transaction
    suspend fun insertNodeCompletionWithTransaction(completion: NodeCompletionEntity) {
        insertNodeCompletion(completion)
    }

    // RandomDraws
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRandomDraw(draw: RandomDrawEntity): Long

    @Query("SELECT * FROM random_draws WHERE sessionId = :sessionId AND poolNodeId = :poolNodeId")
    suspend fun getRandomDraw(sessionId: String, poolNodeId: String): RandomDrawEntity?

    @Query("SELECT * FROM random_draws WHERE sessionId = :sessionId")
    suspend fun getAllRandomDrawsForSession(sessionId: String): List<RandomDrawEntity>

    @Query("DELETE FROM random_draws WHERE sessionId = :sessionId AND poolNodeId = :poolNodeId")
    suspend fun deleteRandomDraw(sessionId: String, poolNodeId: String)

    @Transaction
    suspend fun insertRandomDrawWithTransaction(draw: RandomDrawEntity) {
        insertRandomDraw(draw)
    }

    // Scores
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertScore(score: ScoreEntity): Long

    @Query("SELECT * FROM scores WHERE sessionId = :sessionId")
    suspend fun getScoresForSession(sessionId: String): List<ScoreEntity>

    @Query("SELECT SUM(score) FROM scores WHERE sessionId = :sessionId AND isCheat = 0")
    suspend fun getTotalScore(sessionId: String): Int?

    @Query("SELECT * FROM scores WHERE sessionId = :sessionId AND nodeId = :nodeId ORDER BY completedAt DESC LIMIT 1")
    suspend fun getLastScoreForNode(sessionId: String, nodeId: String): ScoreEntity?

    // Hold journal
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertHoldJournal(event: HoldJournalEntity)

    @Query("SELECT * FROM hold_journal WHERE sessionId = :sessionId ORDER BY timestamp ASC")
    suspend fun getHoldJournal(sessionId: String): List<HoldJournalEntity>

    @Query("DELETE FROM hold_journal WHERE sessionId = :sessionId")
    suspend fun deleteHoldJournal(sessionId: String)

    // Sessions
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSession(session: SessionEntity)

    @Query("SELECT * FROM sessions WHERE sessionId = :sessionId")
    suspend fun getSession(sessionId: String): SessionEntity?

    @Query("SELECT * FROM sessions WHERE gameId = :gameId ORDER BY startedAt DESC")
    suspend fun getSessionsForGame(gameId: String): List<SessionEntity>

    @Query("UPDATE sessions SET completedAt = :completedAt WHERE sessionId = :sessionId")
    suspend fun completeSession(sessionId: String, completedAt: Long)

    @Transaction
    suspend fun insertSessionWithTransaction(session: SessionEntity) {
        insertSession(session)
    }

    @Transaction
    suspend fun insertHoldJournalWithTransaction(event: HoldJournalEntity) {
        insertHoldJournal(event)
    }

    // Inventory
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertInventory(entry: InventoryEntity): Long

    @Query("SELECT * FROM inventory WHERE sessionId = :sessionId")
    suspend fun getInventory(sessionId: String): List<InventoryEntity>

    @Query("SELECT * FROM inventory WHERE sessionId = :sessionId AND itemId = :itemId")
    suspend fun getInventoryItem(sessionId: String, itemId: String): InventoryEntity?

    @Query("SELECT COUNT(*) FROM inventory WHERE sessionId = :sessionId AND itemId = :itemId")
    suspend fun getInventoryCount(sessionId: String, itemId: String): Int

    @Query("DELETE FROM inventory WHERE sessionId = :sessionId AND itemId = :itemId")
    suspend fun removeInventoryItem(sessionId: String, itemId: String)

    @Query("DELETE FROM inventory WHERE sessionId = :sessionId")
    suspend fun clearInventory(sessionId: String)

    @Transaction
    suspend fun insertInventoryWithTransaction(entry: InventoryEntity) {
        insertInventory(entry)
    }
}
