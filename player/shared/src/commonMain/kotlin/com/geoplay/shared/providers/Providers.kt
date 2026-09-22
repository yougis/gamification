package com.geoplay.shared.providers

// Contrats capteurs du runtime (change player-kmp-migration, 3.1).
// Principe kmp-native-boundary : le contrat vit UNE fois en commonMain ;
// chaque `actual` ne fait que traduire vers l'API plateforme (ici : stubs
// qui retournent des valeurs par défaut avec flag de repli, en attendant les
// modules natifs). Note : Kotlin interdit `expect interface` — les interfaces
// vivent en common, seules les fabriques sont `expect` (voir NOTE tâche 3.1).

data class GpsFix(val lat: Double, val lng: Double, val accuracyM: Float, val fallback: Boolean = false)

data class CompassHeading(val degrees: Float, val fallback: Boolean = false)

data class CameraAvailability(val available: Boolean, val reason: String = "")

data class BleScanResult(val devices: List<String> = emptyList(), val fallback: Boolean = true)

data class KioskState(val locked: Boolean, val fallback: Boolean = true)

interface LocationProvider {
    fun currentPosition(): GpsFix
}

interface CompassProvider {
    fun currentHeading(): CompassHeading
}

interface CameraProvider {
    fun cameraAvailability(): CameraAvailability
}

interface BleProvider {
    fun scanResults(): BleScanResult
}

interface KioskProvider {
    fun kioskState(): KioskState
}

expect fun defaultLocationProvider(): LocationProvider
expect fun defaultCompassProvider(): CompassProvider
expect fun defaultCameraProvider(): CameraProvider
expect fun defaultBleProvider(): BleProvider
expect fun defaultKioskProvider(): KioskProvider
