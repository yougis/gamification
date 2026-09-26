@file:OptIn(kotlin.time.ExperimentalTime::class)

package com.geoplay.web

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.ComposeViewport
import com.geoplay.shared.game.Sim
import com.geoplay.shared.game.applyEffects
import com.geoplay.shared.game.dureeTotaleMs
import com.geoplay.shared.game.estHorsDelai
import com.geoplay.shared.game.partieTermineeParTemps
import com.geoplay.shared.game.verrouillageDansMs
import com.geoplay.shared.game.InventoryState
import com.geoplay.shared.game.timerRemainingMs
import com.geoplay.shared.game.drawPool
import com.geoplay.shared.game.evaluate
import com.geoplay.shared.game.present
import com.geoplay.shared.model.Anchor
import com.geoplay.shared.model.Condition
import com.geoplay.shared.model.ConditionType
import com.geoplay.shared.model.DrawTiming
import com.geoplay.shared.model.Game
import com.geoplay.shared.model.GameNode
import com.geoplay.shared.model.NodeState
import com.geoplay.shared.model.Predicate
import com.geoplay.shared.pack.PackManifest
import com.geoplay.shared.pack.buildSingleFileManifest
import com.geoplay.shared.pack.decodeBase64
import com.geoplay.shared.pack.parseGameJson
import com.geoplay.shared.pack.parseManifest
import com.geoplay.shared.pack.verifyPackFiles
import com.geoplay.shared.providers.WebStorage
import com.geoplay.shared.providers.defaultLocationProvider
import com.geoplay.shared.providers.GpsFix
import com.geoplay.shared.providers.requestCompassPermission
import com.geoplay.shared.ui.navigation.GeoPlayApp
import com.geoplay.shared.ui.theme.GeoPlayTheme
import kotlinx.browser.document
import kotlinx.browser.window
import kotlinx.coroutines.delay
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.JsonObject
import org.w3c.dom.HTMLInputElement
import org.w3c.files.FileReader
import kotlin.math.asin
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt
import kotlin.js.JsString
import kotlin.math.PI
import kotlin.random.Random
import kotlin.time.Clock

// Les fichiers JSON sont UTF-8 : le texte sert au parse, ses octets UTF-8
// à la vérification SHA-256 (identiques aux octets du fichier, hors BOM
// éventuelle retirée ici).

private fun sansBom(text: String): String = text.removePrefix("\uFEFF")

private val sessionJson = Json { ignoreUnknownKeys = true }

// --- Persistance web (design D2) : instantané JSON par partie ---

@Serializable
private data class WebSession(
    val sessionId: String,
    val gameId: String,
    val completedAt: Map<String, Long> = emptyMap(),
    val completedCount: Map<String, Int> = emptyMap(),
    val draws: Map<String, List<String>> = emptyMap(),
    val seen: Set<String> = emptySet(),
    val baseElapsedMs: Long = 0L,
    // Inventaire du joueur (change player-inventory-toolbox) : rempli par
    // les effets GIVE/REMOVE à la complétion, relu à la reprise.
    val inventory: Map<String, Int> = emptyMap(),
)

private fun sessionKey(gameId: String) = "geoplay.web.session.$gameId"

private fun loadSession(gameId: String): WebSession? = try {
    WebStorage.get(sessionKey(gameId))?.let { sessionJson.decodeFromString(WebSession.serializer(), it) }
} catch (_: Exception) {
    null
}

private fun saveSession(s: WebSession) {
    WebStorage.set(sessionKey(s.gameId), sessionJson.encodeToString(WebSession.serializer(), s))
}

// --- Import : fichier local ou URL, vérifié manifest (parité natif) ---

private fun bytesToText(bytes: ByteArray): String = sansBom(bytes.decodeToString())

private data class LoadedPack(
    val game: Game,
    val manifestText: String,
    val files: Map<String, ByteArray>,
)

private fun loadPackFromGameText(gameText: String, manifestText: String?): LoadedPack {
    val game = parseGameJson(gameText)
    val gameBytes = gameText.encodeToByteArray()
    return LoadedPack(game, manifestText ?: "", mapOf("game.json" to gameBytes))
}

private fun pickFile(onText: (name: String, text: String) -> Unit) {
    val input = document.createElement("input") as HTMLInputElement
    input.type = "file"
    input.accept = ".json,application/json"
    input.onchange = change@{
        val file = input.files?.item(0) ?: return@change
        val reader = FileReader()
        reader.onload = load@{
            val text = (reader.result as? JsString)?.toString() ?: return@load
            onText(file.name.toString(), sansBom(text))
        }
        reader.readAsText(file)
    }
    input.click()
}

private fun fetchText(url: String, onOk: (String) -> Unit, onErr: (String) -> Unit) {
    window.fetch(url).then(
        onFulfilled = { response ->
            if (!response.ok) {
                onErr("HTTP ${response.status} : $url")
            } else {
                response.text().then(
                    onFulfilled = { text -> onOk(sansBom(text.toString())); null },
                    onRejected = { onErr("Lecture impossible : $url"); null },
                )
            }
            null
        },
        onRejected = { onErr("Téléchargement impossible : $url (réseau ? CORS ?)"); null },
    )
}

// Assets binaires via Blob + data-URL (pas de typed arrays JS) : le
// décodeur base64 pur `decodeBase64` (shared, testé) fait le reste.
private fun fetchBytes(url: String, onOk: (ByteArray) -> Unit, onErr: (String) -> Unit) {
    window.fetch(url).then(
        onFulfilled = { response ->
            if (!response.ok) {
                onErr("HTTP ${response.status} : $url")
            } else {
                response.blob().then(
                    onFulfilled = { blob ->
                        val reader = FileReader()
                        reader.onload = loaded@{
                            val dataUrl = (reader.result as? JsString)?.toString() ?: run {
                                onErr("Lecture impossible : $url")
                                return@loaded
                            }
                            try {
                                onOk(decodeBase64(dataUrl.substringAfter(",", "")))
                            } catch (_: Exception) {
                                onErr("Décodage impossible : $url")
                            }
                            null
                        }
                        reader.readAsDataURL(blob)
                        null
                    },
                    onRejected = { onErr("Lecture impossible : $url"); null },
                )
            }
            null
        },
        onRejected = { onErr("Téléchargement impossible : $url (réseau ? CORS ?)"); null },
    )
}

// --- Géographie : présence réelle via le provider GPS ---

private fun haversineMeters(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Double {
    val r = 6371000.0
    val dLat = (lat2 - lat1) * PI / 180.0
    val dLng = (lng2 - lng1) * PI / 180.0
    val a = sin(dLat / 2) * sin(dLat / 2) +
        cos(lat1 * PI / 180.0) * cos(lat2 * PI / 180.0) *
        sin(dLng / 2) * sin(dLng / 2)
    return 2 * r * asin(sqrt(a))
}

private fun timerDue(c: Condition, completedAt: Map<String, Long>, nowMs: Long): Boolean {
    val anchor = if (c.anchor == Anchor.NODE_COMPLETION) {
        completedAt[c.anchorNodeId] ?: return false
    } else {
        0L
    }
    return nowMs >= anchor + (c.delaySeconds ?: 0L) * 1000L
}

// Éligibilité d'un pool ON_POOL_ACTIVATION (hypothèse favorable comme le
// validateur : conditions d'environnement supposées vraies).
private fun poolReady(
    pool: GameNode,
    completedAt: Map<String, Long>,
    draws: Map<String, List<String>>,
    nowMs: Long,
): Boolean =
    pool.activation.requires.all { c ->
        when (c.type) {
            ConditionType.NODE_COMPLETED -> c.nodeId?.let { completedAt.containsKey(it) } ?: false
            ConditionType.TIMER -> timerDue(c, completedAt, nowMs)
            ConditionType.POOL_DRAWN -> c.poolNodeId?.let { !draws[it].isNullOrEmpty() } ?: false
            else -> true
        }
    }

// --- Coquille ---

@OptIn(ExperimentalComposeUiApi::class)
fun main() {
    val host = document.getElementById("ComposeTarget")
    requireNotNull(host)
    ComposeViewport(host) {
        GeoPlayTheme {
            WebApp()
        }
    }
}

// Re-contrôle compatibilité au lancement (design D3) : le sidecar
// `compat.json` écrit par le Studio est relu ; un verdict PWA `refuse`
// bloque avec motifs, `degrade` affiche les replis et continue. Absent ou
// illisible → on procède (rétrocompatibilité des packs existants).
private data class CompatGate(val blocked: Boolean, val motifs: List<String>, val replis: List<String>)

private fun gateCompat(compatText: String?): CompatGate {
    if (compatText == null) return CompatGate(false, emptyList(), emptyList())
    return try {
        val root = Json.parseToJsonElement(compatText).jsonObject
        val pwa = root["verdicts"]?.jsonObject?.get("PWA")?.jsonObject
            ?: return CompatGate(false, emptyList(), emptyList())
        val verdict = (pwa["verdict"] as? JsonPrimitive)?.content
        val motifs = pwa["motifs"]?.jsonArray?.mapNotNull { (it as? JsonPrimitive)?.content } ?: emptyList()
        val replis = pwa["replis"]?.jsonArray?.mapNotNull { (it as? JsonPrimitive)?.content } ?: emptyList()
        CompatGate(blocked = verdict == "refuse", motifs = motifs, replis = replis)
    } catch (_: Exception) {
        CompatGate(false, emptyList(), emptyList())
    }
}

@Composable
private fun WebApp() {
    var pack by remember { mutableStateOf<LoadedPack?>(null) }
    var lastCodeSource by remember { mutableStateOf<String?>(null) }
    var status by remember { mutableStateOf("Choisissez un pack pour commencer.") }
    var busy by remember { mutableStateOf(false) }
    var avertissements by remember { mutableStateOf(listOf<String>()) }

    fun fail(msg: String) {
        status = msg
        busy = false
    }

    fun ingest(gameText: String, manifestText: String?, compatText: String?, source: String) {
        try {
            val loaded = loadPackFromGameText(gameText, manifestText)
            val manifest = if (manifestText != null) {
                parseManifest(loaded.manifestText)
            } else {
                buildSingleFileManifest(loaded.game, loaded.files.getValue("game.json"))
            }
            val result = verifyPackFiles(manifest, loaded.files)
            if (!result.isValid) {
                fail("Pack refusé ($source) : ${result.errors.joinToString(" ; ")}")
                return
            }
            val gate = gateCompat(compatText)
            if (gate.blocked) {
                fail("Pack incompatible avec ce player ($source) : ${gate.motifs.joinToString(" ; ")}")
                return
            }
            avertissements = gate.replis
            pack = loaded
            lastCodeSource = null
            status = "Pack vérifié : ${loaded.game.gameId} (${manifest.files.size} fichier(s))."
            busy = false
        } catch (e: Exception) {
            fail("Import impossible ($source) : ${e.message}")
        }
    }

    fun ingestParsed(
        gameText: String,
        manifest: PackManifest,
        files: Map<String, ByteArray>,
        compatText: String?,
        source: String,
    ) {
        try {
            val game = parseGameJson(gameText)
            val result = verifyPackFiles(manifest, files)
            if (!result.isValid) {
                fail("Pack refusé ($source) : ${result.errors.joinToString(" ; ")}")
                return
            }
            val gate = gateCompat(compatText)
            if (gate.blocked) {
                fail("Pack incompatible avec ce player ($source) : ${gate.motifs.joinToString(" ; ")}")
                return
            }
            avertissements = gate.replis
            pack = LoadedPack(game, "", files)
            status = "Pack vérifié : ${game.gameId} (${manifest.files.size} fichier(s))."
            busy = false
        } catch (e: Exception) {
            fail("Import impossible ($source) : ${e.message}")
        }
    }

    fun loadCodePack(base: String, code: String) {
        // Réutilisation si déjà vérifié en session : même service + même code
        // déjà chargés → pas de re-téléchargement.
        val source = "$base#/games/$code"
        if (pack != null && lastCodeSource == source) {
            status = "Pack déjà vérifié : ${pack!!.game.gameId} (réutilisé, sans re-téléchargement)."
            return
        }
        lastCodeSource = source
        busy = true
        fetchText("$base/games/$code",
            onOk = { packText ->
                try {
                    val root = Json.parseToJsonElement(packText).jsonObject
                    val gameText = (root["gameJson"] as? JsonPrimitive)?.content
                        ?: throw IllegalStateException("pack illisible")
                    val manifestObj = root["manifest"]?.jsonObject
                        ?: throw IllegalStateException("manifest absent")
                    val manifest = parseManifest(Json.encodeToString(JsonObject.serializer(), manifestObj))
                    val files = mutableMapOf("game.json" to gameText.encodeToByteArray())
                    val restants = manifest.files.filter { it.path != "game.json" }.toMutableList()
                    fun suite() {
                        if (restants.isEmpty()) {
                            ingestParsed(gameText, manifest, files, null, "code $code")
                            return
                        }
                        val entry = restants.removeAt(0)
                        fetchBytes("$base/games/$code/assets/${entry.path}",
                            onOk = { bytes ->
                                files[entry.path] = bytes
                                suite()
                            },
                            onErr = { fail("Asset manquant (code $code) : ${entry.path}") },
                        )
                    }
                    suite()
                } catch (e: Exception) {
                    fail("Pack illisible (code $code) : ${e.message}")
                }
            },
            onErr = { msg ->
                fail(if (msg.startsWith("HTTP 404")) "code inconnu" else msg)
            },
        )
    }

    // Pré-remplissage QR/lien (change studio-game-catalog, D3) : ?code=4217&service=<https>
    // encode {urlService, code} et remplit l'écran d'import existant.
    fun queryParam(name: String): String {
        val search = window.location.search
        val raw = search.split("&", "?").firstOrNull { it.startsWith("$name=") }
            ?.substringAfter("=") ?: return ""
        // Décodage percent-encoding pur Kotlin (pas d'interop JS).
        val out = StringBuilder()
        var i = 0
        while (i < raw.length) {
            val c = raw[i]
            if (c == '%' && i + 2 < raw.length) {
                val hex = raw.substring(i + 1, i + 3)
                val v = hex.toIntOrNull(16)
                if (v != null) {
                    out.append(v.toChar())
                    i += 3
                    continue
                }
            }
            out.append(if (c == '+') ' ' else c)
            i++
        }
        return out.toString()
    }

    var serviceUrl by remember {
        mutableStateOf(
            queryParam("service").ifBlank { queryParam("urlService") }
                .ifBlank { WebStorage.get("geoplay.web.catalogUrl") ?: "" }
        )
    }
    var code by remember {
        mutableStateOf(queryParam("code").filter { it.isDigit() }.take(4))
    }

    fun saveServiceUrl(url: String) {
        serviceUrl = url
        WebStorage.set("geoplay.web.catalogUrl", url)
    }

    if (pack == null) {
        ImportScreen(
            status = status,
            busy = busy,
            onPickFile = { pickFile { _, text -> ingest(text, null, null, "fichier") } },
            onLoadUrl = { url ->
                busy = true
                val base = url.substringBeforeLast("/") + "/"
                fetchText(url,
                    onOk = { gameText ->
                        fetchText(base + "manifest.json",
                            onOk = { manifestText ->
                                fetchText(base + "compat.json",
                                    onOk = { compatText -> ingest(gameText, manifestText, compatText, "URL") },
                                    onErr = { ingest(gameText, manifestText, null, "URL (sans compat)") },
                                )
                            },
                            onErr = { ingest(gameText, null, null, "URL (sans manifest)") },
                        )
                    },
                    onErr = ::fail,
                )
            },
            serviceUrl = serviceUrl,
            onServiceUrl = ::saveServiceUrl,
            code = code,
            onCode = { code = it.filter { c -> c.isDigit() }.take(4) },
            onLoadCode = { loadCodePack(serviceUrl.trimEnd('/'), code) },
        )
    } else {
        RunScreen(game = pack!!.game, avertissements = avertissements, onExit = {
            pack = null
            avertissements = emptyList()
        })
    }
}

@Composable
private fun ImportScreen(
    status: String,
    busy: Boolean,
    onPickFile: () -> Unit,
    onLoadUrl: (String) -> Unit,
    serviceUrl: String,
    onServiceUrl: (String) -> Unit,
    code: String,
    onCode: (String) -> Unit,
    onLoadCode: () -> Unit,
) {
    var url by remember { mutableStateOf("") }
    Column(modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("GeoPlay — joueur web", style = MaterialTheme.typography.headlineSmall)
        Text("Pack hors-ligne : game.json vérifié (SHA-256), puis jeu sans réseau.", style = MaterialTheme.typography.bodyMedium)
        Button(onClick = onPickFile, enabled = !busy) {
            Text("Choisir un fichier game.json")
        }
        OutlinedTextField(
            value = url,
            onValueChange = { url = it },
            label = { Text("…ou URL d'un game.json") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
        )
        Button(onClick = { onLoadUrl(url) }, enabled = !busy && url.isNotBlank()) {
            Text("Charger depuis l'URL")
        }
        OutlinedTextField(
            value = serviceUrl,
            onValueChange = onServiceUrl,
            label = { Text("Service catalogue (https…)") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
        )
        OutlinedTextField(
            value = code,
            onValueChange = onCode,
            label = { Text("Code du jeu à 4 chiffres") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
        )
        Button(onClick = onLoadCode, enabled = !busy && serviceUrl.isNotBlank() && code.length == 4) {
            Text("Charger par code")
        }
        Text(status, style = MaterialTheme.typography.bodySmall)
        Text(
            "Astuce terrain : ouvrez une fois en ligne (mise en cache), puis ajoutez à l'écran d'accueil.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun RunScreen(game: Game, avertissements: List<String>, onExit: () -> Unit) {
    val locationProvider = remember { defaultLocationProvider() }
    val resumed = remember(game.gameId) { loadSession(game.gameId) }
    val sessionId = remember(game.gameId) { resumed?.sessionId ?: "web-${Random.nextLong().toString(16)}" }
    var completedAt by remember(game.gameId) { mutableStateOf(resumed?.completedAt ?: emptyMap()) }
    var completedCount by remember(game.gameId) { mutableStateOf(resumed?.completedCount ?: emptyMap()) }
    var draws by remember(game.gameId) { mutableStateOf(resumed?.draws ?: emptyMap()) }
    var seenUnlocked by remember(game.gameId) { mutableStateOf(resumed?.seen ?: emptySet()) }
    var queue by remember(game.gameId) { mutableStateOf(listOf<String>()) }
    var active by remember(game.gameId) { mutableStateOf<String?>(null) }
    var insideSince by remember(game.gameId) { mutableStateOf(mapOf<String, Long>()) }
    var tickWall by remember(game.gameId) { mutableStateOf(0L) }
    var baseElapsed by remember(game.gameId) { mutableStateOf(resumed?.baseElapsedMs ?: 0L) }
    var wallStart by remember(game.gameId) { mutableStateOf(0L) }
    var compassOk by remember { mutableStateOf<Boolean?>(null) }
    var finished by remember(game.gameId) { mutableStateOf<String?>(null) }
    var finTemps by remember(game.gameId) { mutableStateOf(false) }
    // Inventaire : effets appliqués à la complétion via le moteur partagé.
    var inventory by remember(game.gameId) { mutableStateOf(resumed?.inventory ?: emptyMap()) }
    // Triche animateur (change parite-player) : simulation locale, repliée
    // par défaut, jamais persistée comme telle ni écrite dans le JSON.
    // Chaque complétion sous triche est marquée SIMULÉE (journal local).
    var cheatOpen by remember { mutableStateOf(false) }
    var cheatBypass by remember(game.gameId) { mutableStateOf(false) }
    var simLat by remember(game.gameId) { mutableStateOf("") }
    var simLng by remember(game.gameId) { mutableStateOf("") }
    var drawForced by remember(game.gameId) { mutableStateOf(false) }
    var cheatedIds by remember(game.gameId) { mutableStateOf(emptySet<String>()) }

    // Horloge session : nowMs = temps écoulé (reprise exacte après kill).
    LaunchedEffect(game.gameId) {
        wallStart = Clock.System.now().toEpochMilliseconds()
        while (true) {
            delay(1000)
            tickWall = Clock.System.now().toEpochMilliseconds()
        }
    }
    val nowMs = baseElapsed + if (wallStart == 0L || tickWall == 0L) 0L else tickWall - wallStart
    // Durée globale (change game-temps-global-fenetres) : échéance évaluée
    // sur nowMs (même formule que Studio et natif) ; fin imposée ou
    // poursuite flaggée selon finDeTemps ; reprise exacte (tout est dérivé).
    val expire = partieTermineeParTemps(game, nowMs)
    val horsDelai = estHorsDelai(game, nowMs)
    LaunchedEffect(expire) {
        if (expire && game.global.finDeTemps == "terminer") finTemps = true
    }
    // Complétions hors délai (dérivées, survivent à la reprise) : flaggées
    // comme la triche, sans type d'event nouveau.
    val idsHorsDelai = remember(completedAt, game) {
        val d = dureeTotaleMs(game) ?: return@remember emptySet()
        completedAt.filterValues { it >= d }.keys
    }

    // GPS réel : présence par distance, dwell suivi dans le temps.
    // Position simulée (triche) : remplace le fix quand renseignée.
    val realFix = locationProvider.currentPosition()
    val simFix = run {
        val la = simLat.trim().replace(',', '.').toDoubleOrNull()
        val ln = simLng.trim().replace(',', '.').toDoubleOrNull()
        if (la != null && ln != null) GpsFix(la, ln, 5f, fallback = true) else null
    }
    val fix = simFix ?: realFix
    val presence = remember(fix, game, cheatBypass) {
        game.nodes.mapNotNull { n ->
            val cond = n.activation.requires.firstOrNull {
                it.type == ConditionType.GEOFENCE && it.lat != null && it.lng != null && it.radiusMeters != null
            } ?: return@mapNotNull null
            val inside = if (cheatBypass) true
            else haversineMeters(fix.lat, fix.lng, cond.lat!!, cond.lng!!) <= (cond.radiusMeters ?: 30)
            n.id to inside
        }.toMap()
    }
    LaunchedEffect(presence, nowMs) {
        val next = insideSince.toMutableMap()
        for ((id, isIn) in presence) {
            if (isIn && id !in next) next[id] = nowMs
            if (!isIn) next.remove(id)
        }
        if (next != insideSince) insideSince = next
    }
    val dwellOk = remember(insideSince, nowMs, game, cheatBypass) {
        if (cheatBypass) {
            game.nodes.mapNotNull { n ->
                val hasDwell = n.activation.requires.any {
                    it.type == ConditionType.GEOFENCE && it.predicate == Predicate.DWELL
                }
                if (hasDwell) n.id else null
            }.toSet()
        } else {
            game.nodes.mapNotNull { n ->
                val dwells = n.activation.requires.filter {
                    it.type == ConditionType.GEOFENCE && it.predicate == Predicate.DWELL
                }
                if (dwells.isEmpty()) return@mapNotNull null
                val since = insideSince[n.id] ?: return@mapNotNull null
                val need = dwells.maxOf { it.dwellMs ?: 0L }
                if (nowMs - since >= need) n.id else null
            }.toSet()
        }
    }
    val insideIds = remember(presence) { presence.filterValues { it }.keys }

    // Tirages : ON_GAME_START au chargement, ON_POOL_ACTIVATION à éligibilité.
    LaunchedEffect(game.gameId) {
        val fresh = mutableMapOf<String, List<String>>()
        for (p in game.nodes) {
            if (p.randomPool == null || draws.containsKey(p.id)) continue
            if (p.randomPool?.drawTiming == DrawTiming.ON_GAME_START) {
                fresh[p.id] = drawPool(p, sessionId)
            }
        }
        if (fresh.isNotEmpty()) draws = draws + fresh
    }

    val sim = Sim(
        present = insideIds.toMutableSet(),
        dwellOk = dwellOk.toMutableSet(),
        throughOk = insideIds.toMutableSet(),
        nowMs = nowMs,
        completedAt = completedAt,
        accuracyM = fix.accuracyM.toInt(),
    )
    val eval = evaluate(game, sim, draws, completedAt, completedCount, seenUnlocked)
    LaunchedEffect(eval.unlocked) {
        // Tirage à l'activation + mémoire latch.
        val fresh = mutableMapOf<String, List<String>>()
        for (p in game.nodes) {
            if (p.randomPool == null || draws.containsKey(p.id)) continue
            if (p.randomPool?.drawTiming == DrawTiming.ON_POOL_ACTIVATION &&
                poolReady(p, completedAt, draws + fresh, nowMs)
            ) {
                fresh[p.id] = drawPool(p, sessionId)
            }
        }
        if (fresh.isNotEmpty()) draws = draws + fresh
        seenUnlocked = seenUnlocked + eval.unlocked
        val pres = present(eval.unlocked, queue, active)
        queue = pres.queue
        active = pres.activeId
    }

    fun persist() {
        saveSession(
            WebSession(
                sessionId = sessionId,
                gameId = game.gameId,
                completedAt = completedAt,
                completedCount = completedCount,
                draws = draws,
                seen = seenUnlocked,
                baseElapsedMs = nowMs,
                inventory = inventory,
            )
        )
        baseElapsed = nowMs
        wallStart = if (tickWall == 0L) wallStart else tickWall
    }

    fun complete(id: String, score: Int) {
        val node = game.nodes.find { it.id == id }
        // Effets d'inventaire via le moteur partagé (même règle que le natif).
        if (node != null) {
            inventory = applyEffects(node, InventoryState(items = inventory)).items
        }
        // Flag triche : complétion sous bypass, position simulée ou tirage forcé.
        if (cheatBypass || simFix != null || drawForced) cheatedIds = cheatedIds + id
        completedAt = completedAt + (id to nowMs)
        completedCount = completedCount + (id to ((completedCount[id] ?: 0) + 1))
        active = null
        persist()
        if (node?.isEnding == true) finished = id
    }

    val states = remember(eval.unlocked, active, completedAt) {
        game.nodes.associate { n ->
            n.id to when {
                completedAt.containsKey(n.id) -> NodeState.COMPLETED
                n.id == active -> NodeState.ACTIVE
                eval.unlocked.contains(n.id) -> NodeState.UNLOCKED
                else -> NodeState.LOCKED
            }
        }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        if (avertissements.isNotEmpty()) {
            Text(
                text = "Fonctionnement dégradé : " + avertissements.joinToString(" ; "),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.tertiary,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
            )
        }
        Text(
            text = if (fix.fallback) "GPS : en attente de position…" else "GPS : ${fix.lat}, ${fix.lng} (±${fix.accuracyM.toInt()} m)",
            style = MaterialTheme.typography.labelSmall,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
        )
        if (compassOk == null) {
            Button(
                onClick = { requestCompassPermission { compassOk = it } },
                modifier = Modifier.padding(horizontal = 16.dp),
            ) {
                Text("Activer la boussole")
            }
        }
        if (horsDelai || idsHorsDelai.isNotEmpty()) {
            Text(
                text = "Hors délai" + (if (idsHorsDelai.isNotEmpty()) " : ${idsHorsDelai.joinToString(", ")}" else " : poursuite flaggée"),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
            )
        }
        if (cheatedIds.isNotEmpty() || cheatBypass || simFix != null) {
            Text(
                text = "SIMULÉ" + (if (cheatedIds.isNotEmpty()) " : ${cheatedIds.joinToString(", ")}" else " : triche active"),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
            )
        }
        Button(
            onClick = { cheatOpen = !cheatOpen },
            modifier = Modifier.padding(horizontal = 16.dp),
        ) {
            Text(if (cheatOpen) "Masquer la triche animateur" else "Triche animateur")
        }
        if (cheatOpen) {
            Column(modifier = Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Simulation locale — ne modifie jamais le JSON.", style = MaterialTheme.typography.labelSmall)
                Button(onClick = { cheatBypass = !cheatBypass }) {
                    Text(if (cheatBypass) "Bypass GEOFENCE : ON" else "Bypass GEOFENCE : OFF")
                }
                OutlinedTextField(
                    value = simLat,
                    onValueChange = { simLat = it },
                    label = { Text("Latitude simulée (vide = GPS)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                )
                OutlinedTextField(
                    value = simLng,
                    onValueChange = { simLng = it },
                    label = { Text("Longitude simulée (vide = GPS)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                )
                for (p in game.nodes.filter { it.randomPool != null }) {
                    Text("Tirage forcé — ${p.id} :", style = MaterialTheme.typography.labelSmall)
                    for (cand in p.randomPool!!.candidates) {
                        Button(onClick = {
                            draws = draws + (p.id to listOf(cand))
                            drawForced = true
                        }) { Text(cand) }
                    }
                }
            }
        }
        if (finished != null || finTemps) {
            Column(modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    if (finTemps && finished == null) "Temps écoulé — partie terminée." else "Partie terminée — bravo !",
                    style = MaterialTheme.typography.headlineSmall,
                )
                Button(onClick = {
                    WebStorage.remove(sessionKey(game.gameId))
                    onExit()
                }) {
                    Text("Choisir un autre pack")
                }
            }
        } else {
            GeoPlayApp(
                game = game,
                states = states,
                onQuizComplete = { id, score -> complete(id, score) },
                modifier = Modifier.fillMaxSize(),
                inventory = inventory,
                // Tableau de bord (change player-home-dashboard) : temps
                // écoulé = horloge session, rebours lus des TIMER, tête de file.
                elapsedMs = nowMs,
                countdownsMs = game.nodes.associate { n ->
                    n.id to timerRemainingMs(n, completedAt, nowMs)
                },
                queueHeadId = active ?: queue.firstOrNull(),
                // Tableau de bord temps global (change game-temps-global-fenetres).
                tempsRestantMs = dureeTotaleMs(game)?.let { (it - nowMs).coerceAtLeast(0L) },
                verrouillagesMs = game.nodes.associate { n ->
                    n.id to verrouillageDansMs(n, nowMs)
                },
                horsDelai = horsDelai,
                // Arrivée immersive : file d'éligibilité pour la règle.
                unlocked = eval.unlocked,
                queue = queue,
            )
        }
    }
}
