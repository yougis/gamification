package com.geoplay.shared.game

import com.geoplay.shared.model.Activation
import com.geoplay.shared.model.Condition
import com.geoplay.shared.model.ConditionType
import com.geoplay.shared.model.Game
import com.geoplay.shared.model.GameNode
import com.geoplay.shared.model.GlobalData
import com.geoplay.shared.model.ModuleData
import com.geoplay.shared.model.ScreenBackground
import com.geoplay.shared.model.ScreenDefinition
import com.geoplay.shared.model.ScreenWidget
import com.geoplay.shared.model.WidgetStyles
import com.geoplay.shared.model.ZoneContent
import com.geoplay.shared.model.ScreenZones
import com.geoplay.shared.pack.parseGameJson
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ScreenResolveCommonTest {

    private fun node(id: String, screen: ScreenDefinition? = null) = GameNode(
        id = id,
        module = ModuleData(type = "INFO"),
        activation = Activation(requires = listOf(Condition(type = ConditionType.NODE_COMPLETED, nodeId = "x"))),
        screen = screen,
    )

    @Test
    fun parseAcceptsGameWithAndWithoutScreen() {
        val withScreen = parseGameJson(
            """{"gameId":"s","nodes":[{"id":"a","module":{"type":"INFO"},"activation":{"requires":[]},"screen":{"layout":"quiz-focus","background":{"type":"color","value":"#000"},"zones":{"content":{"layout":"stack","widgets":[{"type":"text","text":"Bonjour","styles":{"fontWeight":"bold"}}]}}}}]}""",
        )
        val screen = withScreen.nodes.first().screen
        assertNotNull(screen)
        assertEquals("quiz-focus", screen.layout)
        assertEquals("#000", screen.background?.value)
        assertEquals("Bonjour", screen.zones?.content?.widgets?.first()?.text)
        assertEquals("bold", screen.zones?.content?.widgets?.first()?.styles?.fontWeight)

        val withoutScreen = parseGameJson("""{"gameId":"t","nodes":[]}""")
        assertNull(withoutScreen.global.screen)
    }

    @Test
    fun nodeWithoutScreenInheritsGlobal() {
        val game = Game(
            gameId = "g",
            global = GlobalData(
                screen = ScreenDefinition(
                    background = ScreenBackground(type = "color", value = "#111"),
                    styles = WidgetStyles(fontFamily = "Georgia", fontSize = 14.0),
                ),
            ),
            nodes = listOf(node("a")),
        )
        val resolved = resolveScreen(game, game.nodes.first())
        assertEquals("#111", resolved.background?.value)
        assertEquals("Georgia", resolved.styles?.fontFamily)
    }

    @Test
    fun nodeOverridesBackgroundKeepsGlobalStyles() {
        val game = Game(
            gameId = "g",
            global = GlobalData(
                screen = ScreenDefinition(styles = WidgetStyles(fontFamily = "Georgia", fontSize = 14.0)),
            ),
            nodes = listOf(
                node(
                    "a",
                    ScreenDefinition(
                        background = ScreenBackground(type = "image", value = "chateau.jpg"),
                        styles = WidgetStyles(fontSize = 18.0),
                    ),
                ),
            ),
        )
        val resolved = resolveScreen(game, game.nodes.first())
        assertEquals("chateau.jpg", resolved.background?.value)
        assertEquals("Georgia", resolved.styles?.fontFamily)
        assertEquals(18.0, resolved.styles?.fontSize)
    }

    @Test
    fun zonesMergeByName() {
        val game = Game(
            gameId = "g",
            global = GlobalData(
                screen = ScreenDefinition(
                    zones = ScreenZones(
                        header = ZoneContent(widgets = listOf(ScreenWidget(type = "text", text = "Jeu"))),
                    ),
                ),
            ),
            nodes = listOf(
                node(
                    "a",
                    ScreenDefinition(
                        zones = ScreenZones(
                            content = ZoneContent(widgets = listOf(ScreenWidget(type = "module"))),
                        ),
                    ),
                ),
            ),
        )
        val resolved = resolveScreen(game, game.nodes.first())
        assertEquals("Jeu", resolved.zones?.header?.widgets?.first()?.text)
        assertEquals("module", resolved.zones?.content?.widgets?.first()?.type)
    }

    @Test
    fun widgetStyleWinsPerPropertyOverThreeLevels() {
        val game = Game(
            gameId = "g",
            global = GlobalData(
                screen = ScreenDefinition(styles = WidgetStyles(fontFamily = "Georgia", fontSize = 14.0)),
            ),
            nodes = listOf(
                node("a", ScreenDefinition(styles = WidgetStyles(fontSize = 18.0))),
            ),
        )
        val widget = ScreenWidget(type = "text", text = "T", styles = WidgetStyles(color = "#ff0000"))
        val style = resolveWidgetStyle(game, game.nodes.first(), widget)
        assertEquals("Georgia", style.fontFamily)
        assertEquals(18.0, style.fontSize)
        assertEquals("#ff0000", style.color)
    }

    @Test
    fun gameWithoutAnyScreenUsesDefault() {
        val game = Game(gameId = "g", nodes = listOf(node("a")))
        val resolved = resolveScreen(game, game.nodes.first())
        assertNotNull(resolved.zones?.content)
        assertTrue(resolved.zones?.content?.widgets?.isEmpty() == true)
    }
}
