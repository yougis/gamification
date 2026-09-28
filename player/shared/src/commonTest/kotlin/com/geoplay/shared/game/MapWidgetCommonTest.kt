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
        assertEquals("Verrouillé" to false, accesPoi(NodeState.COMPLETED))
    }

    @Test
    fun iconesDefautDistinctesEtSurcharge() {
        val defauts = NodeState.entries.map { iconePoi(null, it) }.toSet()
        assertEquals(3, defauts.size)
        val style = MapPoiStyle(locked = "cadenas", unlocked = "etoile")
        assertEquals("cadenas", iconePoi(style, NodeState.LOCKED))
        assertEquals("etoile", iconePoi(style, NodeState.UNLOCKED))
        assertEquals(iconePoiDefaut(NodeState.COMPLETED), iconePoi(style, NodeState.COMPLETED))
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

    // Viewport navigable (change carte-joueur-navigable, phase 2) : état UI
    // local pur — pan/zoom ne touchent ni graphe ni états (aucun event).

    @Test
    fun echelleBornee() {
        assertEquals(1f, bornerEchelle(0.2f))
        assertEquals(1f, bornerEchelle(1f))
        assertEquals(4f, bornerEchelle(4f))
        assertEquals(8f, bornerEchelle(8f))
        assertEquals(8f, bornerEchelle(99f))
    }

    @Test
    fun cranZoomParPalierEtBorne() {
        assertEquals(1.25f, cranZoom(1f, 1))
        assertEquals(1f, cranZoom(1f, -1))
        assertEquals(8f, cranZoom(8f, 1))
        assertEquals(1f, cranZoom(1f, 0))
        // Aller-retour : pas d'accumulation d'erreur hors borne.
        var e = 1f
        repeat(20) { e = cranZoom(e, 1) }
        assertEquals(8f, e)
        repeat(20) { e = cranZoom(e, -1) }
        assertEquals(1f, e, 0.0001f)
    }

    @Test
    fun tapContreDragSeuil() {
        assertTrue(estTap(0f))
        assertTrue(estTap(7.9f))
        assertTrue(estTap(8f))
        assertFalse(estTap(8.1f))
        assertTrue(estTap(20f, seuilDp = 24f))
    }

    @Test
    fun viewportSansEffetMoteur() {
        // Le viewport ne lit que la géométrie : le jeu et les états passés
        // en entrée ressortent inchangés (zéro transition, zéro event).
        val etats = mapOf("a" to NodeState.UNLOCKED)
        val avant = etats.toMap()
        val ms = marqueursCarte(jeuDeuxPoi, etats, DiscoveryState(), "all")
        val bbox = bboxMarqueurs(ms)!!
        for (m in ms) positionRelative(m, bbox)
        bornerEchelle(3f)
        cranZoom(2f, 1)
        assertEquals(avant, etats)
        assertEquals(2, jeuDeuxPoi.nodes.size)
    }

    @Test
    fun gpsAbsentSansCrash() {
        // Position null (GPS coupé, stub, permission refusée) : marqueurs et
        // bbox se calculent comme sans position — la carte reste complète.
        val ms = marqueursCarte(jeuDeuxPoi, emptyMap(), DiscoveryState(), "all")
        val bbox = bboxMarqueurs(ms)!!
        assertEquals(2, ms.size)
        for (m in ms) {
            val (x, y) = positionRelative(m, bbox)
            assertTrue(x in 0f..1f && y in 0f..1f)
        }
    }
}
