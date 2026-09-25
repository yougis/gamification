package com.geoplay.shared.pack

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class PackImportCommonTest {

    @Test
    fun sha256KnownVectors() {
        // Vecteurs FIPS 180-4.
        assertEquals(
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
            Sha256.hex("abc"),
        )
        assertEquals(
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            Sha256.hex(""),
        )
    }

    @Test
    fun verifyAcceptsIntactPack() {
        val gameJson = """{"gameId":"t","nodes":[]}"""
        val bytes = gameJson.encodeToByteArray()
        val manifest = PackManifest(
            files = listOf(ManifestEntry("game.json", "1.0.0", bytes.size.toLong(), Sha256.hex(bytes))),
        )
        val result = verifyPackFiles(manifest, mapOf("game.json" to bytes))
        assertTrue(result.isValid)
        assertEquals(1f, result.progressPercent)
        assertTrue(result.errors.isEmpty())
    }

    @Test
    fun verifyRejectsMissingAndCorrupted() {
        val okBytes = "contenu-ok".encodeToByteArray()
        val manifest = PackManifest(
            files = listOf(
                ManifestEntry("game.json", "1.0.0", okBytes.size.toLong(), Sha256.hex(okBytes)),
                ManifestEntry("absent.png", "1", 10L, "00".repeat(32)),
            ),
        )
        // Fichier manquant + contenu altéré (même taille, SHA différent).
        val tampered = "contenu-KO".encodeToByteArray()
        val result = verifyPackFiles(manifest, mapOf("game.json" to tampered))
        assertFalse(result.isValid)
        assertEquals(listOf("absent.png"), result.missingFiles)
        assertEquals(listOf("game.json"), result.corruptedFiles)
        assertTrue(result.errors.size == 2)
    }

    @Test
    fun verifyPackJsonAcceptsTextManifest() {
        val gameJson = """{"gameId":"t","nodes":[]}"""
        val bytes = gameJson.encodeToByteArray()
        val manifest = PackManifest(
            files = listOf(ManifestEntry("game.json", "1.0.0", bytes.size.toLong(), Sha256.hex(bytes))),
        )
        val result = verifyPackJson(encodeManifest(manifest), mapOf("game.json" to bytes))
        assertTrue(result.isValid)
        assertTrue(result.errors.isEmpty())
    }

    @Test
    fun verifyPackJsonNeverThrowsOnGarbage() {
        val result = verifyPackJson("ceci n'est pas du json {{{", emptyMap())
        assertFalse(result.isValid)
        assertTrue(result.errors.size == 1)
        assertTrue(result.errors[0].startsWith("Manifest illisible:"))
    }

    @Test
    fun singleFileManifestRoundTrip() {
        val gameJson = """{"gameId":"roundtrip","schemaVersion":"1.0.0","nodes":[]}"""
        val game = parseGameJson(gameJson)
        assertEquals("roundtrip", game.gameId)
        val manifest = buildSingleFileManifest(game, gameJson.encodeToByteArray())
        assertEquals(1, manifest.files.size)
        assertEquals("game.json", manifest.files[0].path)
        val reparsed = parseManifest(encodeManifest(manifest))
        assertEquals(manifest, reparsed)
        assertTrue(verifyPackFiles(reparsed, mapOf("game.json" to gameJson.encodeToByteArray())).isValid)
    }

    @Test
    fun decodeBase64Vectors() {
        assertEquals(listOf<Byte>(1, 2, 3), decodeBase64("AQID").toList())
        assertEquals("ab", decodeBase64("YWI=").decodeToString())
        assertEquals("abc", decodeBase64("YWJj").decodeToString())
        assertEquals(0, decodeBase64("").size)
        assertEquals(255, decodeBase64("/w==")[0].toInt() and 0xFF)
    }
}
