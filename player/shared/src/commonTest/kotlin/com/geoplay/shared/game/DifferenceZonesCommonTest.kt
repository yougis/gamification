package com.geoplay.shared.game

import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

// Preuve 1.2 (change zones-7-erreurs) : tap intérieur/extérieur des deux
// formes, avec et sans dilatation — miroir du comportement Studio.
private val RECT = DiffZone.Rect(RectZone(10.0, 10.0, 5.0, 5.0))
private val POLY = DiffZone.Poly(
    PolyZone(
        listOf(
            ZonePoint(10.0, 10.0),
            ZonePoint(20.0, 10.0),
            ZonePoint(15.0, 20.0),
            ZonePoint(8.0, 18.0),
            ZonePoint(9.0, 12.0)
        )
    )
)

class DifferenceZonesCommonTest {

    @Test
    fun rectHitUnchanged() {
        assertTrue(hitTest(listOf(RECT), 12.0, 12.0, 0.0))
        assertFalse(hitTest(listOf(RECT), 20.0, 20.0, 0.0))
        assertTrue(hitTest(listOf(RECT), 20.0, 20.0, 6.0))
    }

    @Test
    fun polyInsideAndOutside() {
        assertTrue(hitTest(listOf(POLY), 13.0, 13.0, 0.0))
        assertFalse(hitTest(listOf(POLY), 30.0, 30.0, 0.0))
    }

    @Test
    fun polyEdgeDilatation() {
        // Sur l'arête (10,10)-(20,10) : dedans à 0.5 près, dehors sinon.
        assertTrue(hitTest(listOf(POLY), 15.0, 10.4, 0.5))
        assertFalse(hitTest(listOf(POLY), 15.0, 8.0, 0.5))
    }
}
