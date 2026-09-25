package com.geoplay.shared.game

import com.geoplay.shared.model.Recipe
import com.geoplay.shared.model.RecipeInput
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

// Preuve 2.1 (change inventory-crafting) : proposer les recettes réunies,
// appliquer atomiquement (tout ou rien) via REMOVE+GIVE.
private val POUDRE_LETTRE = Recipe(
    id = "reveler",
    inputs = listOf(RecipeInput("poudre", consume = true), RecipeInput("lettre", consume = true)),
    output = "message"
)
private val LOUPE_CARTE = Recipe(
    id = "annoter",
    inputs = listOf(RecipeInput("loupe", consume = false), RecipeInput("carte", consume = true)),
    output = "carte-annotee"
)

class CraftingCommonTest {

    @Test
    fun proposeOnlyGatheredRecipes() {
        val recipes = listOf(POUDRE_LETTRE, LOUPE_CARTE)
        assertEquals(
            listOf(POUDRE_LETTRE),
            availableRecipes(recipes, mapOf("poudre" to 1, "lettre" to 1))
        )
        assertEquals(
            listOf(LOUPE_CARTE),
            availableRecipes(recipes, mapOf("loupe" to 1, "carte" to 1))
        )
        assertTrue(availableRecipes(recipes, mapOf("loupe" to 1)).isEmpty())
    }

    @Test
    fun applyDestroysInputsAndGivesOutput() {
        val after = applyRecipe(POUDRE_LETTRE, InventoryState(mapOf("poudre" to 1, "lettre" to 1)))
        assertEquals(mapOf("message" to 1), after?.items)
    }

    @Test
    fun applyKeepsUnconsumedTool() {
        val after = applyRecipe(LOUPE_CARTE, InventoryState(mapOf("loupe" to 1, "carte" to 1)))
        assertEquals(mapOf("loupe" to 1, "carte-annotee" to 1), after?.items)
    }

    @Test
    fun missingInputAppliesNothing() {
        // Tout ou rien : entrée manquante → null, l'état d'origine est intact.
        val before = InventoryState(mapOf("loupe" to 1))
        assertNull(applyRecipe(LOUPE_CARTE, before))
        assertEquals(mapOf("loupe" to 1), before.items)
        assertNull(applyRecipe(POUDRE_LETTRE, InventoryState()))
    }

    @Test
    fun workshopScenariosWithJournal() {        // Atelier complet : destruction puis outil conservé, inventaires
        // exacts, journal ITEM_COMBINED rejouable par sessionId.
        var inv = InventoryState(mapOf("poudre" to 1, "lettre" to 1, "loupe" to 1, "carte" to 1))
        val recipes = listOf(POUDRE_LETTRE, LOUPE_CARTE)
        assertEquals(
            listOf("annoter", "reveler"),
            availableRecipes(recipes, inv.items).map { it.id }.sorted()
        )
        val journal = mutableListOf<InventoryEvent>()
        inv = applyRecipe(POUDRE_LETTRE, inv)!!
        journal.add(inventoryEvent(InventoryEventType.ITEM_COMBINED, "atelier", POUDRE_LETTRE.output))
        assertEquals(mapOf("loupe" to 1, "carte" to 1, "message" to 1), inv.items)
        inv = applyRecipe(LOUPE_CARTE, inv)!!
        journal.add(inventoryEvent(InventoryEventType.ITEM_COMBINED, "atelier", LOUPE_CARTE.output))
        assertEquals(mapOf("loupe" to 1, "message" to 1, "carte-annotee" to 1), inv.items)
        assertEquals(
            listOf("message" to "ITEM_COMBINED", "carte-annotee" to "ITEM_COMBINED"),
            journal.map { it.itemId to it.type.name }
        )
        assertTrue(journal.all { it.sessionId == "atelier" })
        assertTrue(availableRecipes(recipes, inv.items).isEmpty())
    }

    @Test
    fun recipesWireFormatParsesOnBothPlayers() {
        // Même désérialiseur shared (natif + PWA) : recipes lus, absents = [].
        val json = kotlinx.serialization.json.Json { ignoreUnknownKeys = true }
        val withRecipes = json.decodeFromString(
            com.geoplay.shared.model.Game.serializer(),
            """{"gameId":"atelier","nodes":[],
               "recipes":[{"id":"reveler","inputs":[{"itemId":"poudre"},{"itemId":"lettre"}],"output":"message"}]}"""
        )
        assertEquals(1, withRecipes.recipes.size)
        assertEquals("reveler", withRecipes.recipes[0].id)
        assertEquals(true, withRecipes.recipes[0].inputs[0].consume)
        val without = json.decodeFromString(
            com.geoplay.shared.model.Game.serializer(),
            """{"gameId":"sherlock-like","nodes":[]}"""
        )
        assertEquals(emptyList(), without.recipes)
        assertTrue(availableRecipes(without.recipes, mapOf("poudre" to 1)).isEmpty())
    }
}
