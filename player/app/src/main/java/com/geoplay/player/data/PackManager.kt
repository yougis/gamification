package com.geoplay.player.data

import android.content.Context
import android.util.Log
import com.geoplay.shared.model.Game
import com.geoplay.shared.pack.ManifestEntry
import com.geoplay.shared.pack.PackManifest
import com.geoplay.shared.pack.PackVerificationResult
import com.geoplay.shared.pack.Sha256
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipInputStream

class PackManager private constructor(private val context: Context) {

    companion object {
        @Volatile
        private var INSTANCE: PackManager? = null

        fun getInstance(context: Context): PackManager {
            return INSTANCE ?: synchronized(this) {
                val instance = PackManager(context.applicationContext)
                INSTANCE = instance
                instance
            }
        }

        // Helpers purs du catalogue (change studio-game-catalog) : testés.
        fun normalizeCode(raw: String): String = raw.filter { it.isDigit() }.take(4)

        fun catalogPackUrl(baseUrl: String, code: String): String =
            "${baseUrl.trimEnd('/')}/games/$code"

        fun catalogAssetUrl(baseUrl: String, code: String, path: String): String =
            "${baseUrl.trimEnd('/')}/games/$code/assets/$path"
    }

    private val json = Json { ignoreUnknownKeys = true; coerceInputValues = true }

    suspend fun importPack(
        inputStream: InputStream,
        onProgress: ((Float) -> Unit)? = null
    ): PackVerificationResult {
        return withContext(Dispatchers.IO) {
            // Lecture tamponnee pour detecter ZIP vs JSON seul (borne sideload : fichier .zip ou game.json).
            val buffered = inputStream.buffered()
            buffered.mark(4)
            val magic = ByteArray(4)
            val read = buffered.read(magic, 0, 4)
            buffered.reset()
            val isZip = read >= 4 && magic[0] == 0x50.toByte() && magic[1] == 0x4B.toByte()

            if (!isZip) {
                return@withContext importSingleGameJson(buffered, onProgress)
            }

            val tempDir = File(context.cacheDir, "pack_import_${System.currentTimeMillis()}")
            tempDir.mkdirs()

            try {
                extractZip(buffered, tempDir)

                // Le manifest fait foi (offline-pack) : jamais reconstruit.
                val manifestFile = File(tempDir, "manifest.json")
                if (!manifestFile.exists()) {
                    return@withContext PackVerificationResult(
                        isValid = false,
                        errors = listOf("Manifest manquant: manifest.json"),
                        progressPercent = 0f,
                        missingFiles = listOf("manifest.json")
                    )
                }
                val manifest = try {
                    json.decodeFromString(PackManifest.serializer(), manifestFile.readText())
                } catch (e: Exception) {
                    return@withContext PackVerificationResult(
                        isValid = false,
                        errors = listOf("Manifest illisible: ${e.message}"),
                        progressPercent = 0f
                    )
                }

                if (manifest.files.isEmpty()) {
                    return@withContext PackVerificationResult(
                        isValid = false,
                        errors = listOf("Manifest vide ou invalide")
                    )
                }

                val verification = verifyFiles(manifest, tempDir, onProgress)

                if (!verification.isValid) {
                    // Gating : pack partiel/corrompu jamais installe.
                    return@withContext verification
                }

                val finalDir = File(context.filesDir, "packs/${System.currentTimeMillis()}")
                finalDir.mkdirs()
                copyFiles(tempDir, finalDir)
                // Le manifest source est deja copie via copyFiles ; pas de re-generation.

                PackVerificationResult(isValid = true, progressPercent = 1f)
            } catch (e: Exception) {
                Log.e("PackManager", "Import failed", e)
                PackVerificationResult(isValid = false, errors = listOf(e.message ?: "Erreur inconnue"))
            } finally {
                deleteRecursive(tempDir)
            }
        }
    }

    suspend fun importPackFromUrl(
        url: String,
        onProgress: ((Float) -> Unit)? = null
    ): PackVerificationResult {        return withContext(Dispatchers.IO) {
            var connection: java.net.HttpURLConnection? = null
            try {
                connection = (java.net.URL(url).openConnection() as java.net.HttpURLConnection).apply {
                    connectTimeout = 15000
                    readTimeout = 30000
                    instanceFollowRedirects = true
                }
                connection.connect()
                if (connection.responseCode !in 200..299) {
                    return@withContext PackVerificationResult(
                        isValid = false,
                        errors = listOf("Telechargement refuse: HTTP ${connection.responseCode}")
                    )
                }
                connection.inputStream.use { stream ->
                    importPack(stream, onProgress)
                }
            } catch (e: Exception) {
                Log.e("PackManager", "Download failed: $url", e)
                PackVerificationResult(isValid = false, errors = listOf(e.message ?: "Telechargement impossible"))
            } finally {
                connection?.disconnect()
            }
        }
    }

    // Import depuis le catalogue (change studio-game-catalog) : GET du pack
    // puis des assets un par un, vérification manifest existante (le service
    // n'est qu'un transport). Asset absent = pack partiel refusé, jamais installé.
    suspend fun importPackFromCatalog(
        baseUrl: String,
        code: String,
        onProgress: ((Float) -> Unit)? = null
    ): PackVerificationResult {
        return withContext(Dispatchers.IO) {
            val tempDir = File(context.cacheDir, "pack_catalog_${System.currentTimeMillis()}")
            tempDir.mkdirs()
            try {
                val packUrl = catalogPackUrl(baseUrl, code)
                val packText = httpGet(packUrl)
                    ?: return@withContext PackVerificationResult(
                        isValid = false,
                        errors = listOf("code inconnu")
                    )
                val root = try {
                    json.parseToJsonElement(packText).jsonObject
                } catch (e: Exception) {
                    return@withContext PackVerificationResult(
                        isValid = false,
                        errors = listOf("Pack illisible: ${e.message}")
                    )
                }
                val gameText = root["gameJson"]?.jsonPrimitive?.content
                    ?: return@withContext PackVerificationResult(
                        isValid = false,
                        errors = listOf("Pack illisible: gameJson absent")
                    )
                val manifest = try {
                    val manifestEl = root["manifest"]
                        ?: return@withContext PackVerificationResult(
                            isValid = false,
                            errors = listOf("Pack illisible: manifest absent")
                        )
                    json.decodeFromJsonElement(PackManifest.serializer(), manifestEl)
                } catch (e: Exception) {
                    return@withContext PackVerificationResult(
                        isValid = false,
                        errors = listOf("Manifest illisible: ${e.message}")
                    )
                }
                File(tempDir, "game.json").writeText(gameText)
                // Réutilisation si déjà vérifié : même game.json + même manifest
                // déjà installés → pas de re-téléchargement des assets.
                if (findIdenticalPack(gameText, manifest) != null) {
                    onProgress?.invoke(1f)
                    return@withContext PackVerificationResult(isValid = true, progressPercent = 1f)
                }
                val assets = manifest.files.filter { it.path != "game.json" }
                assets.forEachIndexed { i, entry ->
                    val bytes = httpGetBytes(catalogAssetUrl(baseUrl, code, entry.path))
                    if (bytes != null) {
                        val dest = File(tempDir, entry.path)
                        dest.parentFile?.mkdirs()
                        dest.writeBytes(bytes)
                    }
                    onProgress?.invoke((i + 1).toFloat() / (assets.size + 1).coerceAtLeast(1))
                }
                val verification = verifyFiles(manifest, tempDir, onProgress)
                if (!verification.isValid) {
                    return@withContext verification
                }
                val finalDir = File(context.filesDir, "packs/${System.currentTimeMillis()}")
                finalDir.mkdirs()
                copyFiles(tempDir, finalDir)
                PackVerificationResult(isValid = true, progressPercent = 1f)
            } catch (e: Exception) {
                Log.e("PackManager", "Catalog import failed", e)
                PackVerificationResult(isValid = false, errors = listOf(e.message ?: "Import impossible"))
            } finally {
                deleteRecursive(tempDir)
            }
        }
    }

    // Cherche un pack installé byte-identique (game.json + manifest) : le
    // service n'étant qu'un transport, un pack déjà vérifié est réutilisé.
    private fun findIdenticalPack(gameText: String, manifest: PackManifest): File? {
        val packsDir = File(context.filesDir, "packs")
        return packsDir.listFiles()
            ?.filter { it.isDirectory }
            ?.firstOrNull { dir ->
                val installedGame = File(dir, "game.json")
                installedGame.isFile && installedGame.readText() == gameText &&
                    loadManifest(dir) == manifest
            }
    }

    private fun httpGet(url: String): String? {
        var connection: java.net.HttpURLConnection? = null
        try {
            connection = (java.net.URL(url).openConnection() as java.net.HttpURLConnection).apply {
                connectTimeout = 15000
                readTimeout = 30000
                instanceFollowRedirects = true
            }
            connection.connect()
            if (connection.responseCode == 404) return null
            if (connection.responseCode !in 200..299) {
                throw IllegalStateException("Telechargement refuse: HTTP ${connection.responseCode}")
            }
            return connection.inputStream.bufferedReader().use { it.readText() }
        } finally {
            connection?.disconnect()
        }
    }

    private fun httpGetBytes(url: String): ByteArray? {
        var connection: java.net.HttpURLConnection? = null
        try {
            connection = (java.net.URL(url).openConnection() as java.net.HttpURLConnection).apply {
                connectTimeout = 15000
                readTimeout = 30000
                instanceFollowRedirects = true
            }
            connection.connect()
            if (connection.responseCode !in 200..299) return null
            return connection.inputStream.use { it.readBytes() }
        } catch (e: Exception) {
            Log.w("PackManager", "Asset 404/illisible: $url", e)
            return null
        } finally {
            connection?.disconnect()
        }
    }

    private suspend fun importSingleGameJson(
        stream: InputStream,
        onProgress: ((Float) -> Unit)?
    ): PackVerificationResult {
        return withContext(Dispatchers.IO) {
            try {
                val text = stream.bufferedReader().use { it.readText() }
                val game = json.decodeFromString(Game.serializer(), text)
                onProgress?.invoke(0.5f)
                val packDir = File(context.filesDir, "packs/${game.gameId}_${System.currentTimeMillis()}")
                packDir.mkdirs()
                val gameFile = File(packDir, "game.json")
                gameFile.writeText(text)
                val manifest = PackManifest(
                    files = listOf(
                        ManifestEntry(
                            path = "game.json",
                            version = game.schemaVersion,
                            size = gameFile.length(),
                            sha256 = computeSha256(gameFile)
                        )
                    ),
                    version = 1
                )
                saveManifest(manifest, packDir)
                onProgress?.invoke(1f)
                PackVerificationResult(isValid = true, progressPercent = 1f)
            } catch (e: Exception) {
                Log.e("PackManager", "game.json illisible", e)
                PackVerificationResult(isValid = false, errors = listOf("Fichier invalide: ${e.message}"))
            }
        }
    }

    private fun extractZip(
        inputStream: InputStream,
        destDir: File
    ) {
        ZipInputStream(inputStream).use { zipInputStream ->
            var entry: ZipEntry? = zipInputStream.nextEntry
            while (entry != null) {
                val current = entry
                // Anti zip-slip : borne associative, fichier potentiellement hostile.
                val file = File(destDir, current.name).canonicalFile
                require(file.path.startsWith(destDir.canonicalPath)) { "Entree ZIP hors pack: " + current.name }
                if (current.isDirectory) {
                    file.mkdirs()
                } else {
                    file.parentFile?.mkdirs()
                    FileOutputStream(file).use { outputStream ->
                        val buffer = ByteArray(8192)
                        var len = zipInputStream.read(buffer)
                        while (len != -1) {
                            outputStream.write(buffer, 0, len)
                            len = zipInputStream.read(buffer)
                        }
                    }
                }
                zipInputStream.closeEntry()
                entry = zipInputStream.nextEntry
            }
        }
    }

    private fun verifyFiles(
        manifest: PackManifest,
        packDir: File,
        onProgress: ((Float) -> Unit)? = null
    ): PackVerificationResult {
        val errors = mutableListOf<String>()
        val missingFiles = mutableListOf<String>()
        val corruptedFiles = mutableListOf<String>()
        var verifiedBytes = 0L
        val totalBytes = manifest.files.sumOf { it.size }.coerceAtLeast(1L)

        manifest.files.forEachIndexed { index, entry ->
            val file = File(packDir, entry.path)
            if (!file.exists() || !file.isFile) {
                missingFiles.add(entry.path)
                errors.add("Fichier manquant: ${entry.path}")
            } else if (file.length() != entry.size) {
                corruptedFiles.add(entry.path)
                errors.add("Fichier corrompu (taille): ${entry.path}")
            } else {
                val sha256 = computeSha256(file)
                if (sha256 != entry.sha256.lowercase()) {
                    corruptedFiles.add(entry.path)
                    errors.add("Fichier corrompu (SHA-256): ${entry.path}")
                } else {
                    verifiedBytes += entry.size
                }
            }
            onProgress?.invoke((index + 1).toFloat() / manifest.files.size * (if (errors.isEmpty()) 1f else verifiedBytes.toFloat() / totalBytes))
        }

        val progress = if (totalBytes > 0) verifiedBytes.toFloat() / totalBytes else 1f
        val isValid = errors.isEmpty()

        return PackVerificationResult(
            isValid = isValid,
            errors = errors,
            progressPercent = progress,
            missingFiles = missingFiles,
            corruptedFiles = corruptedFiles
        )
    }

    private fun computeSha256(file: File): String {
        // Implémentation unique côté partagé (KMP) : même code sur Android et iOS.
        return Sha256.hex(file.readBytes())
    }

    private fun saveManifest(manifest: PackManifest, packDir: File) {
        val jsonString = json.encodeToString(PackManifest.serializer(), manifest)
        File(packDir, "manifest.json").writeText(jsonString)
    }

    private fun loadManifest(packDir: File): PackManifest? {
        val file = File(packDir, "manifest.json")
        if (!file.exists()) return null
        return try {
            json.decodeFromString(PackManifest.serializer(), file.readText())
        } catch (e: Exception) {
            Log.w("PackManager", "Manifest illisible: ${file.path}", e)
            null
        }
    }

    private fun copyFiles(srcDir: File, destDir: File) {
        if (!srcDir.exists()) return
        srcDir.walkTopDown().forEach { file ->
            val relativePath = srcDir.toPath().relativize(file.toPath()).toString()
            if (relativePath.isEmpty()) return@forEach
            val destFile = File(destDir, relativePath)
            if (file.isDirectory) {
                destFile.mkdirs()
            } else {
                destFile.parentFile?.mkdirs()
                file.copyTo(destFile, overwrite = true)
            }
        }
    }

    private fun deleteRecursive(file: File) {
        if (file.isDirectory) {
            file.listFiles()?.forEach { deleteRecursive(it) }
        }
        file.delete()
    }

    suspend fun getInstalledPacks(): List<String> {
        return withContext(Dispatchers.IO) {
            val packsDir = File(context.filesDir, "packs")
            packsDir.listFiles()?.filter { it.isDirectory }?.map { it.name } ?: emptyList()
        }
    }

    suspend fun loadPack(packName: String): Game? {
        return withContext(Dispatchers.IO) {
            val packDir = File(context.filesDir, "packs/$packName")
            val gameFile = File(packDir, "game.json")
            if (!gameFile.exists()) return@withContext null
            try {
                json.decodeFromString(Game.serializer(), gameFile.readText())
            } catch (e: Exception) {
                Log.w("PackManager", "game.json illisible", e)
                null
            }
        }
    }
}
