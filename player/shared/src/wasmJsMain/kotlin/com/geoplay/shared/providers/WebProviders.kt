package com.geoplay.shared.providers

import kotlin.js.JsAny

// Actuals navigateur (change player-pwa-shell, 1.1) : traduction vers les API
// web — Geolocation (premier plan uniquement), DeviceOrientation, stockage
// local. Pas de GPS de fond, pas de BLE, pas de verrouillage OS côté web
// (limites plateforme actées, voir matrice player-compatibility).
// Les interfaces étant synchrones, les actuals exposent la dernière valeur
// connue (mise à jour par écouteurs) ou un repli explicite.

// --- Déclarations externes minimales (sans kotlinx-browser) ---

private external interface GeolocationPosition : JsAny {
    val coords: GeolocationCoordinates
}

private external interface GeolocationCoordinates : JsAny {
    val latitude: Double
    val longitude: Double
    val accuracy: Double
}

private external interface GeolocationApi : JsAny {
    fun watchPosition(success: (GeolocationPosition) -> Unit, error: () -> Unit)
}

private external interface NavigatorApi : JsAny {
    val geolocation: GeolocationApi?
}

private external interface OrientationEvent : JsAny {
    val alpha: Double?
}

private external interface WindowApi : JsAny {
    fun addEventListener(type: String, listener: (OrientationEvent) -> Unit)
    val localStorage: StorageArea?
}

private external interface StorageArea : JsAny {
    fun getItem(key: String): String?
    fun setItem(key: String, value: String)
    fun removeItem(key: String)
}

private external interface PermissionPromise : JsAny {
    fun then(onOk: () -> Unit, onErr: () -> Unit)
}

private external interface OrientationWithPermission : JsAny {
    fun requestPermission(): PermissionPromise
}

private external val navigator: NavigatorApi
private external val window: WindowApi
private external val DeviceOrientationEvent: JsAny?

// --- État dernier-connu (écouteurs enregistrés une fois) ---

private var lastFix: GpsFix = GpsFix(0.0, 0.0, Float.MAX_VALUE, fallback = true)
private var lastHeading: CompassHeading = CompassHeading(0f, fallback = true)
private var watchersStarted = false

private fun ensureWatchers() {
    if (watchersStarted) return
    watchersStarted = true
    try {
        navigator.geolocation?.watchPosition(
            success = { pos ->
                lastFix = GpsFix(
                    lat = pos.coords.latitude,
                    lng = pos.coords.longitude,
                    accuracyM = pos.coords.accuracy.toFloat(),
                    fallback = false,
                )
            },
            error = { lastFix = lastFix.copy(fallback = true) },
        )
    } catch (_: Exception) {
        // Geolocation indisponible : repli conservé.
    }
    try {
        window.addEventListener("deviceorientation") { ev ->
            val alpha = ev.alpha
            lastHeading = if (alpha != null) CompassHeading(alpha.toFloat(), fallback = false)
            else lastHeading.copy(fallback = true)
        }
    } catch (_: Exception) {
        // Événement indisponible : repli conservé.
    }
}

// Demande de permission boussole (Safari iOS l'exige sur geste utilisateur).
// Hors contrat commun : à appeler depuis un bouton de la coquille web.
fun requestCompassPermission(onResult: (Boolean) -> Unit) {
    try {
        val doe = DeviceOrientationEvent as? OrientationWithPermission
        if (doe == null) {
            onResult(true)
            return
        }
        doe.requestPermission().then(
            onOk = { onResult(true) },
            onErr = { onResult(false) },
        )
    } catch (_: Exception) {
        onResult(false)
    }
}

actual fun defaultLocationProvider(): LocationProvider = object : LocationProvider {
    init {
        ensureWatchers()
    }

    override fun currentPosition(): GpsFix = lastFix
}

actual fun defaultCompassProvider(): CompassProvider = object : CompassProvider {
    init {
        ensureWatchers()
    }

    override fun currentHeading(): CompassHeading = lastHeading
}

actual fun defaultCameraProvider(): CameraProvider = object : CameraProvider {
    override fun cameraAvailability(): CameraAvailability =
        CameraAvailability(available = false, reason = "WebXR indisponible : fallback 2D")
}

actual fun defaultBleProvider(): BleProvider = object : BleProvider {
    override fun scanResults(): BleScanResult = BleScanResult(devices = emptyList(), fallback = true)
}

actual fun defaultKioskProvider(): KioskProvider = object : KioskProvider {
    override fun kioskState(): KioskState = KioskState(locked = false, fallback = true)
}

// Stockage clé-valeur web (design D2) : utilisé par la coquille PWA pour
// progression/tirages/events/inventaire, écriture immédiate.
object WebStorage {
    fun get(key: String): String? = try {
        window.localStorage?.getItem(key)
    } catch (_: Exception) {
        null
    }

    fun set(key: String, value: String) {
        try {
            window.localStorage?.setItem(key, value)
        } catch (_: Exception) {
            // Quota dépassé ou stockage indisponible : l'appelant dégrade.
        }
    }

    fun remove(key: String) {
        try {
            window.localStorage?.removeItem(key)
        } catch (_: Exception) {
            // Ignoré : suppression best-effort.
        }
    }
}
