package com.geoplay.player.model

import androidx.room.Entity
import androidx.room.PrimaryKey
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

// Enums socle — définis une seule fois (source : specs 000/100 + game-schema).
enum class ConditionType {
    GEOFENCE, NODE_COMPLETED, TIMER, POOL_DRAWN, PROXIMITY_MASTER, CONDITIONAL, WINDOW
}

enum class HoldMode { NONE, GUIDED_ACCESS, SCREEN_PINNING, LOCK_TASK }
enum class HoldExitMethod { ADMIN_PIN, ADMIN_GESTURE, ADMIN_QR, ANIMATEUR_CODE }
enum class Operator { AND, OR }
enum class Predicate { ENTER, EXIT, DWELL, THROUGH }
enum class Anchor { GAME_START, NODE_COMPLETION }
enum class DrawTiming { ON_POOL_ACTIVATION, ON_GAME_START }
enum class Transport { BLE, WIFI }
enum class NodeState { LOCKED, UNLOCKED, ACTIVE, COMPLETED }
enum class OnReentry { IGNORE, REPLAY }
enum class ModuleType { QUIZ, DIFFERENCE_GAME, PUZZLE, AR_MARKER, BOUSSOLE, INFO, RANDOM_POOL }
enum class Difficulty { ENFANT, FAMILLE, EXPERT }
enum class GameMode { NORMAL, ANIMATEUR, SOIREE, HARDCORE }
enum class ReviewStatus { DRAFT, REVIEWED, PUBLISHED }
enum class Milieu { EXTERIEUR, FORET, BATIMENT_CAVE }

data class HoldExit(val method: HoldExitMethod, val pin: String? = null, val adminPanel: Boolean = false)

// Racine Jeu — calquée sur studio/src/game/types.ts (schéma opposable).
@Serializable
data class Game(
    val gameId: String,
    val schemaVersion: String = "1.0.0",
    val minEngineVersion: String = "1.0.0",
    val nodes: List<GameNode> = emptyList(),
    val branding: JsonElement? = null,
    val global: JsonElement? = null,
    val holdMode: HoldMode = HoldMode.NONE,
    val holdExit: HoldExit? = null
)

@Serializable
data class Branding(
    val name: String = "",
    val primaryColor: String = "#1a7f37",
    val secondaryColor: String = "#5f3dc4",
    val fontFamily: String = "system-ui"
)

@Serializable
data class GlobalData(
    val gpsRadiusMeters: Int = 30,
    val map: MapConfig = MapConfig(),
    val gpxTrace: GpxTrace = GpxTrace()
)

@Serializable
data class MapConfig(
    val provider: String = "maplibre",
    val bbox: Bbox = Bbox(),
    val minZoom: Int = 10,
    val maxZoom: Int = 18,
    val attribution: String = "© OpenStreetMap"
)

@Serializable
data class Bbox(
    val minLat: Double = 0.0,
    val minLng: Double = 0.0,
    val maxLat: Double = 0.0,
    val maxLng: Double = 0.0
)

@Serializable
data class GpxTrace(
    val enabled: Boolean = true,
    val path: String = ""
)

@Serializable
data class GameNode(
    val id: String,
    val module: ModuleData,
    val activation: Activation,
    val onReentry: OnReentry = OnReentry.IGNORE,
    val maxReentries: Int = 0,
    val scoreOnReplay: Boolean = false,
    val isEnding: Boolean = false,
    val randomPool: RandomPool? = null,
    val latch: Boolean = true
)

@Serializable
data class ModuleData(
    val type: String,
    val data: Map<String, JsonElement> = emptyMap()
)

@Serializable
data class Activation(
    val requires: List<Condition> = emptyList(),
    val operator: Operator? = null,
    val latch: Boolean = true
)

// Condition plate (miroir de studio/src/game/types.ts) : un seul type
// sérialisable, champs optionnels par variante. Évite le polymorphisme
// kotlinx qui exigeait des SerialName par sous-classe.
@Serializable
data class Condition(
    val type: ConditionType,
    val lat: Double? = null,
    val lng: Double? = null,
    val radiusMeters: Int? = null,
    val predicate: Predicate? = null,
    val dwellMs: Long? = null,
    val hysteresisMeters: Int? = null,
    val maxAccuracyM: Int? = null,
    val nodeId: String? = null,
    val allowCycle: Boolean = false,
    val anchor: Anchor? = null,
    val anchorNodeId: String? = null,
    val delaySeconds: Long? = null,
    val poolNodeId: String? = null,
    val masterId: String? = null,
    val transport: Transport? = null,
    val minRssiDbm: Int? = null
)

@Serializable
data class RandomPool(
    val candidates: List<String> = emptyList(),
    val drawCount: Int = 1,
    val drawTiming: DrawTiming = DrawTiming.ON_POOL_ACTIVATION
)

@Serializable
data class MilieuPreset(
    val rayon: Int = 30,
    val dwellMs: Long = 5000,
    val predicate: String = "enter",
    val mode: String = "geofence"
)

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
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
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
    val drawnAt: Long = System.currentTimeMillis(),
    val isForced: Boolean = false
)

@Entity(tableName = "scores")
data class ScoreEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val sessionId: String,
    val nodeId: String,
    val score: Int,
    val isCheat: Boolean = false,
    val completedAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "sessions")
data class SessionEntity(
    @PrimaryKey val sessionId: String,
    val gameId: String,
    val startedAt: Long = System.currentTimeMillis(),
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
    val timestamp: Long = System.currentTimeMillis()
)
