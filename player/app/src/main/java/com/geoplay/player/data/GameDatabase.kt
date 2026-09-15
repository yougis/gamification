package com.geoplay.player.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.geoplay.player.data.Converters
import com.geoplay.player.model.*

@Database(
    entities = [
        GameProgressEntity::class,
        NodeCompletionEntity::class,
        RandomDrawEntity::class,
        ScoreEntity::class,
        SessionEntity::class,
        HoldJournalEntity::class,
        InventoryEntity::class
    ],
    version = 1,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class GameDatabase : RoomDatabase() {
    abstract fun gameDao(): GameDao

    companion object {
        @Volatile
        private var INSTANCE: GameDatabase? = null

        fun getInstance(context: Context): GameDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    GameDatabase::class.java,
                    "geoplay.db"
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}