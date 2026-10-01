package com.geoplay.shared.providers

import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import android.os.Looper

// Fournisseurs Android (change player-kmp-migration, 3.2, puis
// player-android-compose) : pure traduction vers les API plateforme, aucune
// logique métier. La position vient du LocationManager quand l'app l'a
// initialisé, sinon repli fixe (même contrat que les autres plateformes).

@Volatile
private var dernierFix: GpsFix? = null

private val ecouteur = object : LocationListener {
    override fun onLocationChanged(location: Location) {
        dernierFix = GpsFix(
            lat = location.latitude,
            lng = location.longitude,
            accuracyM = if (location.hasAccuracy()) location.accuracy else 999f,
            fallback = false
        )
    }
    @Deprecated("deprecated")
    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) = Unit
}

/** À appeler depuis l'app (ex. Application ou fragment) quand la permission
 * de localisation est accordée. Sans appel : repli fixe historique. */
fun initLocalisationAndroid(context: Context) {
    try {
        val manager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
        val ctx = context.applicationContext
        val permission = androidx.core.content.ContextCompat.checkSelfPermission(
            ctx, android.Manifest.permission.ACCESS_FINE_LOCATION
        ) == android.content.pm.PackageManager.PERMISSION_GRANTED
        if (!permission) return
        for (fournisseur in listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER)) {
            try {
                if (!manager.isProviderEnabled(fournisseur)) continue
                @SuppressLint("MissingPermission")
                val dernier = manager.getLastKnownLocation(fournisseur)
                if (dernier != null && dernierFix == null) {
                    dernierFix = GpsFix(dernier.latitude, dernier.longitude,
                        if (dernier.hasAccuracy()) dernier.accuracy else 999f, fallback = false)
                }
                @SuppressLint("MissingPermission")
                manager.requestLocationUpdates(fournisseur, 5000L, 5f, ecouteur, Looper.getMainLooper())
            } catch (_: Exception) {
                // Fournisseur indisponible : suivant, jamais de crash.
            }
        }
    } catch (_: Exception) {
        // Service indisponible : repli fixe.
    }
}

actual fun defaultLocationProvider(): LocationProvider = object : LocationProvider {
    override fun currentPosition(): GpsFix = dernierFix
        ?: GpsFix(lat = 48.8566, lng = 2.3522, accuracyM = 999f, fallback = true)
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
