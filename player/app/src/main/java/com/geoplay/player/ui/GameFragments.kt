package com.geoplay.player.ui

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.graphics.asImageBitmap
import com.geoplay.player.R
import com.geoplay.player.data.GameRepository
import com.geoplay.player.data.PackManager
import com.geoplay.player.databinding.FragmentGameBinding
import com.geoplay.player.databinding.FragmentHomeBinding
import com.geoplay.player.databinding.FragmentImportBinding
import com.geoplay.player.databinding.FragmentPreviewBinding
import com.geoplay.player.databinding.FragmentReviewBinding
import com.geoplay.player.databinding.FragmentSettingsBinding
import com.geoplay.shared.game.Sim
import com.geoplay.shared.game.evaluate
import com.geoplay.shared.model.Game
import com.geoplay.shared.model.NodeState
import com.geoplay.shared.model.OnReentry
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json

class HomeFragment : Fragment() {

    private var _binding: FragmentHomeBinding? = null
    private val binding get() = _binding!!
    private lateinit var repository: GameRepository

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentHomeBinding.inflate(inflater, container, false)
        repository = GameRepository.getInstance(requireContext())
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.btnNewGame.setOnClickListener {
            // Nouvelle partie = nouveau sessionId (re-tirage) ; reprendre = sans arg (relit).
            val fresh = java.util.UUID.randomUUID().toString()
            val args = android.os.Bundle().apply { putString("sessionId", fresh) }
            findNavController().navigate(R.id.action_homeFragment_to_gameFragment, args)
        }

        binding.btnImport.setOnClickListener {
            findNavController().navigate(R.id.action_homeFragment_to_importFragment)
        }

        binding.btnSettings.setOnClickListener {
            findNavController().navigate(R.id.action_homeFragment_to_settingsFragment)
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}

class GameFragment : Fragment() {

    private var _binding: FragmentGameBinding? = null
    private val binding get() = _binding!!
    private lateinit var repository: GameRepository
    // Etat Compose (dont game lui-même) : toute écriture recompose.
    // (Un var simple lu dans setContent ne déclenchait rien — écran figé.)
    private var game: Game? by mutableStateOf(null)
    private var currentPackName: String? = null
    private var currentNodeId: String? = null
    private var sessionId: String? = null
    private var gameStartMs: Long = System.currentTimeMillis()
    private var isCheatMode: Boolean = false

    private val sim = Sim(
        present = mutableSetOf(),
        dwellOk = mutableSetOf(),
        throughOk = mutableSetOf(),
        nowMs = 0L,
        accuracyM = 5
    )

    private val draws = mutableMapOf<String, List<String>>()
    private val done = mutableMapOf<String, Long>()
    private val counts = mutableMapOf<String, Int>()

    private var activeId: String? = null
    private val json = Json { ignoreUnknownKeys = true; coerceInputValues = true }

    // État Compose (change player-android-compose) : l'UI partagée est
    // nourrie par ces états, recalculés par recompute() (mêmes données et
    // mêmes formules que l'ancien updateUI texte).
    private var uiStates by androidx.compose.runtime.mutableStateOf(mapOf<String, NodeState>())
    private var uiInventory by androidx.compose.runtime.mutableStateOf(mapOf<String, Int>())
    private var uiElapsedMs by androidx.compose.runtime.mutableLongStateOf(0L)
    private var uiCountdowns by androidx.compose.runtime.mutableStateOf(mapOf<String, Long?>())
    private var uiQueueHead by androidx.compose.runtime.mutableStateOf<String?>(null)
    private var uiTempsRestant by androidx.compose.runtime.mutableStateOf<Long?>(null)
    private var uiVerrouillages by androidx.compose.runtime.mutableStateOf(mapOf<String, Long?>())
    private var uiHorsDelai by androidx.compose.runtime.mutableStateOf(false)
    private var uiErreurChargement by androidx.compose.runtime.mutableStateOf<String?>(null)
    private var tickerOn = false
    private var gpsOn = false
    private val gpsListener = object : android.location.LocationListener {
        override fun onLocationChanged(location: android.location.Location) {
            alimenterSimGps(location.latitude, location.longitude,
                if (location.hasAccuracy()) location.accuracy.toInt() else 999)
        }
        @Deprecated("deprecated")
        override fun onStatusChanged(provider: String?, status: Int, extras: android.os.Bundle?) = Unit
    }

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentGameBinding.inflate(inflater, container, false)
        repository = GameRepository.getInstance(requireContext())
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        requestLocationWithRationale()
        demarrerContenuCompose()
        loadGame()
        // Garde-fou DIAG : si le jeu n'est pas chargé en 10 s, afficher
        // l'étape atteinte au lieu de "Chargement" muet.
        lifecycleScope.launch {
            kotlinx.coroutines.delay(10000)
            if (game == null && uiErreurChargement == null) {
                uiErreurChargement = "Diag : bloqué à " + etapeDiag
            }
        }
    }

    override fun onResume() {
        super.onResume()
        demarrerGps()
    }

    override fun onPause() {
        arreterGps()
        super.onPause()
    }

    private val locationPermission = registerForActivityResult(
        androidx.activity.result.contract.ActivityResultContracts.RequestMultiplePermissions()
    ) { grants ->
        val fine = grants[android.Manifest.permission.ACCESS_FINE_LOCATION] == true
        val coarse = grants[android.Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (!fine && !coarse) {
            // Refus OS : jeu continuable carte + distance, geofence en attente (viewer-orchestrator).
            Toast.makeText(
                requireContext(),
                "Localisation refusee : les etapes GPS restent en attente, le reste du jeu reste jouable",
                Toast.LENGTH_LONG
            ).show()
        } else {
            // Permission accordée : position réelle (providers + sim).
            demarrerGps()
        }
    }

    private fun requestLocationWithRationale() {
        val ctx = requireContext()
        val fine = androidx.core.content.ContextCompat.checkSelfPermission(
            ctx, android.Manifest.permission.ACCESS_FINE_LOCATION
        ) == android.content.pm.PackageManager.PERMISSION_GRANTED
        if (fine) return
        if (shouldShowRequestPermissionRationale(android.Manifest.permission.ACCESS_FINE_LOCATION)) {
            // Justification dans le flux (player-install) avant la demande OS.
            Toast.makeText(
                ctx,
                "La position sert a debloquer les etapes proches (geofence)",
                Toast.LENGTH_LONG
            ).show()
        }
        locationPermission.launch(
            arrayOf(
                android.Manifest.permission.ACCESS_FINE_LOCATION,
                android.Manifest.permission.ACCESS_COARSE_LOCATION
            )
        )
    }

    // DIAG temporaires (debug hang "Chargement") : tag GeoPlayDbg, à retirer au correctif final.
    private var etapeDiag = "init"

    private fun loadGame() {
        android.util.Log.d("GeoPlayDbg", "loadGame: debut")
        lifecycleScope.launch {
            val prefs = requireContext().getSharedPreferences("geoplay_prefs", android.content.Context.MODE_PRIVATE)
            isCheatMode = prefs.getBoolean("cheat_mode", false)
            val loaded = withContext(Dispatchers.IO) {
                try {
                    android.util.Log.d("GeoPlayDbg", "loadGame: IO arg packName=" + arguments?.getString("packName"))
                    val packManager = PackManager.getInstance(requireContext())
                    // Pack demandé en argument (change player-local-catalog) :
                    // après import ou depuis le catalogue local, on ouvre CE
                    // pack. Défaut à froid : le plus récent, sinon référence.
                    val wanted = arguments?.getString("packName")
                    val named = wanted?.let { packManager.loadPack(it) }
                    if (named != null) {
                        currentPackName = wanted
                        android.util.Log.d("GeoPlayDbg", "loadGame: pack argument OK gameId=" + named.gameId)
                        named
                    } else {
                        val first = packManager.getInstalledPacks().firstOrNull()
                        currentPackName = first
                        android.util.Log.d("GeoPlayDbg", "loadGame: defaut froid first=" + first)
                        first?.let { packManager.loadPack(it) } ?: loadReferencePack()
                    }
                } catch (e: Exception) {
                    android.util.Log.d("GeoPlayDbg", "loadGame: exception " + e.message)
                    loadReferencePack()
                }
            }
            android.util.Log.d("GeoPlayDbg", "loadGame: loaded gameId=" + loaded?.gameId)
            if (loaded != null) {
                setupGame(loaded)
            } else {
                uiErreurChargement = "Aucun pack installe"
            }
        }
    }

    private fun loadReferencePack(): Game? {
        return try {
            val text = requireContext().assets.open("reference-5poi.json")
                .bufferedReader().use { it.readText() }
            json.decodeFromString(Game.serializer(), text)
        } catch (e: Exception) {
            null
        }
    }

    private fun setupGame(game: Game) {
        this.game = game
        android.util.Log.d("GeoPlayDbg", "setupGame: gameId=" + game.gameId + " noeuds=" + game.nodes.size)
        // Reprendre = meme sessionId relit ; nouvelle partie = nouveau sessionId (offline-pack + player-install).
        val argSession = arguments?.getString("sessionId")
        lifecycleScope.launch {
            etapeDiag = "resolveSession"
            val sid = withContext(Dispatchers.IO) { resolveSession(game, argSession) }
            sessionId = sid
            android.util.Log.d("GeoPlayDbg", "setupGame: session=" + sid)
            etapeDiag = "restoreProgress"
            withContext(Dispatchers.IO) { restoreProgress(sid) }
            android.util.Log.d("GeoPlayDbg", "setupGame: restore OK done=" + done.size)
            etapeDiag = "ensureBootDraws"
            withContext(Dispatchers.IO) { ensureBootDraws() }
            android.util.Log.d("GeoPlayDbg", "setupGame: draws OK")
            recompute()
            demarrerTicker()
        }
    }

    // Contenu Compose (change player-android-compose) : GeoPlayApp partagé,
    // nourri par recompute(). Avant chargement : écran d'attente.
    private fun demarrerContenuCompose() {
        binding.composeView.setContent {
            val g = game
            if (g == null) {
                androidx.compose.foundation.layout.Box(
                    modifier = androidx.compose.ui.Modifier.fillMaxSize(),
                    contentAlignment = androidx.compose.ui.Alignment.Center
                ) {
                    androidx.compose.material3.Text(uiErreurChargement ?: "Chargement de la partie…")
                }
                return@setContent
            }
            com.geoplay.shared.ui.theme.GeoPlayTheme {
                com.geoplay.shared.ui.navigation.GeoPlayApp(
                    game = g,
                    states = uiStates,
                    onQuizComplete = { nodeId, score -> terminerEtape(nodeId, score) },
                    onBack = { findNavController().navigateUp() },
                    inventory = uiInventory,
                    onInventoryOpen = { journalInventaire("INVENTORY_OPENED", null) },
                    onItemSelected = { itemId -> journalInventaire("ITEM_SELECTED", itemId) },
                    elapsedMs = uiElapsedMs,
                    countdownsMs = uiCountdowns,
                    queueHeadId = uiQueueHead,
                    onOpenNode = { id ->
                        activeId = id
                        currentNodeId = id
                        recompute()
                    },
                    tempsRestantMs = uiTempsRestant,
                    verrouillagesMs = uiVerrouillages,
                    horsDelai = uiHorsDelai,
                    imageContent = { src, alt -> ImagePack(src, alt) },
                    onModuleComplete = { nodeId -> terminerEtape(nodeId, 10) }
                )
            }
        }
    }

    @androidx.compose.runtime.Composable
    private fun ImagePack(src: String, alt: String?) {
        val pack = currentPackName
        val fichier = pack?.let { java.io.File(requireContext().filesDir, "packs/$it/$src") }
        if (pack == null || fichier == null || !fichier.isFile) {
            androidx.compose.material3.Text(alt ?: src)
            return
        }
        val bitmap = try {
            android.graphics.BitmapFactory.decodeFile(fichier.absolutePath)
        } catch (_: Exception) { null }
        if (bitmap == null) {
            androidx.compose.material3.Text(alt ?: src)
            return
        }
        androidx.compose.foundation.Image(
            bitmap = bitmap.asImageBitmap(),
            contentDescription = alt
        )
    }

    private fun journalInventaire(event: String, itemId: String?) {
        val sid = sessionId ?: return
        val g = game ?: return
        lifecycleScope.launch {
            withContext(Dispatchers.IO) {
                repository.logInventoryEvent(sid, event, itemId)
                if (event == "ITEM_SELECTED" && itemId != null) {
                    val desc = g.objects.find { it.id == itemId }?.description
                    val nom = g.objects.find { it.id == itemId }?.name ?: itemId
                    launch(Dispatchers.Main) {
                        Toast.makeText(
                            requireContext(),
                            nom + (if (desc.isNullOrBlank()) "" else " — $desc"),
                            Toast.LENGTH_SHORT
                        ).show()
                    }
                }
            }
        }
    }

    private fun demarrerTicker() {
        if (tickerOn) return
        tickerOn = true
        lifecycleScope.launch {
            while (tickerOn) {
                delay(1000)
                if (game != null && sessionId != null) recompute()
            }
        }
    }

    private suspend fun resolveSession(game: Game, argSession: String?): String {
        if (!argSession.isNullOrBlank()) {
            if (repository.getSession(argSession) == null) {
                repository.createSession(game.gameId, argSession)
            }
            requireContext().getSharedPreferences("geoplay_prefs", android.content.Context.MODE_PRIVATE)
                .edit().putString("last_session_" + game.gameId, argSession).apply()
            val s = repository.getSession(argSession)
            gameStartMs = s?.startedAt ?: System.currentTimeMillis()
            return argSession
        }
        val prefs = requireContext().getSharedPreferences("geoplay_prefs", android.content.Context.MODE_PRIVATE)
        val last = prefs.getString("last_session_" + game.gameId, null)
        if (last != null && repository.getSession(last) != null) {
            gameStartMs = repository.getSession(last)?.startedAt ?: System.currentTimeMillis()
            return last
        }
        val fresh = java.util.UUID.randomUUID().toString()
        repository.createSession(game.gameId, fresh)
        prefs.edit().putString("last_session_" + game.gameId, fresh).apply()
        gameStartMs = System.currentTimeMillis()
        return fresh
    }

    private suspend fun restoreProgress(sid: String) {
        draws.clear()
        done.clear()
        counts.clear()
        repository.getRandomDrawsForSession(sid).groupBy { it.poolNodeId }.forEach { (pool, rows) ->
            draws[pool] = rows.sortedBy { it.drawnAt }.map { it.drawnNodeId }
        }
        // Completions detaillees : reprise meme sessionId, aucun re-tirage.
        repository.getCompletions(sid).forEach { c ->
            counts[c.nodeId] = (counts[c.nodeId] ?: 0) + 1
            if (!c.isReplay) done.putIfAbsent(c.nodeId, c.completedAt)
        }
        // Session terminee => on garde l'historique mais on rejoue en nouvelle session via Accueil.
    }

    private suspend fun ensureBootDraws() {
        val g = game ?: return
        val sid = sessionId ?: return
        // ON_GAME_START en ordre de declaration (topo au socle) + persistance immediate, jamais recalcule.
        g.nodes.filter { it.randomPool != null }.forEach { pool ->
            val timing = pool.randomPool?.drawTiming
            if (timing == com.geoplay.shared.model.DrawTiming.ON_GAME_START && !draws.containsKey(pool.id)) {
                val forced = if (isCheatMode) arguments?.getStringArrayList("forceDraw")?.toList() else null
                val result = com.geoplay.shared.game.drawPool(pool, sid, forced)
                draws[pool.id] = result
                result.forEach { nodeId ->
                    repository.saveRandomDraw(
                        com.geoplay.shared.model.RandomDrawEntity(
                            sessionId = sid,
                            poolNodeId = pool.id,
                            drawnNodeId = nodeId,
                            isForced = isCheatMode && forced != null
                        )
                    )
                }
            }
        }
    }

    private suspend fun ensureActivationDraws() {
        val g = game ?: return
        val sid = sessionId ?: return
        g.nodes.filter { it.randomPool != null }.forEach { pool ->
            if (pool.randomPool?.drawTiming == com.geoplay.shared.model.DrawTiming.ON_POOL_ACTIVATION
                && !draws.containsKey(pool.id) && isPoolUnlocked(pool)
            ) {
                val forced = if (isCheatMode) arguments?.getStringArrayList("forceDraw")?.toList() else null
                val result = com.geoplay.shared.game.drawPool(pool, sid, forced)
                draws[pool.id] = result
                result.forEach { nodeId ->
                    repository.saveRandomDraw(
                        com.geoplay.shared.model.RandomDrawEntity(
                            sessionId = sid,
                            poolNodeId = pool.id,
                            drawnNodeId = nodeId,
                            isForced = isCheatMode && forced != null
                        )
                    )
                }
            }
        }
    }

    private fun isPoolUnlocked(pool: com.geoplay.shared.model.GameNode): Boolean {
        // Activation minimale cote Player : graphe (NODE_COMPLETED / POOL_DRAWN / TIMER),
        // environnement suppose favorable comme le validateur (GEOFENCE/TIMER vrais).
        sim.nowMs = System.currentTimeMillis() - gameStartMs
        pool.activation.requires.forEach { c ->
            val ok = when (c.type) {
                com.geoplay.shared.model.ConditionType.NODE_COMPLETED -> done.containsKey(c.nodeId)
                com.geoplay.shared.model.ConditionType.POOL_DRAWN -> !draws[c.poolNodeId].isNullOrEmpty()
                com.geoplay.shared.model.ConditionType.TIMER -> {
                    val anchor = if (c.anchor == com.geoplay.shared.model.Anchor.NODE_COMPLETION) {
                        done[c.anchorNodeId] ?: return@forEach
                    } else gameStartMs
                    System.currentTimeMillis() >= anchor + (c.delaySeconds ?: 0L) * 1000L
                }
                com.geoplay.shared.model.ConditionType.GEOFENCE,
                com.geoplay.shared.model.ConditionType.PROXIMITY_MASTER -> true
                com.geoplay.shared.model.ConditionType.WINDOW -> {
                    val now = System.currentTimeMillis() - gameStartMs
                    val apres = c.apresSecondes
                    val avant = c.avantSecondes
                    val apresOk = apres == null || now >= apres * 1000L
                    val avantOk = avant == null || now < avant * 1000L
                    apresOk && avantOk
                }
                else -> false
            }
            if (!ok) return false
        }
        return true
    }

    // Recalcul (change player-android-compose) : mêmes données et mêmes
    // formules que l'ancien updateUI texte, écrites dans les états Compose.
    private fun recompute() {
        val game = this.game ?: return
        val sid = sessionId ?: return
        lifecycleScope.launch {
            etapeDiag = "recompute:activationDraws"
            withContext(Dispatchers.IO) { ensureActivationDraws() }
            // Mode animateur : bypass capteurs, flag triche sur les events.
            if (isCheatMode) {
                game.nodes.forEach { n ->
                    sim.present.add(n.id)
                    sim.dwellOk.add(n.id)
                }
                sim.accuracyM = 5
            }
            sim.nowMs = System.currentTimeMillis() - gameStartMs
            etapeDiag = "recompute:evaluate"
            val ev = com.geoplay.shared.game.evaluate(game, sim, draws.toMap(), done.toMap(), counts.toMap(), emptySet())
            val homeNow = System.currentTimeMillis() - gameStartMs
            etapeDiag = "recompute:inventory"
            val inv = withContext(Dispatchers.IO) {
                repository.getInventory(sid).associate { it.itemId to it.quantity }
            }
            uiStates = game.nodes.associate { n ->
                n.id to when {
                    done.containsKey(n.id) -> NodeState.COMPLETED
                    ev.unlocked.contains(n.id) -> NodeState.UNLOCKED
                    else -> NodeState.LOCKED
                }
            }
            uiInventory = inv
            uiElapsedMs = homeNow
            uiCountdowns = game.nodes.associate { it.id to com.geoplay.shared.game.timerRemainingMs(it, done.toMap(), homeNow) }
            uiQueueHead = com.geoplay.shared.game.suggest(ev.unlocked.filter { it != activeId }, emptyList()).tete
            val duree = com.geoplay.shared.game.dureeTotaleMs(game)
            uiTempsRestant = duree?.let { (it - homeNow).coerceAtLeast(0L) }
            uiVerrouillages = game.nodes.associate { it.id to com.geoplay.shared.game.verrouillageDansMs(it, homeNow) }
            uiHorsDelai = com.geoplay.shared.game.estHorsDelai(game, homeNow)
            etapeDiag = "recompute:ok"
            android.util.Log.d("GeoPlayDbg", "recompute: etats ecrits=" + uiStates.size + " unlocked=" + ev.unlocked)
        }
    }

    // GPS natif vers sim (change player-android-compose) : ENTER seulement
    // (dwell/through restent simu/triche comme avant) ; latch:true garde
    // l'éligibilité après sortie, latch:false la retire.
    private fun demarrerGps() {
        if (gpsOn) return
        val ctx = context ?: return
        val ok = androidx.core.content.ContextCompat.checkSelfPermission(
            ctx, android.Manifest.permission.ACCESS_FINE_LOCATION
        ) == android.content.pm.PackageManager.PERMISSION_GRANTED
        if (!ok) return
        try {
            com.geoplay.shared.providers.initLocalisationAndroid(ctx)
            val manager = ctx.getSystemService(android.content.Context.LOCATION_SERVICE) as android.location.LocationManager
            for (fournisseur in listOf(
                android.location.LocationManager.GPS_PROVIDER,
                android.location.LocationManager.NETWORK_PROVIDER
            )) {
                try {
                    if (!manager.isProviderEnabled(fournisseur)) continue
                    manager.requestLocationUpdates(fournisseur, 5000L, 5f, gpsListener)
                } catch (_: Exception) {
                }
            }
            gpsOn = true
        } catch (_: Exception) {
        }
    }

    private fun arreterGps() {
        if (!gpsOn) return
        gpsOn = false
        try {
            val manager = requireContext().getSystemService(android.content.Context.LOCATION_SERVICE) as android.location.LocationManager
            manager.removeUpdates(gpsListener)
        } catch (_: Exception) {
        }
    }

    private fun alimenterSimGps(lat: Double, lng: Double, accuracyM: Int) {
        val g = game ?: return
        sim.accuracyM = accuracyM
        for (noeud in g.nodes) {
            val dedans = noeud.activation.requires.any { c ->
                val clat = c.lat
                val clng = c.lng
                val crayon = c.radiusMeters
                c.type == com.geoplay.shared.model.ConditionType.GEOFENCE &&
                    clat != null && clng != null && crayon != null &&
                    haversineM(lat, lng, clat, clng) <= crayon
            }
            if (dedans) sim.present.add(noeud.id)
            else if (!noeud.latch) sim.present.remove(noeud.id)
        }
        recompute()
    }

    private fun haversineM(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Double {
        val r = 6371000.0
        val dLat = Math.toRadians(lat2 - lat1)
        val dLng = Math.toRadians(lng2 - lng1)
        val a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2)
        return 2 * r * Math.asin(Math.sqrt(a.coerceIn(0.0, 1.0)))
    }

    // Complétion (change player-android-compose) : même règle que l'ancien
    // completeCurrent (rejeu borné, scores, effets GIVE/REMOVE, fin), avec le
    // score du module au lieu du 10 fixe. Abandon = simple retour (shell).
    private fun terminerEtape(id: String, score: Int) {
        val node = game?.nodes?.find { it.id == id } ?: return
        val sid = sessionId ?: return
        val times = (counts[id] ?: 0) + 1
        if (times > 1) {
            val used = times - 1
            if (node.onReentry != OnReentry.REPLAY || used > node.maxReentries) {
                Toast.makeText(requireContext(), id + " : rejouee ignoree", Toast.LENGTH_SHORT).show()
                return
            }
        }
        val isReplay = times > 1
        lifecycleScope.launch {
            counts[id] = times
            val now = System.currentTimeMillis()
            done[id] = now
            // Ecriture immediate SQLite (progression + scores), jamais recalcule.
            withContext(Dispatchers.IO) {
                repository.completeNode(sid, id, score = score, isReplay = isReplay, isCheat = isCheatMode)
                val scoreKept = !isReplay || node.scoreOnReplay
                repository.recordScore(sid, id, if (scoreKept) score else 0, isCheatMode)
                // Effets d'inventaire : GIVE/REMOVE alimentent la boîte à
                // outils + journal (flag triche suivi).
                for (effect in node.effects) {
                    val itemId = effect.itemId ?: continue
                    when (effect.type) {
                        "GIVE_ITEM" -> {
                            val qty = (effect.value as? kotlinx.serialization.json.JsonPrimitive)
                                ?.content?.toIntOrNull() ?: 1
                            repository.addItem(sid, itemId, qty, isCheatMode)
                        }
                        "REMOVE_ITEM" -> repository.removeItem(sid, itemId, isCheatMode)
                    }
                }
                repository.saveProgress(
                    com.geoplay.shared.model.GameProgressEntity(
                        sessionId = sid,
                        gameId = game?.gameId ?: "",
                        currentNodeId = null,
                        updatedAt = now
                    )
                )
                if (node.isEnding) repository.completeSession(sid)
            }
            if (node.isEnding) {
                val tag = if (isCheatMode) " [animateur]" else ""
                Toast.makeText(requireContext(), "FIN atteinte : " + node.id + tag, Toast.LENGTH_LONG).show()
            }
            activeId = null
            recompute()
        }
    }

    override fun onDestroyView() {
        tickerOn = false
        super.onDestroyView()
        _binding = null
    }
}

class ImportFragment : Fragment() {

    private var _binding: FragmentImportBinding? = null
    private val binding get() = _binding!!
    private lateinit var repository: GameRepository
    private lateinit var packManager: PackManager

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentImportBinding.inflate(inflater, container, false)
        repository = GameRepository.getInstance(requireContext())
        packManager = PackManager.getInstance(requireContext())
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.btnScanQR.setOnClickListener {
            tryScanQr()
        }

        binding.btnImportUrl.setOnClickListener {
            val url = binding.etImportUrl.text.toString().trim()
            if (url.isNotBlank()) {
                importFromUrl(url)
            } else {
                Toast.makeText(requireContext(), "Saisis une URL de pack", Toast.LENGTH_SHORT).show()
            }
        }

        binding.btnPickFile.setOnClickListener {
            pickFile()
        }

        binding.rvLocalPacks.layoutManager = androidx.recyclerview.widget.LinearLayoutManager(requireContext())

        // Catalogue des jeux (change studio-game-catalog) : URL persistée,
        // code à 4 chiffres, même vérification manifest à l'arrivée.
        val prefs = requireContext().getSharedPreferences("geoplay", android.content.Context.MODE_PRIVATE)
        binding.etCatalogUrl.setText(prefs.getString("catalog_url", ""))
        binding.btnImportCode.setOnClickListener {
            val base = binding.etCatalogUrl.text.toString().trim()
            val code = com.geoplay.player.data.PackManager.normalizeCode(binding.etCatalogCode.text.toString())
            if (base.isBlank() || code.length != 4) {
                Toast.makeText(requireContext(), "Service + code à 4 chiffres requis", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            prefs.edit().putString("catalog_url", base).apply()
            importFromCatalog(base, code)
        }

        // Deep-link borne : geoplay://import?url=<https> ou jeu pre-rempli par la MainActivity.
        // Catalogue (change studio-game-catalog) : geoplay://import?code=4217&service=<https>
        // pré-remplit le bloc catalogue (D3 : le QR/lien encode {urlService, code}).
        val intentData = requireActivity().intent?.data
        val pendingService = intentData?.getQueryParameter("service")
            ?: intentData?.getQueryParameter("urlService")
        val pendingCode = com.geoplay.player.data.PackManager.normalizeCode(
            intentData?.getQueryParameter("code") ?: ""
        )
        if (!pendingService.isNullOrBlank() && pendingCode.length == 4 &&
            binding.etCatalogCode.text.isNullOrBlank()
        ) {
            prefs.edit().putString("catalog_url", pendingService).apply()
            binding.etCatalogUrl.setText(pendingService)
            binding.etCatalogCode.setText(pendingCode)
        }
        val pendingUrl = requireActivity().intent?.data?.getQueryParameter("url")
            ?: requireActivity().intent?.getStringExtra("pending_import_url")
        if (!pendingUrl.isNullOrBlank() && binding.etImportUrl.text.isNullOrBlank()) {
            binding.etImportUrl.setText(pendingUrl)
            importFromUrl(pendingUrl)
            requireActivity().intent?.removeExtra("pending_import_url")
        }
    }

    override fun onResume() {
        super.onResume()
        refreshLocalCatalog()
    }

    // Catalogue local (change player-local-catalog) : jeux installés sur le
    // téléphone, plus récent d'abord. Ouverture = re-vérification SHA-256
    // puis navigation avec l'identifiant (jamais firstOrNull).
    private fun refreshLocalCatalog() {
        lifecycleScope.launch {
            val packs = withContext(Dispatchers.IO) {
                packManager.listInstalledPacks()
            }
            binding.tvLocalEmpty.visibility = if (packs.isEmpty()) View.VISIBLE else View.GONE
            binding.rvLocalPacks.adapter = LocalPacksAdapter(packs, { packName ->
                openLocalPack(packName)
            }, { packName, gameId ->
                menuEntreeLocale(packName, gameId)
            })
        }
    }

    // Menu d'entrée locale (change player-catalogue-stable) : supprimer
    // (confirmation, historique conservé) et, en mode animateur uniquement,
    // recommencer (nouvelle session vierge, historique gardé).
    private fun menuEntreeLocale(packName: String, gameId: String) {
        val triche = requireContext().getSharedPreferences("geoplay_prefs", android.content.Context.MODE_PRIVATE)
            .getBoolean("cheat_mode", false)
        val actions = mutableListOf("Supprimer")
        if (triche) actions.add("Recommencer (nouvelle partie)")
        android.app.AlertDialog.Builder(requireContext())
            .setTitle(gameId)
            .setItems(actions.toTypedArray()) { _, which ->
                when (actions[which]) {
                    "Supprimer" -> confirmerSuppression(packName, gameId)
                    else -> recommencerPartie(packName, gameId)
                }
            }
            .setNegativeButton("Annuler", null)
            .show()
    }

    private fun confirmerSuppression(packName: String, gameId: String) {
        android.app.AlertDialog.Builder(requireContext())
            .setTitle("Supprimer « $gameId » ?")
            .setMessage("Le pack sera supprimé du téléphone. L'historique des parties est conservé et sera retrouvé si le jeu est réimporté.")
            .setPositiveButton("Supprimer") { _, _ ->
                lifecycleScope.launch {
                    val ok = withContext(Dispatchers.IO) { packManager.deletePack(packName) }
                    if (!ok) {
                        Toast.makeText(requireContext(), "Suppression impossible", Toast.LENGTH_LONG).show()
                    }
                    refreshLocalCatalog()
                }
            }
            .setNegativeButton("Annuler", null)
            .show()
    }

    private fun recommencerPartie(packName: String, gameId: String) {
        // Nouvelle session vierge : on oublie la reprise, le prochain
        // resolveSession crée un UUID frais (tirages et progression vierges).
        requireContext().getSharedPreferences("geoplay_prefs", android.content.Context.MODE_PRIVATE)
            .edit().remove("last_session_$gameId").apply()
        val args = android.os.Bundle().apply { putString("packName", packName) }
        findNavController().navigate(R.id.action_importFragment_to_gameFragment, args)
    }

    private fun openLocalPack(packName: String) {
        lifecycleScope.launch {
            binding.progressBar.visibility = View.VISIBLE
            try {
                val result = withContext(Dispatchers.IO) {
                    packManager.verifyInstalledPack(packName)
                }
                if (result.isValid) {
                    val args = android.os.Bundle().apply { putString("packName", packName) }
                    findNavController().navigate(R.id.action_importFragment_to_gameFragment, args)
                } else {
                    val detail = result.errors.joinToString(" ; ")
                    Toast.makeText(requireContext(), "Pack refuse : $detail", Toast.LENGTH_LONG).show()
                    refreshLocalCatalog()
                }
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "Erreur : " + e.message, Toast.LENGTH_LONG).show()
            } finally {
                binding.progressBar.visibility = View.GONE
            }
        }
    }

    private fun tryScanQr() {
        // POC sans dependance ZXing : delegue au scanner systeme s'il existe (borne associative),
        // sinon bascule explicite vers la saisie manuelle d'URL (meme moteur d'import).
        try {
            val intent = Intent("com.google.zxing.client.android.SCAN").apply {
                putExtra("SCAN_MODE", "QR_CODE_MODE")
            }
            @Suppress("DEPRECATION")
            startActivityForResult(intent, SCAN_QR_REQUEST)
        } catch (e: Exception) {
            Toast.makeText(
                requireContext(),
                "Aucun scanner QR installe : colle l'URL du pack ci-dessous",
                Toast.LENGTH_LONG
            ).show()
        }
    }

    private fun handleQrContent(content: String?) {
        if (content.isNullOrBlank()) return;
        // Le QR auteur encode soit une URL https vers le .zip, soit un deep-link geoplay://import?url=...,
        // soit un objet catalogue {urlService, code} (change studio-game-catalog).
        val trimmed = content.trim();
        if (trimmed.startsWith("{")) {
            try {
                val obj = org.json.JSONObject(trimmed);
                val base = obj.optString("urlService", obj.optString("url", ""));
                val code = com.geoplay.player.data.PackManager.normalizeCode(obj.optString("code", ""));
                if (base.isNotBlank() && code.length == 4) {
                    binding.etCatalogUrl.setText(base);
                    binding.etCatalogCode.setText(code);
                    importFromCatalog(base, code);
                    return;
                }
            } catch (e: Exception) {
                // Pas un objet catalogue : repli URL ci-dessous.
            }
        }
        val url = try {
            val uri = android.net.Uri.parse(trimmed)
            uri.getQueryParameter("url") ?: trimmed
        } catch (e: Exception) {
            trimmed
        }
        binding.etImportUrl.setText(url)
        importFromUrl(url)
    }

    private fun pickFile() {
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            type = "*/*"
            putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("application/zip", "application/json", "application/octet-stream"))
            addCategory(Intent.CATEGORY_OPENABLE)
        }
        @Suppress("DEPRECATION")
        startActivityForResult(intent, PICK_FILE_REQUEST)
    }

    // Confirmation de mise à jour (change pack-zip-diff-tuiles) : affichée
    // uniquement quand le jeu existe déjà (PackManager n'appelle qu'alors).
    // Suspend jusqu'au choix ; toujours appelée depuis un thread de fond.
    private suspend fun confirmerMiseAJour(apercu: PackManager.ApercuDiff): Boolean {
        val reponse = kotlinx.coroutines.CompletableDeferred<Boolean>()
        withContext(Dispatchers.Main) {
            val taille = if (apercu.octetsDelta < 1048576) {
                "${apercu.octetsDelta / 1024} Ko"
            } else {
                "%.1f Mo".format(apercu.octetsDelta / 1048576.0)
            }
            android.app.AlertDialog.Builder(requireContext())
                .setTitle("Mettre à jour « ${apercu.gameId} » ?")
                .setMessage(
                    "Différence : ${apercu.ajoutes} ajouté(s), ${apercu.modifies} modifié(s), " +
                        "${apercu.retires} retiré(s) — $taille à appliquer. La partie en cours est préservée."
                )
                .setPositiveButton("Mettre à jour") { _, _ -> reponse.complete(true) }
                .setNegativeButton("Annuler") { _, _ -> reponse.complete(false) }
                .setOnCancelListener { reponse.complete(false) }
                .show()
        }
        return try {
            reponse.await()
        } catch (e: Exception) {
            false
        }
    }

    private fun importFromUrl(url: String) {
        lifecycleScope.launch {
            binding.progressBar.visibility = View.VISIBLE
            binding.progressBar.progress = 0
            binding.btnImportUrl.isEnabled = false
            try {
                val result = withContext(Dispatchers.IO) {
                    packManager.importPackFromUrl(url, { progress ->
                        launch(Dispatchers.Main) {
                            binding.progressBar.progress = (progress * 100).toInt()
                        }
                    }, ::confirmerMiseAJour)
                }
                showVerification(result)
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "Erreur : " + e.message, Toast.LENGTH_LONG).show()
            } finally {
                binding.progressBar.visibility = View.GONE
                binding.btnImportUrl.isEnabled = true
            }
        }
    }

    private fun importFromCatalog(baseUrl: String, code: String) {
        lifecycleScope.launch {
            binding.progressBar.visibility = View.VISIBLE
            binding.progressBar.progress = 0
            binding.btnImportCode.isEnabled = false
            try {
                val result = withContext(Dispatchers.IO) {
                    packManager.importPackFromCatalog(baseUrl, code, { progress ->
                        launch(Dispatchers.Main) {
                            binding.progressBar.progress = (progress * 100).toInt()
                        }
                    }, ::confirmerMiseAJour)
                }
                showVerification(result)
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "Erreur : " + e.message, Toast.LENGTH_LONG).show()
            } finally {
                binding.progressBar.visibility = View.GONE
                binding.btnImportCode.isEnabled = true
            }
        }
    }

    private fun showVerification(result: com.geoplay.shared.pack.PackVerificationResult) {
        android.util.Log.d("GeoPlayDbg", "showVerification: valid=" + result.isValid + " pack=" + result.packName + " erreurs=" + result.errors)
        if (result.miseAJourAnnulee) {
            Toast.makeText(requireContext(), "Mise à jour annulée : jeu inchangé", Toast.LENGTH_SHORT).show()
            refreshLocalCatalog()
            return
        }
        if (result.isValid) {
            Toast.makeText(requireContext(), "Pack verifie : jeu demarrable offline", Toast.LENGTH_SHORT).show()
            // Ouvre le pack installé (change player-local-catalog), jamais un
            // autre : l'identifiant voyage en argument de navigation.
            val args = android.os.Bundle().apply {
                result.packName?.let { putString("packName", it) }
            }
            findNavController().navigate(R.id.action_importFragment_to_gameFragment, args)
        } else {
            // Gating explicite : progression % + fichier fautif nomme (offline-pack).
            val pct = (result.progressPercent * 100).toInt()
            val detail = result.errors.joinToString(" ; ")
            Toast.makeText(
                requireContext(),
                "Pack refuse (" + pct + " %) : " + detail,
                Toast.LENGTH_LONG
            ).show()
        }
    }

    private fun importFromUri(uri: android.net.Uri) {
        lifecycleScope.launch {
            binding.progressBar.visibility = View.VISIBLE
            binding.progressBar.progress = 0
            try {
                requireContext().contentResolver.openInputStream(uri)?.use { inputStream ->
                    val manager = PackManager.getInstance(requireContext())
                    val result = withContext(Dispatchers.IO) {
                        manager.importPack(inputStream, { progress ->
                            launch(Dispatchers.Main) {
                                binding.progressBar.progress = (progress * 100).toInt()
                            }
                        }, ::confirmerMiseAJour)
                    }
                    showVerification(result)
                } ?: Toast.makeText(requireContext(), "Fichier illisible", Toast.LENGTH_LONG).show()
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "Erreur : " + e.message, Toast.LENGTH_LONG).show()
            } finally {
                binding.progressBar.visibility = View.GONE
            }
        }
    }

    @Deprecated("onActivityResult est conservé pour le POC sideload")
    @Suppress("DEPRECATION")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == PICK_FILE_REQUEST && resultCode == Activity.RESULT_OK) {
            data?.data?.let { uri ->
                importFromUri(uri)
            }
        } else if (requestCode == SCAN_QR_REQUEST && resultCode == Activity.RESULT_OK) {
            handleQrContent(data?.getStringExtra("SCAN_RESULT"))
        }
    }

    companion object {
        const val PICK_FILE_REQUEST = 1001
        const val SCAN_QR_REQUEST = 1002
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}

class SettingsFragment : Fragment() {

    private var _binding: FragmentSettingsBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentSettingsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val prefs = requireContext().getSharedPreferences("geoplay_prefs", android.content.Context.MODE_PRIVATE)
        binding.switchCheatMode.isChecked = prefs.getBoolean("cheat_mode", false)
        binding.switchCheatMode.setOnCheckedChangeListener { _, checked ->
            // Mode animateur in-app : bypass GEOFENCE + forceDraw, chaque event porte le flag triche.
            prefs.edit().putBoolean("cheat_mode", checked).apply()
            val msg = if (checked) "Mode animateur ON (triche flaggee)" else "Mode animateur OFF"
            Toast.makeText(requireContext(), msg, Toast.LENGTH_SHORT).show()
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}

class PreviewFragment : Fragment() {

    private var _binding: FragmentPreviewBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentPreviewBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val sessionId = requireArguments().getString("sessionId")
        binding.tvPreviewTitle.text = "Aperçu / Test — $sessionId"
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}

class ReviewFragment : Fragment() {

    private var _binding: FragmentReviewBinding? = null
    private val binding get() = _binding!!
    private var nodeId: String? = null

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentReviewBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        nodeId = requireArguments().getString("nodeId")
        binding.tvReviewNode.text = "Étape: ${nodeId ?: "-"}"
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
