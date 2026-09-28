package com.geoplay.shared.game

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

// Preuve 1.1 (change inventory-events-hints) : vocabulaire fermé à six
// types, fabrique d'émission (timestamp, sessionId, itemId, flag triche).
class InventoryEventsCommonTest {

    @Test
    fun vocabularyIsClosedToSixTypes() {
        assertEquals(
            setOf(
                "INVENTORY_OPENED",
                "ITEM_SELECTED",
                "ITEM_USED",
                "ITEM_COMBINED",
                "ITEM_GIVEN",
                "ITEM_REMOVED"
            ),
            INVENTORY_EVENT_TYPES
        )
    }

    @Test
    fun factoryFillsTimestampSessionAndItem() {
        val before = kotlin.time.Clock.System.now().toEpochMilliseconds()
        val e = inventoryEvent(InventoryEventType.ITEM_SELECTED, "s1", "loupe")
        assertEquals(InventoryEventType.ITEM_SELECTED, e.type)
        assertEquals("s1", e.sessionId)
        assertEquals("loupe", e.itemId)
        assertTrue(e.timestamp >= before)
    }

    @Test
    fun itemIdOptionalAndCheatFlag() {
        val open = inventoryEvent(InventoryEventType.INVENTORY_OPENED, "s1")
        assertNull(open.itemId)
        assertEquals(false, open.isCheat)
        val cheat = inventoryEvent(InventoryEventType.ITEM_USED, "s1", "cle", isCheat = true)
        assertEquals(true, cheat.isCheat)
    }

    @Test
    fun resolvePreciseBroadAndLastWins() {
        val hints = listOf(
            InventoryHint(InventoryEventType.ITEM_SELECTED, null, "Un objet a été sélectionné."),
            InventoryHint(InventoryEventType.ITEM_SELECTED, "loupe", "Regarde le coin supérieur droit."),
            InventoryHint(InventoryEventType.ITEM_USED, null, "Bien utilisé, continue.")
        )
        assertEquals(
            "Regarde le coin supérieur droit.",
            resolveInventoryHint(hints, InventoryEventType.ITEM_SELECTED, "loupe")
        )
        assertEquals(
            "Un objet a été sélectionné.",
            resolveInventoryHint(hints, InventoryEventType.ITEM_SELECTED, "cle")
        )
        assertEquals(
            "Bien utilisé, continue.",
            resolveInventoryHint(hints, InventoryEventType.ITEM_USED, "nimporte-quoi")
        )
        assertNull(resolveInventoryHint(hints, InventoryEventType.ITEM_GIVEN, "loupe"))
        val doubles = listOf(
            InventoryHint(InventoryEventType.ITEM_SELECTED, "loupe", "Premier."),
            InventoryHint(InventoryEventType.ITEM_SELECTED, "loupe", "Dernier.")
        )
        assertEquals("Dernier.", resolveInventoryHint(doubles, InventoryEventType.ITEM_SELECTED, "loupe"))
    }

    @Test
    fun parseHintsFromModuleData() {
        val json = kotlinx.serialization.json.Json
        val data = mapOf(
            "inventoryHints" to json.parseToJsonElement(
                """[{"event":"ITEM_SELECTED","itemId":"loupe","hint":"Regarde."},
                    {"event":"ITEM_DEVINE","hint":"?"},
                    {"event":"ITEM_USED","hint":""},
                    "pas-un-objet"]"""
            )
        )
        val parsed = parseInventoryHints(data)
        assertEquals(1, parsed.size)
        assertEquals(InventoryHint(InventoryEventType.ITEM_SELECTED, "loupe", "Regarde."), parsed[0])
        assertEquals(emptyList(), parseInventoryHints(emptyMap()))
    }

    @Test
    fun quizEndToEndJournalToRendererStaysOpen() {
        // Journal : la loupe est sélectionnée pendant le quiz ouvert.
        val evt = inventoryEvent(InventoryEventType.ITEM_SELECTED, "s1", "loupe")
        // Le renderer parse les data du module puis résout l'indice précis.
        val json = kotlinx.serialization.json.Json
        val data = mapOf(
            "inventoryHints" to json.parseToJsonElement(
                """[{"event":"ITEM_SELECTED","hint":"Un objet a été sélectionné."},
                    {"event":"ITEM_SELECTED","itemId":"loupe","hint":"Regarde le coin supérieur droit."}]"""
            )
        )
        val hints = parseInventoryHints(data)
        assertEquals(
            "Regarde le coin supérieur droit.",
            resolveInventoryHint(hints, evt.type, evt.itemId)
        )
        // Abonnement large pour un autre objet.
        val evt2 = inventoryEvent(InventoryEventType.ITEM_SELECTED, "s1", "cle")
        assertEquals(
            "Un objet a été sélectionné.",
            resolveInventoryHint(hints, evt2.type, evt2.itemId)
        )
        // Le nœud reste ouvert en suggestion : aucune auto-assignation.
        val s0 = suggest(listOf("q"), emptyList())
        assertEquals("q", s0.tete)
        assertEquals("q", suggest(listOf("q"), s0.file).tete)
    }

    @Test
    fun puzzleEndToEndBroadSubscription() {        val json = kotlinx.serialization.json.Json
        val data = mapOf(
            "inventoryHints" to json.parseToJsonElement(
                """[{"event":"ITEM_USED","hint":"Bien utilisé, continue."}]"""
            )
        )
        val hints = parseInventoryHints(data)
        val evt = inventoryEvent(InventoryEventType.ITEM_USED, "s1", "colle")
        assertEquals("Bien utilisé, continue.", resolveInventoryHint(hints, evt.type, evt.itemId))
        val s0 = suggest(listOf("p"), emptyList())
        assertEquals("p", suggest(listOf("p"), s0.file).tete)
    }
}
