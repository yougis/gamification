package com.geoplay.shared.game

import com.geoplay.shared.model.Activation
import com.geoplay.shared.model.Condition
import com.geoplay.shared.model.ConditionType
import com.geoplay.shared.model.Discovery
import com.geoplay.shared.model.DiscoveryMode
import com.geoplay.shared.model.Game
import com.geoplay.shared.model.GameNode
import com.geoplay.shared.model.MapPoiStyle
import com.geoplay.shared.model.ModuleData
import com.geoplay.shared.model.NodeState
import com.geoplay.shared.model.RandomPool
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

private fun noeud(
    id: String,
    lat: Double? = 48.01,
    lng: Double? = 2.01,
    discovery: Discovery? = null,
): GameNode = GameNode(
    id = id,
    module = ModuleData(type = "INFO"),
    activation = Activation(
        requires = if (lat != null && lng != null) {
            listOf(Condition(type = ConditionType.GEOFENCE, lat = lat, lng = lng, radiusMeters = 30))
        } else {
            listOf(Condition(type = ConditionType.NODE_COMPLETED, nodeId = "start"))
        },
    ),
    discovery = discovery,
)

private val jeuDeuxPoi = Game(
    gameId = "fixture-carte",
    nodes = listOf(
        noeud("a", 48.01, 2.01),
        noeud("b", 48.02, 2.02, Discovery(mode = DiscoveryMode.ON_CLUE, clueId = "indice_1")),
    ),
)

class MapWidgetCommonTest {

    @Test
    fun etapeCacheeInvisibleParDefaut() {
        val ms = marqueursCarte(jeuDeuxPoi, mapOf("a" to NodeState.UNLOCKED))
        assertEquals(listOf("a"), ms.map { it.id })
    }

    @Test
    fun filtreAllMontreTout() {
        val ms = marqueursCarte(jeuDeuxPoi, emptyMap(), DiscoveryState(), "all")
        assertEquals(setOf("a", "b"), ms.map { it.id }.toSet())
    }

    @Test
    fun etapeDecouverteApparait() {
        val ms = marqueursCarte(
            jeuDeuxPoi,
            emptyMap(),
            DiscoveryState(discovered = setOf("indice_1")),
        )
        assertEquals(setOf("a", "b"), ms.map { it.id }.toSet())
    }

    @Test
    fun sansGeofencePasDeMarqueur() {
        val jeu = Game(gameId = "x", nodes = listOf(noeud("s", null, null)))
        assertTrue(marqueursCarte(jeu, emptyMap()).isEmpty())
    }

    @Test
    fun poolsExclus() {
        val pool = noeud("p").copy(randomPool = RandomPool(candidates = listOf("a"), drawCount = 1))
        val jeu = Game(gameId = "x", nodes = listOf(noeud("a"), pool))
        assertEquals(listOf("a"), marqueursCarte(jeu, emptyMap()).map { it.id })
    }

    @Test
    fun bboxNulleSiVideEtRelativeSinon() {
        assertEquals(null, bboxMarqueurs(emptyList()))
        val ms = marqueursCarte(jeuDeuxPoi, emptyMap(), DiscoveryState(), "all")
        val bbox = bboxMarqueurs(ms)!!
        for (m in ms) {
            val (x, y) = positionRelative(m, bbox)
            assertTrue(x in 0f..1f && y in 0f..1f, "marqueur ${m.id} dans le cadre")
        }
    }

    @Test
    fun accesOuvrirSiEligibleSinonVerrouille() {
        assertEquals("Ouvrir" to true, accesPoi(NodeState.UNLOCKED))
        assertEquals("Verrouillé" to false, accesPoi(NodeState.LOCKED))
        assertEquals("Verrouillé" to false, accesPoi(NodeState.ACTIVE))
        assertEquals("Verrouillé" to false, accesPoi(NodeState.COMPLETED))
    }

    @Test
    fun iconesDefautDistinctesEtSurcharge() {
        val defauts = NodeState.entries.map { iconePoi(null, it) }.toSet()
        assertEquals(4, defauts.size)
        val style = MapPoiStyle(locked = "cadenas", unlocked = "etoile")
        assertEquals("cadenas", iconePoi(style, NodeState.LOCKED))
        assertEquals("etoile", iconePoi(style, NodeState.UNLOCKED))
        assertEquals(iconePoiDefaut(NodeState.ACTIVE), iconePoi(style, NodeState.ACTIVE))
        assertFalse(iconePoi(MapPoiStyle(locked = "  "), NodeState.LOCKED) == "  ")
    }

    @Test
    fun voletDefautTextePlusBoutonLie() {
        val volet = voletCarteDefaut()
        assertEquals(2, volet.size)
        assertEquals("text", volet[0].type)
        assertEquals("button", volet[1].type)
        assertEquals("open-step", volet[1].poiAction)
    }
}
