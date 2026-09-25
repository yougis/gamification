package com.geoplay.shared.game

import com.geoplay.shared.pack.parseGameJson
import java.io.File
import kotlin.test.Test
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

// Parité player (change parite-player) : le jeu habillé de référence doit
// se parser et résoudre un écran pour chaque nœud, avec des widgets connus.
// Fixture lue depuis le Studio (même JSON auteur, aucune copie).
class SherlockParityJvmTest {

    private val knownWidgets = setOf("text", "image", "button", "progress", "module", "spacer")

    @Test
    fun sherlockScreensResolveForEveryNode() {
        val file = File("../../studio/src/game/game-sherlock-holmes.json")
        assertTrue(file.exists(), "fixture Studio introuvable : ${file.absolutePath}")
        val game = parseGameJson(file.readText())
        assertTrue(game.nodes.size >= 9, "Sherlock a ${game.nodes.size} nœuds")

        for (node in game.nodes) {
            val screen = resolveScreen(game, node)
            assertNotNull(screen.zones, "écran sans zones : ${node.id}")
            val widgets = listOfNotNull(
                screen.zones?.header, screen.zones?.content,
                screen.zones?.footer, screen.zones?.overlay,
            ).flatMap { it.widgets }
            for (w in widgets) {
                assertTrue(w.type in knownWidgets, "widget inconnu ${w.type} sur ${node.id}")
                resolveWidgetStyle(game, node, w)
            }
        }
    }
}
