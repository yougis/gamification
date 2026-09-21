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
