package com.geoplay.player.data

import androidx.room.TypeConverter
import com.geoplay.player.model.Anchor
import com.geoplay.player.model.ConditionType
import com.geoplay.player.model.DiscoveryMode
import com.geoplay.player.model.Difficulty
import com.geoplay.player.model.DrawTiming
import com.geoplay.player.model.GameMode
import com.geoplay.player.model.Milieu
import com.geoplay.player.model.ModuleType
import com.geoplay.player.model.NavigationModel
import com.geoplay.player.model.NodeState
import com.geoplay.player.model.OnReentry
import com.geoplay.player.model.Operator
import com.geoplay.player.model.Predicate
import com.geoplay.player.model.ReviewStatus
import com.geoplay.player.model.Transport
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.builtins.serializer
import kotlinx.serialization.json.Json

// Converters Room — une seule définition par type. Les entités actuelles
// ne stockent que des primitifs/String, ces converters servent aux
// évolutions (colonnes typées) et au parsing JSON annexe.
class Converters {
    private val json = Json { ignoreUnknownKeys = true; coerceInputValues = true }

    @TypeConverter
    fun nodeStateToString(state: NodeState?): String? = state?.name

    @TypeConverter
    fun stringToNodeState(value: String?): NodeState? = value?.let { NodeState.valueOf(it) }

    @TypeConverter
    fun conditionTypeToString(type: ConditionType?): String? = type?.name

    @TypeConverter
    fun stringToConditionType(value: String?): ConditionType? =
        value?.let { ConditionType.valueOf(it) }

    @TypeConverter
    fun operatorToString(op: Operator?): String? = op?.name

    @TypeConverter
    fun stringToOperator(value: String?): Operator? = value?.let { Operator.valueOf(it) }

    @TypeConverter
    fun predicateToString(pred: Predicate?): String? = pred?.name

    @TypeConverter
    fun stringToPredicate(value: String?): Predicate? = value?.let { Predicate.valueOf(it) }

    @TypeConverter
    fun anchorToString(anchor: Anchor?): String? = anchor?.name

    @TypeConverter
    fun stringToAnchor(value: String?): Anchor? = value?.let { Anchor.valueOf(it) }

    @TypeConverter
    fun drawTimingToString(timing: DrawTiming?): String? = timing?.name

    @TypeConverter
    fun stringToDrawTiming(value: String?): DrawTiming? = value?.let { DrawTiming.valueOf(it) }

    @TypeConverter
    fun transportToString(transport: Transport?): String? = transport?.name

    @TypeConverter
    fun stringToTransport(value: String?): Transport? = value?.let { Transport.valueOf(it) }

    @TypeConverter
    fun onReentryToString(reentry: OnReentry?): String? = reentry?.name

    @TypeConverter
    fun stringToOnReentry(value: String?): OnReentry? = value?.let { OnReentry.valueOf(it) }

    @TypeConverter
    fun moduleTypeToString(type: ModuleType?): String? = type?.name

    @TypeConverter
    fun stringToModuleType(value: String?): ModuleType? = value?.let { ModuleType.valueOf(it) }

    @TypeConverter
    fun difficultyToString(diff: Difficulty?): String? = diff?.name

    @TypeConverter
    fun stringToDifficulty(value: String?): Difficulty? = value?.let { Difficulty.valueOf(it) }

    @TypeConverter
    fun gameModeToString(mode: GameMode?): String? = mode?.name

    @TypeConverter
    fun stringToGameMode(value: String?): GameMode? = value?.let { GameMode.valueOf(it) }

    @TypeConverter
    fun reviewStatusToString(status: ReviewStatus?): String? = status?.name

    @TypeConverter
    fun stringToReviewStatus(value: String?): ReviewStatus? =
        value?.let { ReviewStatus.valueOf(it) }

    @TypeConverter
    fun milieuToString(milieu: Milieu?): String? = milieu?.name

    @TypeConverter
    fun stringToMilieu(value: String?): Milieu? = value?.let { Milieu.valueOf(it) }

    @TypeConverter
    fun navigationModelToString(model: NavigationModel?): String? = model?.name

    @TypeConverter
    fun stringToNavigationModel(value: String?): NavigationModel? = value?.let { NavigationModel.valueOf(it) }

    @TypeConverter
    fun discoveryModeToString(mode: DiscoveryMode?): String? = mode?.name

    @TypeConverter
    fun stringToDiscoveryMode(value: String?): DiscoveryMode? = value?.let { DiscoveryMode.valueOf(it) }

    @TypeConverter
    fun listStringToJson(list: List<String>?): String? =
        list?.let { json.encodeToString(ListSerializer(String.serializer()), it) }

    @TypeConverter
    fun jsonToListString(value: String?): List<String>? =
        value?.let { json.decodeFromString(ListSerializer(String.serializer()), it) }
}
