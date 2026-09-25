package com.geoplay.shared.game

import com.geoplay.shared.model.Game
import com.geoplay.shared.model.GameNode
import com.geoplay.shared.model.GameObject
import com.geoplay.shared.model.GlobalData
import com.geoplay.shared.model.ModuleData
import com.geoplay.shared.model.Activation
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

// Preuve 1.2 (change player-inventory-toolbox) : règle d'affichage triple,
// lue du JSON — le nœud ne peut que masquer, jamais forcer.
private fun nodeInventory(id: String, access: Boolean = true) = GameNode(
    id = id,
    module = ModuleData(type = "INFO"),
    activation = Activation(),
    inventoryAccess = access
)

private fun gameToolbox(objects: List<GameObject>, presentation: List<String>, nodes: List<GameNode>) = Game(
    gameId = "tb",
    nodes = nodes,
    global = GlobalData(presentation = presentation),
    objects = objects
)

class ToolboxCommonTest {

    private val loupe = GameObject(id = "loupe", name = "Loupe")
    private val n = nodeInventory("q")

    @Test
    fun visibleWithObjectsToolboxAndDefaultFlag() {
        val g = gameToolbox(listOf(loupe), listOf("MAP", "TOOLBOX"), listOf(n))
        assertTrue(toolboxIconVisible(g, null))
        assertTrue(toolboxIconVisible(g, "q"))
    }

    @Test
    fun hiddenWithoutObjects() {
        val g = gameToolbox(emptyList(), listOf("MAP", "TOOLBOX"), listOf(n))
        assertFalse(toolboxIconVisible(g, null))
        assertFalse(toolboxIconVisible(g, "q"))
    }

    @Test
    fun hiddenWithoutToolboxPresentation() {
        val g = gameToolbox(listOf(loupe), listOf("MAP"), listOf(n))
        assertFalse(toolboxIconVisible(g, null))
        assertFalse(toolboxIconVisible(g, "q"))
    }

    @Test
    fun nodeCanOnlyHideNeverForce() {
        val masked = gameToolbox(listOf(loupe), listOf("MAP", "TOOLBOX"), listOf(nodeInventory("q", access = false)))
        assertTrue(toolboxIconVisible(masked, null))
        assertFalse(toolboxIconVisible(masked, "q"))
        // Sans inventaire réel, même un flag true ne force rien.
        val empty = gameToolbox(emptyList(), listOf("TOOLBOX"), listOf(n))
        assertFalse(toolboxIconVisible(empty, "q"))
    }
}
