package com.geoplay.shared.game

import com.geoplay.shared.pack.parseGameJson
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
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
            // Oracle pagination (change screen-subpages) : même règle
            // Studio/joueur, au plus un média par sous-page.
            val pages = paginateContent(screen.zones?.content?.widgets ?: emptyList())
            assertTrue(pages.isNotEmpty(), "au moins une sous-page : ${node.id}")
            for ((i, page) in pages.withIndex()) {
                val medias = page.count { it.type == "module" || it.type == "image" }
                assertTrue(medias <= 1, "page ${i + 1} de ${node.id} : $medias médias (max 1)")
            }
        }
        // Cas témoin : baker content [image, module].
        val baker = game.nodes.first { it.id == "baker" }
        val bakerPages = paginateContent(resolveScreen(game, baker).zones?.content?.widgets ?: emptyList())
        assertEquals(2, bakerPages.size, "baker en 2 sous-pages")
        assertEquals(listOf("image"), bakerPages[0].map { it.type })
        assertEquals(listOf("module"), bakerPages[1].map { it.type }, "module seul en dernière page")
    }
}
