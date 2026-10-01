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
        onProgress: ((Float) -> Unit)? = null,
        confirmer: suspend (ApercuDiff) -> Boolean = { true }
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
                android.util.Log.d("GeoPlayDbg", "importPack: JSON seul detecte")
                return@withContext importSingleGameJson(buffered, onProgress, confirmer)
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

                // Unicité + atomique (changes player-catalogue-stable,
                // pack-zip-diff-tuiles) : diff, confirmation, bascule.
                val zipGameId = readGameIdOf(tempDir)
                    ?: return@withContext PackVerificationResult(
                        isValid = false,
                        errors = listOf("game.json illisible ou gameId absent"),
                        progressPercent = 0f
                    )
                return@withContext installerDepuisStaged(zipGameId, tempDir, manifest, emptyList(), confirmer, onProgress)
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
        onProgress: ((Float) -> Unit)? = null,
        confirmer: suspend (ApercuDiff) -> Boolean = { true }
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
                android.util.Log.d("GeoPlayDbg", "importPackFromUrl: HTTP 200, lecture flux")
                connection.inputStream.use { stream ->
                    importPack(stream, onProgress, confirmer)
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
        onProgress: ((Float) -> Unit)? = null,
        confirmer: suspend (ApercuDiff) -> Boolean = { true }
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
                val identical = findIdenticalPack(gameText, manifest)
                if (identical != null) {
                    onProgress?.invoke(1f)
                    touchDir(identical)
                    return@withContext PackVerificationResult(isValid = true, progressPercent = 1f, packName = identical.name)
                }
                // Différentiel (change pack-zip-diff-tuiles) : ne télécharge
                // que les fichiers nouveaux ou modifiés ; les identiques sont
                // repris dans l'ancien dossier à l'installation.
                val catalogueId = try {
                    json.decodeFromString(Game.serializer(), gameText).gameId
                } catch (e: Exception) {
                    return@withContext PackVerificationResult(
                        isValid = false,
                        errors = listOf("game.json illisible: ${e.message}")
                    )
                }
                val ancienMan = findDirByGameId(catalogueId)?.let { loadManifest(it) }
                val anciennes = ancienMan?.files?.associateBy { it.path } ?: emptyMap()
                val recopier = mutableListOf<String>()
                val assets = manifest.files.filter { it.path != "game.json" }
                assets.forEachIndexed { i, entry ->
                    val a = anciennes[entry.path]
                    if (a != null && a.sha256.lowercase() == entry.sha256.lowercase()) {
                        recopier.add(entry.path)
                    } else {
                        val bytes = httpGetBytes(catalogAssetUrl(baseUrl, code, entry.path))
                        if (bytes != null) {
                            val dest = File(tempDir, entry.path)
                            dest.parentFile?.mkdirs()
                            dest.writeBytes(bytes)
                        }
                    }
                    onProgress?.invoke((i + 1).toFloat() / (assets.size + 1).coerceAtLeast(1))
                }
                saveManifest(manifest, tempDir)
                return@withContext installerDepuisStaged(catalogueId, tempDir, manifest, recopier, confirmer, onProgress)
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
        onProgress: ((Float) -> Unit)?,
        confirmer: suspend (ApercuDiff) -> Boolean
    ): PackVerificationResult {
        return withContext(Dispatchers.IO) {
            val staged = File(context.cacheDir, "pack_json_${System.currentTimeMillis()}")
            staged.mkdirs()
            try {
                val text = stream.bufferedReader().use { it.readText() }
                val game = json.decodeFromString(Game.serializer(), text)
                onProgress?.invoke(0.5f)
                val gameFile = File(staged, "game.json")
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
                saveManifest(manifest, staged)
                onProgress?.invoke(1f)
                installerDepuisStaged(game.gameId, staged, manifest, emptyList(), confirmer, onProgress)
            } catch (e: Exception) {
                Log.e("PackManager", "game.json illisible", e)
                PackVerificationResult(isValid = false, errors = listOf("Fichier invalide: ${e.message}"))
            } finally {
                deleteRecursive(staged)
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

    // Unicité par gameId (change player-catalogue-stable) : une entrée par
    // jeu ; seul l'import crée/remplace, jamais le démarrage ni l'ouverture.
    private fun packsRoot() = File(context.filesDir, "packs")

    private fun readGameIdOf(dir: File): String? {
        return try {
            val f = File(dir, "game.json")
            if (!f.isFile) return null
            json.decodeFromString(Game.serializer(), f.readText()).gameId
        } catch (e: Exception) {
            null
        }
    }

    private fun findDirByGameId(gameId: String): File? {
        return packsRoot().listFiles()
            ?.filter { it.isDirectory && readGameIdOf(it) == gameId }
            ?.maxByOrNull { it.lastModified() }
    }

    private fun touchDir(dir: File) {
        val now = System.currentTimeMillis()
        dir.setLastModified(now)
        File(dir, "game.json").setLastModified(now)
    }

    // Migration/nettoyage : un seul dossier par gameId (le plus récent).
    // Retourne le nombre de dossiers supprimés.
    suspend fun deduplicateInstalledPacks(): Int {
        return withContext(Dispatchers.IO) {
            var removed = 0
            val byId = mutableMapOf<String, MutableList<File>>()
            packsRoot().listFiles()?.filter { it.isDirectory }?.forEach { dir ->
                readGameIdOf(dir)?.let { id ->
                    byId.getOrPut(id) { mutableListOf() }.add(dir)
                }
            }
            for ((_, dirs) in byId) {
                if (dirs.size <= 1) continue
                val keep = dirs.maxByOrNull { it.lastModified() }!!
                for (dir in dirs) {
                    if (dir != keep) {
                        deleteRecursive(dir)
                        removed++
                    }
                }
            }
            removed
        }
    }

    suspend fun deletePack(packName: String): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                val dir = File(packsRoot(), packName)
                if (!dir.isDirectory) return@withContext false
                deleteRecursive(dir)
                true
            } catch (e: Exception) {
                Log.w("PackManager", "Suppression impossible: $packName", e)
                false
            }
        }
    }

    // Mise à jour différentielle (change pack-zip-diff-tuiles) : aperçu
    // présenté à l'auteur avant application (taille du delta), jamais
    // appliqué sans confirmation quand le jeu existe déjà.
    data class ApercuDiff(
        val gameId: String,
        val estNouveau: Boolean,
        val ajoutes: Int,
        val modifies: Int,
        val retires: Int,
        val octetsDelta: Long
    )

    // Cohérence manifest ↔ tiles.json (change pack-zip-diff-tuiles) : si le
    // manifest liste tiles.json, chaque tuiles/* du manifest doit figurer à
    // l'index et réciproquement. Écart = refus avec fichier nommé.
    private fun coherenceTuiles(manifest: PackManifest, dir: File): String? {
        if (manifest.files.none { it.path == "tiles.json" }) return null
        return try {
            val racine = org.json.JSONObject(File(dir, "tiles.json").readText())
            val tableau = racine.optJSONArray("tuiles") ?: return "tiles.json sans liste « tuiles »"
            val index = mutableSetOf<String>()
            for (i in 0 until tableau.length()) {
                val t = tableau.getJSONObject(i)
                index.add("tuiles/${t.getInt("z")}/${t.getInt("x")}/${t.getInt("y")}.png")
            }
            val manifestTuiles = manifest.files.map { it.path }.filter { it.startsWith("tuiles/") }.toSet()
            val horsIndex = manifestTuiles - index
            if (horsIndex.isNotEmpty()) return "Tuile hors index : ${horsIndex.first()}"
            val horsManifest = index - manifestTuiles
            if (horsManifest.isNotEmpty()) return "Tuile hors manifest : ${horsManifest.first()}"
            null
        } catch (e: Exception) {
            "tiles.json illisible: ${e.message}"
        }
    }

    // Cœur d'installation (change pack-zip-diff-tuiles) : le dossier `staged`
    // (temporaire, propriété de l'appelant) contient les fichiers du nouveau
    // pack ; `recopier` liste les chemins à reprendre dans l'ancien dossier
    // (déjà vérifiés identiques, ex. assets non retéléchargés du catalogue).
    // Seuls les fichiers du manifest (+ manifest.json) sont installés dans un
    // dossier frais vérifié, puis l'ancien est supprimé (bascule atomique :
    // un échec laisse l'ancien jouable).
    private suspend fun installerDepuisStaged(
        gameId: String,
        staged: File,
        nouveau: PackManifest,
        recopier: List<String>,
        confirmer: suspend (ApercuDiff) -> Boolean,
        onProgress: ((Float) -> Unit)?
    ): PackVerificationResult {
        val ancienDir = findDirByGameId(gameId)
        val ancienMan = ancienDir?.let { loadManifest(it) }
        val anciennes = ancienMan?.files?.associateBy { it.path } ?: emptyMap()
        val nouvelles = nouveau.files.associateBy { it.path }
        val ajoutesModifies = nouveau.files.filter { n ->
            val a = anciennes[n.path]
            a == null || a.sha256.lowercase() != n.sha256.lowercase()
        }
        val retires = anciennes.keys.filter { it !in nouvelles }
        val octets = ajoutesModifies.sumOf { it.size }
        if (ancienDir != null && ancienMan != null) {
            if (ajoutesModifies.isEmpty() && retires.isEmpty()) {
                touchDir(ancienDir)
                return PackVerificationResult(isValid = true, progressPercent = 1f, packName = ancienDir.name)
            }
            val ok = confirmer(
                ApercuDiff(gameId, false, ajoutesModifies.count { it.path !in anciennes },
                    ajoutesModifies.count { it.path in anciennes }, retires.size, octets)
            )
            if (!ok) {
                return PackVerificationResult(isValid = false, errors = listOf("Mise à jour annulée"), miseAJourAnnulee = true)
            }
        }
        val aInstaller = (nouveau.files.map { it.path } + "manifest.json").toSet()
        val frais = File(packsRoot(), "${gameId}_${System.currentTimeMillis()}")
        frais.mkdirs()
        try {
            for (chemin in aInstaller) {
                val src = File(staged, chemin)
                if (src.isFile) {
                    val dest = File(frais, chemin)
                    dest.parentFile?.mkdirs()
                    src.copyTo(dest, overwrite = true)
                }
            }
            for (chemin in recopier) {
                // Fichiers volontairement non téléchargés (identiques à
                // l'ancien, vérifiés par SHA) : repris dans l'ancien dossier.
                val dest = File(frais, chemin)
                if (dest.isFile) continue
                val src = ancienDir?.let { File(it, chemin) }
                if (src != null && src.isFile) {
                    dest.parentFile?.mkdirs()
                    src.copyTo(dest, overwrite = true)
                }
            }
            val incoherence = coherenceTuiles(nouveau, frais)
            if (incoherence != null) {
                deleteRecursive(frais)
                return PackVerificationResult(isValid = false, errors = listOf(incoherence))
            }
            val verification = verifyFiles(nouveau, frais, onProgress)
            if (!verification.isValid) {
                deleteRecursive(frais)
                return verification
            }
            if (ancienDir != null && ancienDir != frais) deleteRecursive(ancienDir)
            return PackVerificationResult(isValid = true, progressPercent = 1f, packName = frais.name)
        } catch (e: Exception) {
            try { deleteRecursive(frais) } catch (_: Exception) { }
            Log.e("PackManager", "Installation impossible", e)
            return PackVerificationResult(isValid = false, errors = listOf(e.message ?: "Installation impossible"))
        }
    }

    private fun loadManifest(packDir: File): PackManifest? {        val file = File(packDir, "manifest.json")
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
            // Tri du plus récent au plus ancien (change player-local-catalog) :
            // le défaut à froid ouvre le dernier installé, jamais un ordre arbitraire.
            packsDir.listFiles()?.filter { it.isDirectory }?.sortedByDescending { it.lastModified() }?.map { it.name } ?: emptyList()
        }
    }

    // Catalogue local (change player-local-catalog) : métadonnées lues depuis
    // le game.json installé, triées du plus récent au plus ancien.
    data class InstalledPack(
        val name: String,
        val gameId: String,
        val schemaVersion: String,
        val installedAt: Long
    )

    suspend fun listInstalledPacks(): List<InstalledPack> {
        return withContext(Dispatchers.IO) {
            val packsDir = File(context.filesDir, "packs")
            packsDir.listFiles()
                ?.filter { it.isDirectory }
                ?.mapNotNull { dir ->
                    try {
                        val gameFile = File(dir, "game.json")
                        if (!gameFile.isFile) return@mapNotNull null
                        val game = json.decodeFromString(Game.serializer(), gameFile.readText())
                        InstalledPack(dir.name, game.gameId, game.schemaVersion, dir.lastModified())
                    } catch (e: Exception) {
                        Log.w("PackManager", "pack illisible: ${dir.name}", e)
                        null
                    }
                }
                ?.sortedByDescending { it.installedAt } ?: emptyList()
        }
    }

    // Re-vérification à l'ouverture depuis le catalogue local : même contrôle
    // SHA-256 que l'import ; pack altéré = refus avec fichier nommé, jamais lancé.
    suspend fun verifyInstalledPack(packName: String): PackVerificationResult {
        return withContext(Dispatchers.IO) {
            val packDir = File(context.filesDir, "packs/$packName")
            var manifest = loadManifest(packDir)
            if (manifest == null && File(packDir, "game.json").isFile) {
                // Adoption (change pack-zip-diff-tuiles) : packs installés
                // avant le manifest persisté (octets vérifiés à l'install
                // d'origine) — baseline de confiance, vérifiée ensuite.
                val fichiers = packDir.walkTopDown()
                    .filter { it.isFile }
                    .map { f ->
                        ManifestEntry(
                            path = f.relativeTo(packDir).path.replace(File.separatorChar, '/'),
                            version = "1",
                            size = f.length(),
                            sha256 = computeSha256(f)
                        )
                    }
                    .toList()
                manifest = PackManifest(files = fichiers, version = 1)
                saveManifest(manifest, packDir)
            }
            val man = manifest
                ?: return@withContext PackVerificationResult(
                    isValid = false,
                    errors = listOf("Manifest manquant: manifest.json"),
                    missingFiles = listOf("manifest.json")
                )
            verifyFiles(man, packDir, null)
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
