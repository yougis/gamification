package com.geoplay.shared.pack

import com.geoplay.shared.model.Game
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
data class PackManifest(
    val files: List<ManifestEntry>,
    val version: Int = 1
)

@Serializable
data class ManifestEntry(
    val path: String,
    val version: String,
    val size: Long,
    val sha256: String
)

data class PackVerificationResult(
    val isValid: Boolean,
    val errors: List<String> = emptyList(),
    val progressPercent: Float = 0f,
    val missingFiles: List<String> = emptyList(),
    val corruptedFiles: List<String> = emptyList()
)

/** JSON GeoPlay partagé : clés inconnues ignorées, valeurs contraintes (miroir Studio). */
val GeoPlayJson = Json { ignoreUnknownKeys = true; coerceInputValues = true }
/** Lit un game.json (lève une exception si invalide). */
fun parseGameJson(text: String): Game =
    GeoPlayJson.decodeFromString(Game.serializer(), text)

/** Lit un manifest.json (lève une exception si invalide). */
fun parseManifest(text: String): PackManifest =
    GeoPlayJson.decodeFromString(PackManifest.serializer(), text)

fun encodeManifest(manifest: PackManifest): String =
    GeoPlayJson.encodeToString(PackManifest.serializer(), manifest)

/** Construit le manifest d'un pack mono-fichier (import game.json seul). */
fun buildSingleFileManifest(game: Game, fileBytes: ByteArray): PackManifest =
    PackManifest(
        files = listOf(
            ManifestEntry(
                path = "game.json",
                version = game.schemaVersion,
                size = fileBytes.size.toLong(),
                sha256 = Sha256.hex(fileBytes),
            )
        ),
        version = 1
    )

private const val BASE64_ALPHABET =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

// Décodeur base64 pur Kotlin (change player-pwa-shell) : le web lit les
// assets binaires via FileReader data-URL, sans typed arrays JS.
fun decodeBase64(s: String): ByteArray {
    val clean = s.filter { it == '=' || it in BASE64_ALPHABET }
    require(clean.length % 4 == 0) { "base64 invalide" }
    val out = ByteArray(clean.length * 3 / 4 - (if (clean.endsWith("==")) 2 else if (clean.endsWith("=")) 1 else 0))
    var o = 0
    var i = 0
    while (i < clean.length) {
        val b0 = BASE64_ALPHABET.indexOf(clean[i])
        val b1 = BASE64_ALPHABET.indexOf(clean[i + 1])
        val b2 = if (clean[i + 2] == '=') 0 else BASE64_ALPHABET.indexOf(clean[i + 2])
        val b3 = if (clean[i + 3] == '=') 0 else BASE64_ALPHABET.indexOf(clean[i + 3])
        require(b0 >= 0 && b1 >= 0)
        out[o++] = ((b0 shl 2) or (b1 shr 4)).toByte()
        if (o < out.size) out[o++] = ((b1 shl 4) or (b2 shr 2)).toByte()
        if (o < out.size) out[o++] = ((b2 shl 6) or b3).toByte()
        i += 4
    }
    return out
}
