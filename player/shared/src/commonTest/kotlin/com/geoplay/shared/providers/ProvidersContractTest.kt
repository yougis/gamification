package com.geoplay.shared.providers

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

// Test de contrat des providers (change player-kmp-migration, skill
// kmp-native-boundary) : le comportement est vérifié contre des fakes qui
// implémentent les interfaces communes, indépendamment de la plateforme.
// Les fabriques `default*` (actuals par plateforme) sont vérifiées sur leurs
// valeurs de repli documentées dans la spec kmp-runtime.
private class FakeLocationProvider(val fix: GpsFix) : LocationProvider {
    override fun currentPosition(): GpsFix = fix
}

private class FakeCompassProvider(val heading: CompassHeading) : CompassProvider {
    override fun currentHeading(): CompassHeading = heading
}

class ProvidersContractTest {

    @Test
    fun locationFakeSubstitutable() {
        val fake = FakeLocationProvider(GpsFix(48.01, 2.01, 5f, fallback = false))
        val fix = fake.currentPosition()
        assertEquals(48.01, fix.lat)
        assertFalse(fix.fallback)
    }

    @Test
    fun compassFakeSubstitutable() {
        val fake = FakeCompassProvider(CompassHeading(90f, fallback = false))
        assertEquals(90f, fake.currentHeading().degrees)
    }

    @Test
    fun defaultLocationIsFallback() {
        val fix = defaultLocationProvider().currentPosition()
        assertTrue(fix.fallback)
        assertTrue(fix.accuracyM > 100f)
    }

    @Test
    fun defaultCompassIsZeroFallback() {
        val heading = defaultCompassProvider().currentHeading()
        assertEquals(0f, heading.degrees)
        assertTrue(heading.fallback)
    }

    @Test
    fun defaultCameraUnavailable() {
        assertFalse(defaultCameraProvider().cameraAvailability().available)
    }

    @Test
    fun defaultBleEmptyFallback() {
        val scan = defaultBleProvider().scanResults()
        assertTrue(scan.devices.isEmpty())
        assertTrue(scan.fallback)
    }

    @Test
    fun defaultKioskUnlockedFallback() {
        val state = defaultKioskProvider().kioskState()
        assertFalse(state.locked)
        assertTrue(state.fallback)
    }
}
