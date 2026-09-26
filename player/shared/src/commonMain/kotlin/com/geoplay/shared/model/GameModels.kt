package com.geoplay.shared.model

import kotlin.time.Clock
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

// Enums socle — définis une seule fois (source : specs 000/100 + game-schema).
enum class ConditionType {
    GEOFENCE, NODE_COMPLETED, TIMER, POOL_DRAWN, PROXIMITY_MASTER, CONDITIONAL, WINDOW,
    ITEM_REQUIRED, ITEM_USED, CODE_INPUT, CLUE_RESOLVED
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
enum class ModuleType { QUIZ, DIFFERENCE_GAME, PUZZLE, AR_MARKER, BOUSSOLE, INFO, RANDOM_POOL, CODE_INPUT, CLUE_RESOLVER, ITEM_DROPPER, ITEM_CONSUMER }
enum class Difficulty { ENFANT, FAMILLE, EXPERT }
enum class GameMode { NORMAL, ANIMATEUR, SOIREE, HARDCORE }
enum class ReviewStatus { DRAFT, REVIEWED, PUBLISHED }
enum class Milieu { EXTERIEUR, FORET, BATIMENT_CAVE }

@Serializable
data class HoldExit(val method: HoldExitMethod, val pin: String? = null, val adminPanel: Boolean = false)

// Racine Jeu — calquée sur studio/src/game/types.ts (schéma opposable).
enum class NavigationModel { BASIC, GUIDED, TREASURE_HUNT, ESCAPE_GAME, OPEN_EXPLORATION }

@Serializable
data class Game(
    val gameId: String,
    val schemaVersion: String = "1.0.0",
    val minEngineVersion: String = "1.0.0",
    val nodes: List<GameNode> = emptyList(),
    val branding: Branding? = null,
    val global: GlobalData = GlobalData(),
    val holdMode: HoldMode = HoldMode.NONE,
    val holdExit: HoldExit? = null,
    val experienceStyle: ExperienceStyle? = null,
    val gameMode: GameMode = GameMode.NORMAL,
    val difficulty: Difficulty = Difficulty.FAMILLE,
    val objects: List<GameObject> = emptyList(),
    // Recettes de combinaison (change inventory-crafting) : absent = pas de craft.
    val recipes: List<Recipe> = emptyList()
)

@Serializable
data class GameObject(
    val id: String,
    val name: String,
    val icon: String? = null,
    val description: String? = null,
    val consumable: Boolean = false,
    val stackable: Boolean = true
)

// Recette de combinaison (change inventory-crafting, miroir types.ts) :
// réunir les inputs possédés produit output ; consume=true retire
// l'entrée (1 unité), false la conserve. Production via GIVE_ITEM.
@Serializable
data class RecipeInput(
    val itemId: String,
    val consume: Boolean = true
)

@Serializable
data class Recipe(
    val id: String,
    val inputs: List<RecipeInput> = emptyList(),
    val output: String
)

@Serializable
data class Branding(
    val name: String = "",
    val primaryColor: String = "#1a7f37",
    val secondaryColor: String = "#5f3dc4",
    val fontFamily: String = "system-ui",
    val logo: String? = null
)

@Serializable
data class ExperienceStyleIdentity(
    val name: String = "",
    val publisher: String = "",
    val logo: String? = null,
    val theme: String = "default"
)

@Serializable
data class ExperienceStyleVisual(
    val primaryColor: String = "#1a7f37",
    val secondaryColor: String = "#5f3dc4",
    val fontFamily: String = "system-ui",
    val borderRadius: Int = 12,
    val cardStyle: String = "rounded"
)

@Serializable
data class ExperienceStyle(
    val preset: String? = null,
    val identity: ExperienceStyleIdentity? = null,
    val visual: ExperienceStyleVisual? = null,
    val components: Map<String, JsonElement> = emptyMap(),
    val media: Map<String, JsonElement> = emptyMap(),
    val motion: Map<String, JsonElement> = emptyMap(),
    val map: Map<String, JsonElement> = emptyMap(),
    val voice: Map<String, JsonElement> = emptyMap()
)

@Serializable
data class GlobalData(
    val gpsRadiusMeters: Int = 30,
    val navigationModel: NavigationModel = NavigationModel.BASIC,
    val presentation: List<String> = emptyList(),
    val map: MapConfig = MapConfig(),
    val gpxTrace: GpxTrace = GpxTrace(),
    val experienceStyle: ExperienceStyle? = null,
    val gameMode: GameMode = GameMode.NORMAL,
    val difficulty: Difficulty = Difficulty.FAMILLE,
    // Temps global (change game-temps-global-fenetres) : durée de partie en
    // secondes + comportement à l'échéance ("terminer"|"continuer").
    // Absents = pas de limite (rétrocompatible).
    val dureeTotale: Long? = null,
    val finDeTemps: String? = null,
    // Template d'écran par défaut (change parite-player, miroir Draft-07) :
    // absent = écran par défaut. Jamais requis (compat ascendante).
    val screen: ScreenDefinition? = null
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

enum class DiscoveryMode { VISIBLE_NOW, MAP, ON_COMPLETED, ON_CLUE, ON_ITEM, ON_PUZZLE, ON_PROXIMITY, ON_TIME }

@Serializable
data class Discovery(val mode: DiscoveryMode, val sourceNode: String? = null, val clueId: String? = null, val lat: Double? = null, val lng: Double? = null, val radiusMeters: Int? = null)

@Serializable
data class Effect(val type: String, val itemId: String? = null, val nodeId: String? = null, val variableId: String? = null, val value: JsonElement? = null)

enum class InventoryAction { GIVE, REMOVE, CHECK, USE }

data class InventoryEntry(val itemId: String, val quantity: Int = 1, val acquiredAt: Long = Clock.System.now().toEpochMilliseconds())

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
    val latch: Boolean = true,
    // Accès boîte à outils (change player-inventory-toolbox) : false masque
    // l'icône sur cet écran ; absent = true.
    val inventoryAccess: Boolean = true,
    val discovery: Discovery? = null,
    val effects: List<Effect> = emptyList(),
    val inventoryRef: List<String> = emptyList(),
    // Écran auteur WYSIWYG (change parite-player, miroir Draft-07) :
    // absent = héritage du global puis écran par défaut.
    val screen: ScreenDefinition? = null
)

// Écran auteur (change parite-player) : ScreenDefinition plate, miroir du
// sous-schéma Draft-07 `screen`. Types plats + champs optionnels (même
// pattern que `Condition`) : aucune variante inconnue ne casse le parse
// (GeoPlayJson ignoreUnknownKeys). Les widgets sont discriminés par `type`
// (text|image|button|progress|module|spacer), chaque variante ne lisant
// que ses champs.
@Serializable
data class WidgetStyles(
    val fontFamily: String? = null,
    val fontSize: Double? = null,
    val fontWeight: String? = null,
    val color: String? = null,
    val align: String? = null
)

@Serializable
data class ScreenBackground(
    val type: String = "color",
    val value: String = "",
    val overlay: Double? = null
)

@Serializable
data class ScreenWidget(
    val type: String,
    val text: String? = null,
    val style: String? = null,
    val fontSize: Double? = null,
    val color: String? = null,
    val align: String? = null,
    val src: String? = null,
    val width: JsonElement? = null,
    val height: JsonElement? = null,
    val fit: String? = null,
    val alt: String? = null,
    val label: String? = null,
    val action: String? = null,
    val icon: String? = null,
    val variant: String? = null,
    val progressType: String? = null,
    val showLabel: Boolean? = null,
    val styles: WidgetStyles? = null
)

@Serializable
data class ZoneContent(
    val layout: String = "stack",
    val widgets: List<ScreenWidget> = emptyList(),
    val fermable: Boolean = false
)

@Serializable
data class ScreenZones(
    val header: ZoneContent? = null,
    val content: ZoneContent? = null,
    val footer: ZoneContent? = null,
    val overlay: ZoneContent? = null
)

@Serializable
data class ScreenTransitions(
    val enter: String? = null,
    val exit: String? = null
)

@Serializable
data class ScreenDefinition(
    val layout: String? = null,
    val background: ScreenBackground? = null,
    val zones: ScreenZones? = null,
    val transitions: ScreenTransitions? = null,
    val styles: WidgetStyles? = null
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
    val minRssiDbm: Int? = null,
    val itemId: String? = null,
    val consumed: Boolean = true,
    val code: String? = null,
    val clueId: String? = null,
    // Fenêtre temporelle relative (change game-temps-global-fenetres) :
    // secondes écoulées depuis GAME_START. Au moins une borne posée (C1).
    val apresSecondes: Long? = null,
    val avantSecondes: Long? = null
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

