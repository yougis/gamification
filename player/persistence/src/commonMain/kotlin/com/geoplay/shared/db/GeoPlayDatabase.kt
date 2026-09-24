package com.geoplay.shared.db

import androidx.room.ConstructedBy
import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.RoomDatabaseConstructor
import androidx.room.TypeConverters
import com.geoplay.shared.model.GameProgressEntity
import com.geoplay.shared.model.HoldJournalEntity
import com.geoplay.shared.model.InventoryEntity
import com.geoplay.shared.model.NodeCompletionEntity
import com.geoplay.shared.model.RandomDrawEntity
import com.geoplay.shared.model.ScoreEntity
import com.geoplay.shared.model.SessionEntity

/**
 * Shared game database (Room KMP).
 *
 * Ported from the Android-only GameDatabase (task 2.1): same entities, same
 * version, same converters — only the package changed. Entities and DAO live
 * in the same module because Room KSP cannot resolve entity classes across
 * a KMP-module boundary with the current toolchain.
 *
 * Platform instantiation (SQLite driver) is wired in phase 3; Android call
 * sites use androidx.room.Room.databaseBuilder directly for now.
 */
@Database(
    entities = [
        PackEntity::class,
        GameProgressEntity::class,
        NodeCompletionEntity::class,
        RandomDrawEntity::class,
        ScoreEntity::class,
        SessionEntity::class,
        HoldJournalEntity::class,
        InventoryEntity::class,
    ],
    version = 1,
    exportSchema = false,
)
@TypeConverters(Converters::class)
@ConstructedBy(GeoPlayDatabaseConstructor::class)
abstract class GeoPlayDatabase : RoomDatabase() {
    abstract fun packDao(): PackDao
    abstract fun gameDao(): GameDao
}

/**
 * Platform instantiation hook (generated actual by Room).
 * iOS actual arrives in task 3.3; until then the missing actual is
 * explicitly tolerated (POC phase 1).
 */
@Suppress("NO_ACTUAL_FOR_EXPECT")
expect object GeoPlayDatabaseConstructor : RoomDatabaseConstructor<GeoPlayDatabase>
