package com.geoplay.shared.game

import com.geoplay.shared.model.NodeState
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

// Change home-player-runtime (3.1.1) : navigation explicite, sans cablage UI.
class NavigationCommonTest {

    @Test
    fun navigationInitialeEstHome() {
        assertEquals(Navigation.Home, navigationInitiale())
    }

    @Test
    fun variantesPorteuses() {
        val volet = Navigation.Volet("point-a")
        assertEquals("point-a", volet.id)
        val etape = Navigation.Etape("point-a", VueMode.JOUABLE)
        assertEquals("point-a", etape.id)
        assertEquals(VueMode.JOUABLE, etape.mode)
        assertTrue(Navigation.PleinEcran is Navigation)
    }

    @Test
    fun quatreVuesDistinctes() {
        val vues: List<Navigation> = listOf(
            Navigation.Home,
            Navigation.Volet("a"),
            Navigation.Etape("a", VueMode.APERCU),
            Navigation.PleinEcran,
        )
        assertEquals(4, vues.toSet().size)
    }

    @Test
    fun modeVueDepuisEtatMoteur() {
        // Change simulateur-compose-sans-pwa (cycle sans etat intermediaire).
        assertEquals(VueMode.JOUABLE, modeVue(NodeState.UNLOCKED))
        assertEquals(VueMode.RELECTURE, modeVue(NodeState.COMPLETED))
        assertEquals(VueMode.APERCU, modeVue(NodeState.LOCKED))
        assertEquals(VueMode.APERCU, modeVue(null))
    }
}
