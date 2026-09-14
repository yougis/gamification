package com.geoplay.player

import android.app.Application
import android.util.Log
import androidx.room.Room
import com.geoplay.player.data.GameDatabase
import com.geoplay.player.data.GameRepository
import com.geoplay.player.data.PackManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class GeoPlayApplication : Application() {

    private var database: GameDatabase? = null

    override fun onCreate() {
        super.onCreate()
        database = Room.databaseBuilder(this, GameDatabase::class.java, "geoplay.db")
            .fallbackToDestructiveMigration()
            .build()
        copyReferencePackIfNeeded()
    }

    private fun copyReferencePackIfNeeded() {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val packManager = PackManager.getInstance(this@GeoPlayApplication)
                val packs = packManager.getInstalledPacks()
                if ("reference-5poi" !in packs) {
                    try {
                        assets.open("reference-5poi.json").use { inputStream ->
                            val result = packManager.importPack(inputStream) { }
                            if (!result.isValid) {
                                Log.w("GeoPlay", "Pack ref non importé: ${result.errors}")
                            }
                        }
                    } catch (e: Exception) {
                        Log.w("GeoPlay", "Pack ref absent des assets", e)
                    }
                }
            } catch (e: Exception) {
                Log.w("GeoPlay", "Init pack ref impossible", e)
            }
        }
    }

    val databaseInstance: GameDatabase
        get() = database!!

    val repository: GameRepository by lazy {
        GameRepository(databaseInstance.gameDao(), this)
    }
}
