package com.geoplay.player

import android.app.Application
import android.util.Log
import androidx.room.Room
import com.geoplay.player.data.GameRepository
import com.geoplay.player.data.PackManager
import com.geoplay.shared.GeoPlayShared
import com.geoplay.shared.db.GeoPlayDatabase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class GeoPlayApplication : Application() {

    private var database: GeoPlayDatabase? = null

    override fun onCreate() {
        super.onCreate()
        Log.i("GeoPlay", "Shared KMP module version: ${GeoPlayShared.VERSION}")
        database = Room.databaseBuilder(this, GeoPlayDatabase::class.java, "geoplay.db")
            .fallbackToDestructiveMigration()
            .build()
        copyReferencePackIfNeeded()
    }

    private fun copyReferencePackIfNeeded() {
        // Catalogue stable (change player-catalogue-stable) : ensemencement
        // unique testé sur le gameId lu (jamais le nom de dossier), avec
        // nettoyage des doublons hérités au premier démarrage. Une suppression
        // volontaire n'est jamais re-créée (drapeau persisté).
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val prefs = getSharedPreferences("geoplay", MODE_PRIVATE)
                if (prefs.getBoolean("seed_reference_done", false)) return@launch
                val packManager = PackManager.getInstance(this@GeoPlayApplication)
                val elimines = packManager.deduplicateInstalledPacks()
                if (elimines > 0) {
                    Log.i("GeoPlay", "Catalogue nettoyé: $elimines doublon(s) supprimé(s)")
                }
                val ids = packManager.listInstalledPacks().map { it.gameId }.toSet()
                if ("reference-5poi" in ids) {
                    prefs.edit().putBoolean("seed_reference_done", true).apply()
                    return@launch
                }
                try {
                        assets.open("reference-5poi.json").use { inputStream ->
                            val result = packManager.importPack(inputStream, null)
                        if (!result.isValid) {
                            Log.w("GeoPlay", "Pack ref non importé: ${result.errors}")
                        } else {
                            prefs.edit().putBoolean("seed_reference_done", true).apply()
                        }
                    }
                } catch (e: Exception) {
                    Log.w("GeoPlay", "Pack ref absent des assets", e)
                    prefs.edit().putBoolean("seed_reference_done", true).apply()
                }
            } catch (e: Exception) {
                Log.w("GeoPlay", "Init pack ref impossible", e)
            }
        }
    }

    val databaseInstance: GeoPlayDatabase
        get() = database!!

    val repository: GameRepository by lazy {
        GameRepository(databaseInstance.gameDao(), this)
    }
}
