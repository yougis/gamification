package com.geoplay.shared.game

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.time.Clock

// Vocabulaire fermé des événements d'inventaire (change inventory-events-hints).
// Le journal EST le bus : émission = écriture SQLite, écoute = filtre sur
// type (+ itemId) au rendu. Versionné avec le schéma : tout nouveau type =
// nouveau change. Natif + PWA partagent ce même code.
enum class InventoryEventType {
    INVENTORY_OPENED,
    ITEM_SELECTED,
    ITEM_USED,
    ITEM_COMBINED,
    ITEM_GIVEN,
    ITEM_REMOVED
}

/** Les six types, ni plus ni moins : le vocabulaire est fermé. */
val INVENTORY_EVENT_TYPES: Set<String> =
    InventoryEventType.entries.map { it.name }.toSet()

@Serializable
data class InventoryEvent(
    val type: InventoryEventType,
    val timestamp: Long,
    val sessionId: String,
    val itemId: String? = null,
    val isCheat: Boolean = false
)

/** Fabrique d'émission : timestamp immédiat, même sessionId de reprise. */
fun inventoryEvent(
    type: InventoryEventType,
    sessionId: String,
    itemId: String? = null,
    isCheat: Boolean = false
): InventoryEvent = InventoryEvent(
    type = type,
    timestamp = Clock.System.now().toEpochMilliseconds(),
    sessionId = sessionId,
    itemId = itemId,
    isCheat = isCheat
)

// Abonnement d'un mini-jeu (miroir de studio/src/game/types.ts) : affichage
// passif uniquement, jamais de transition ni d'effet.
@Serializable
data class InventoryHint(
    val event: InventoryEventType,
    val itemId: String? = null,
    val hint: String
)

// Dernier abonnement correspondant gagne. Pur : ne touche ni état, ni
// score, ni effets — seul le texte à afficher est retourné.
fun resolveInventoryHint(
    hints: List<InventoryHint>,
    event: InventoryEventType,
    itemId: String? = null
): String? {
    var out: String? = null
    for (h in hints) {
        if (h.event != event) continue
        if (h.itemId != null && h.itemId != itemId) continue
        out = h.hint
    }
    return out
}

// Lit les abonnements depuis module.data (déjà validés C1+C2 côté Studio) ;
// entrée illisible = ignorée, jamais de crash du nœud.
fun parseInventoryHints(data: Map<String, JsonElement>): List<InventoryHint> {
    val arr = (data["inventoryHints"] as? JsonArray) ?: return emptyList()
    return arr.mapNotNull { el ->
        val o = el as? JsonObject ?: return@mapNotNull null
        val event = o["event"]?.jsonPrimitive?.content?.let {
            try {
                InventoryEventType.valueOf(it)
            } catch (_: IllegalArgumentException) {
                null
            }
        } ?: return@mapNotNull null
        val hint = o["hint"]?.jsonPrimitive?.content?.takeIf { it.isNotEmpty() }
            ?: return@mapNotNull null
        InventoryHint(
            event = event,
            itemId = o["itemId"]?.jsonPrimitive?.content,
            hint = hint
        )
    }
}
