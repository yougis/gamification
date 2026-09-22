package com.geoplay.shared.providers

// Stubs Android (change player-kmp-migration, 3.2) : valeurs par défaut avec
// flag de repli. Aucune logique métier ici — pure traduction vers constantes.
actual fun defaultLocationProvider(): LocationProvider = object : LocationProvider {
    override fun currentPosition(): GpsFix = GpsFix(lat = 48.8566, lng = 2.3522, accuracyM = 999f, fallback = true)
}

actual fun defaultCompassProvider(): CompassProvider = object : CompassProvider {
    override fun currentHeading(): CompassHeading = CompassHeading(degrees = 0f, fallback = true)
}

actual fun defaultCameraProvider(): CameraProvider = object : CameraProvider {
    override fun cameraAvailability(): CameraAvailability =
        CameraAvailability(available = false, reason = "module natif non chargé")
}

actual fun defaultBleProvider(): BleProvider = object : BleProvider {
    override fun scanResults(): BleScanResult = BleScanResult(devices = emptyList(), fallback = true)
}

actual fun defaultKioskProvider(): KioskProvider = object : KioskProvider {
    override fun kioskState(): KioskState = KioskState(locked = false, fallback = true)
}
