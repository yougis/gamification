package com.geoplay.player

import com.geoplay.player.data.PackManager
import org.junit.Assert.*
import org.junit.Test

// Preuve 2.2 (change studio-game-catalog) : normalisation du code et
// construction des URLs catalogue (testé sans réseau).
class CatalogImportTest {

    @Test
    fun normalizeCodeKeepsFourDigits() {
        assertEquals("4217", PackManager.normalizeCode("4217"))
        assertEquals("4217", PackManager.normalizeCode(" 42-17\n"))
        assertEquals("007", PackManager.normalizeCode("007"))
        assertEquals("", PackManager.normalizeCode("abcd"))
    }

    @Test
    fun catalogPackUrlJoinsBaseAndCode() {
        assertEquals(
            "https://catalogue.exemple.fr/games/4217",
            PackManager.catalogPackUrl("https://catalogue.exemple.fr/", "4217")
        )
        assertEquals(
            "https://catalogue.exemple.fr/games/4217",
            PackManager.catalogPackUrl("https://catalogue.exemple.fr", "4217")
        )
    }

    @Test
    fun catalogAssetUrlJoinsSegments() {
        assertEquals(
            "https://catalogue.exemple.fr/games/4217/assets/img/logo.png",
            PackManager.catalogAssetUrl("https://catalogue.exemple.fr", "4217", "img/logo.png")
        )
    }
}
