package com.geoplay.shared.model

import androidx.room.Entity
import androidx.room.PrimaryKey
import kotlin.time.Clock
import kotlinx.serialization.Serializable

// Room entities — tous les champs sont primitifs/String : aucun converter custom requis.
@Entity(tableName = "game_progress")
data class GameProgressEntity(
    @PrimaryKey val sessionId: String,
    val gameId: String,
    val currentNodeId: String? = null,
    val completedNodes: String = "[]",
    val draws: String = "{}",
    val completedCounts: String = "{}",
    val replays: String = "{}",
    val createdAt: Long = Clock.System.now().toEpochMilliseconds(),
    val updatedAt: Long = Clock.System.now().toEpochMilliseconds()
)

@Entity(tableName = "node_completion")
data class NodeCompletionEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val sessionId: String,
    val nodeId: String,
    val completedAt: Long,
    val score: Int = 0,
    val isReplay: Boolean = false,
    val isCheat: Boolean = false
)

@Entity(tableName = "random_draws")
data class RandomDrawEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val sessionId: String,
    val poolNodeId: String,
    val drawnNodeId: String,
    val drawnAt: Long = Clock.System.now().toEpochMilliseconds(),
    val isForced: Boolean = false
)

@Entity(tableName = "scores")
data class ScoreEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val sessionId: String,
    val nodeId: String,
    val score: Int,
    val isCheat: Boolean = false,
    val completedAt: Long = Clock.System.now().toEpochMilliseconds()
)

@Entity(tableName = "sessions")
data class SessionEntity(
    @PrimaryKey val sessionId: String,
    val gameId: String,
    val startedAt: Long = Clock.System.now().toEpochMilliseconds(),
    val completedAt: Long? = null,
    val isCheatMode: Boolean = false
)

@Entity(tableName = "hold_journal")
data class HoldJournalEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val sessionId: String,
    val eventType: String,
    val method: String? = null,
    val success: Boolean = false,
    val timestamp: Long = Clock.System.now().toEpochMilliseconds()
)

@Entity(tableName = "inventory")
data class InventoryEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val sessionId: String,
    val itemId: String,
    val quantity: Int = 1,
    val acquiredAt: Long = Clock.System.now().toEpochMilliseconds(),
    val isCheat: Boolean = false
)

// Journal des événements d'inventaire (change inventory-events-hints) :
// le journal EST le bus — écriture immédiate, relecture par sessionId
// (reprise exacte après kill), flag triche comme les autres events.
@Entity(tableName = "inventory_events")
data class InventoryEventEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val sessionId: String,
    val eventType: String,
    val itemId: String? = null,
    val timestamp: Long = Clock.System.now().toEpochMilliseconds(),
    val isCheat: Boolean = false
)
