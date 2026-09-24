package com.geoplay.shared.db

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Minimal common entity proving Room KMP codegen works in commonMain.
 * The full game schema (sessions, draws, events, inventory) is ported in task 2.4.
 */
@Entity(tableName = "packs")
data class PackEntity(
    @PrimaryKey val packId: String,
    val gameId: String,
    val version: String,
    val installedAt: Long,
)
