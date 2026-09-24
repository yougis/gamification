package com.geoplay.shared.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface PackDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPack(pack: PackEntity)

    @Query("SELECT * FROM packs WHERE packId = :packId")
    suspend fun getPack(packId: String): PackEntity?

    @Query("SELECT * FROM packs ORDER BY installedAt DESC")
    suspend fun getAllPacks(): List<PackEntity>
}
