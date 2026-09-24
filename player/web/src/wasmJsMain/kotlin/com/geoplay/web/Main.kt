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
import com.geoplay.shared.pack.buildSingleFileManifest
import com.geoplay.shared.pack.parseGameJson
import com.geoplay.shared.pack.parseManifest
import com.geoplay.shared.pack.verifyPackFiles
import com.geoplay.shared.providers.WebStorage
import com.geoplay.shared.providers.defaultLocationProvider
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
            status = "Pack vérifié : ${loaded.game.gameId} (${manifest.files.size} fichier(s))."
            busy = false
        } catch (e: Exception) {
            fail("Import impossible ($source) : ${e.message}")
        }
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
        )
    } else {
        RunScreen(game = pack!!.game, avertissements = avertissements, onExit = {
            pack = null
            avertissements = emptyList()
        })
    }
}

@Composable
private fun ImportScreen(status: String, busy: Boolean, onPickFile: () -> Unit, onLoadUrl: (String) -> Unit) {
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

    // Horloge session : nowMs = temps écoulé (reprise exacte après kill).
    LaunchedEffect(game.gameId) {
        wallStart = Clock.System.now().toEpochMilliseconds()
        while (true) {
            delay(1000)
            tickWall = Clock.System.now().toEpochMilliseconds()
        }
    }
    val nowMs = baseElapsed + if (wallStart == 0L || tickWall == 0L) 0L else tickWall - wallStart

    // GPS réel : présence par distance, dwell suivi dans le temps.
    val fix = locationProvider.currentPosition()
    val presence = remember(fix, game) {
        game.nodes.mapNotNull { n ->
            val cond = n.activation.requires.firstOrNull {
                it.type == ConditionType.GEOFENCE && it.lat != null && it.lng != null && it.radiusMeters != null
            } ?: return@mapNotNull null
            val inside = haversineMeters(fix.lat, fix.lng, cond.lat!!, cond.lng!!) <= (cond.radiusMeters ?: 30)
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
    val dwellOk = remember(insideSince, nowMs, game) {
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
            )
        )
        baseElapsed = nowMs
        wallStart = if (tickWall == 0L) wallStart else tickWall
    }

    fun complete(id: String, score: Int) {
        completedAt = completedAt + (id to nowMs)
        completedCount = completedCount + (id to ((completedCount[id] ?: 0) + 1))
        active = null
        persist()
        if (game.nodes.find { it.id == id }?.isEnding == true) finished = id
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
        if (finished != null) {
            Column(modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Partie terminée — bravo !", style = MaterialTheme.typography.headlineSmall)
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
            )
        }
    }
}
