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
import androidx.recyclerview.widget.LinearLayoutManager
import com.geoplay.player.R
import com.geoplay.player.data.GameRepository
import com.geoplay.player.data.PackManager
import com.geoplay.player.databinding.FragmentGameBinding
import com.geoplay.player.databinding.FragmentHomeBinding
import com.geoplay.player.databinding.FragmentImportBinding
import com.geoplay.player.databinding.FragmentModuleBinding
import com.geoplay.player.databinding.FragmentPreviewBinding
import com.geoplay.player.databinding.FragmentReviewBinding
import com.geoplay.player.databinding.FragmentSettingsBinding
import com.geoplay.shared.game.Sim
import com.geoplay.shared.game.evaluate
import com.geoplay.shared.model.Game
import com.geoplay.shared.model.OnReentry
import kotlinx.coroutines.Dispatchers
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
    private var game: Game? = null
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
        binding.rvQueue.layoutManager = LinearLayoutManager(requireContext())
        requestLocationWithRationale()
        loadGame()
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

    private fun loadGame() {
        lifecycleScope.launch {
            val prefs = requireContext().getSharedPreferences("geoplay_prefs", android.content.Context.MODE_PRIVATE)
            isCheatMode = prefs.getBoolean("cheat_mode", false)
            val loaded = withContext(Dispatchers.IO) {
                try {
                    val packManager = PackManager.getInstance(requireContext())
                    val packs = packManager.getInstalledPacks()
                    val first = packs.firstOrNull()?.let { packManager.loadPack(it) }
                    first ?: loadReferencePack()
                } catch (e: Exception) {
                    loadReferencePack()
                }
            }
            if (loaded != null) {
                setupGame(loaded)
            } else {
                binding.tvGameTitle.text = "Aucun pack installe"
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
        // Reprendre = meme sessionId relit ; nouvelle partie = nouveau sessionId (offline-pack + player-install).
        val argSession = arguments?.getString("sessionId")
        lifecycleScope.launch {
            val sid = withContext(Dispatchers.IO) { resolveSession(game, argSession) }
            sessionId = sid
            withContext(Dispatchers.IO) { restoreProgress(sid) }
            withContext(Dispatchers.IO) { ensureBootDraws() }
            val cheatTag = if (isCheatMode) " [animateur]" else ""
            binding.tvGameTitle.text = "Partie: " + game.gameId + cheatTag
            updateUI()
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
                else -> false
            }
            if (!ok) return false
        }
        return true
    }

    private fun updateUI() {
        val game = this.game ?: return
        lifecycleScope.launch {
            withContext(Dispatchers.IO) { ensureActivationDraws() }
            // Mode animateur : bypass capteurs (file FIFO inchangee), flag triche sur les events.
            if (isCheatMode) {
                game.nodes.forEach { n ->
                    sim.present.add(n.id)
                    sim.dwellOk.add(n.id)
                }
                sim.accuracyM = 5
            }
            sim.nowMs = System.currentTimeMillis() - gameStartMs
            val ev = evaluate(game, sim, draws.toMap(), done.toMap(), counts.toMap(), emptySet())

            binding.tvCurrentNode.text = "Etape actuelle: " + (currentNodeId ?: "-")
            binding.tvActiveNode.text = if (activeId != null) "Active: $activeId" else "Aucune"

            binding.rvQueue.adapter = QueueAdapter(ev.queue) { id ->
                activeId = id
                currentNodeId = id
                updateUI()
            }

            binding.btnComplete.setOnClickListener { completeCurrent(false) }
            binding.btnAbandon.setOnClickListener { completeCurrent(true) }

            // Tableau de bord (change player-home-dashboard) : même règle
            // et même contenu que le partagé. Ouvrir = tête de file via le
            // même chemin que le clic file (aucun event ajouté).
            val showHome = "HOME" in game.global.presentation
            binding.cardHome.visibility = if (showHome) View.VISIBLE else View.GONE
            if (showHome) {
                val homeNow = System.currentTimeMillis() - gameStartMs
                binding.tvHomeElapsed.text = "⏱ " + com.geoplay.shared.ui.home.formatDuration(homeNow)
                binding.tvHomeList.text = game.nodes
                    .filter { it.randomPool == null }
                    .joinToString("\n") { n ->
                        val state = when {
                            done.containsKey(n.id) -> "Terminée"
                            n.id == activeId -> "En cours"
                            ev.unlocked.contains(n.id) -> "Disponible"
                            else -> "Verrouillée"
                        }
                        val rest = com.geoplay.shared.game.timerRemainingMs(n, done.toMap(), homeNow)
                        n.id + " — " + state + (if (rest != null) " — dans " + com.geoplay.shared.ui.home.formatDuration(rest) else "")
                    }
                val head = activeId ?: ev.queue.firstOrNull()
                if (head != null && !done.containsKey(head)) {
                    binding.btnHomeOpen.visibility = View.VISIBLE
                    binding.btnHomeOpen.text = "Ouvrir : $head"
                    binding.btnHomeOpen.setOnClickListener {
                        activeId = head
                        currentNodeId = head
                        updateUI()
                    }
                } else {
                    binding.btnHomeOpen.visibility = View.GONE
                }
            }

            // Boîte à outils (change player-inventory-toolbox) : règle
            // triple lue du JSON — l'overlay ne touche ni moteur ni file.
            binding.btnToolbox.visibility =
                if (com.geoplay.shared.game.toolboxIconVisible(game, activeId)) View.VISIBLE else View.GONE
            binding.btnToolbox.setOnClickListener { openToolbox() }
        }
    }

    // Boîte à outils en overlay (change player-inventory-toolbox) : un
    // dialogue par-dessus l'écran courant, fermeture = reprise exacte
    // (aucun état moteur, file ou progression n'est touché — seuls les
    // events de journal INVENTORY_OPENED/ITEM_SELECTED sont appendés).
    private fun openToolbox() {
        val game = this.game ?: return
        val sid = sessionId ?: return
        lifecycleScope.launch {
            repository.logInventoryEvent(sid, "INVENTORY_OPENED")
            val owned = withContext(Dispatchers.IO) { repository.getInventory(sid) }
            val names = game.objects.associate { it.id to it.name }
            val lines = owned.map { e -> "${names[e.itemId] ?: e.itemId} × ${e.quantity}" }
            val items = owned.map { it.itemId }.toTypedArray()
            val dialog = android.app.AlertDialog.Builder(requireContext())
                .setTitle("Boîte à outils")
                .setNegativeButton("Fermer", null)
            if (lines.isEmpty()) {
                dialog.setMessage("Boîte à outils vide.")
            } else {
                dialog.setItems(lines.toTypedArray()) { _, which ->
                    val itemId = items[which]
                    lifecycleScope.launch {
                        repository.logInventoryEvent(sid, "ITEM_SELECTED", itemId)
                        val desc = game.objects.find { it.id == itemId }?.description
                        Toast.makeText(
                            requireContext(),
                            (names[itemId] ?: itemId) + (if (desc.isNullOrBlank()) "" else " — $desc"),
                            Toast.LENGTH_SHORT
                        ).show()
                    }
                }
            }
            dialog.show()
        }
    }

    private fun completeCurrent(abandon: Boolean) {        val id = activeId ?: run {
            Toast.makeText(requireContext(), "Aucune etape active", Toast.LENGTH_SHORT).show()
            return
        }
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
            if (!abandon) {
                val now = System.currentTimeMillis()
                done[id] = now
                // Ecriture immediate SQLite (progression + scores), jamais recalcule.
                withContext(Dispatchers.IO) {
                    repository.completeNode(sid, id, score = 10, isReplay = isReplay, isCheat = isCheatMode)
                    val scoreKept = !isReplay || node.scoreOnReplay
                    repository.recordScore(sid, id, if (scoreKept) 10 else 0, isCheatMode)
                    // Effets d'inventaire (même règle que la PWA) : GIVE/REMOVE
                    // alimentent la boîte à outils + journal (flag triche suivi).
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
            }
            if (node.isEnding && !abandon) {
                val tag = if (isCheatMode) " [animateur]" else ""
                Toast.makeText(requireContext(), "FIN atteinte : " + node.id + tag, Toast.LENGTH_LONG).show()
            }
            activeId = null
            updateUI()
        }
    }

    override fun onDestroyView() {
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

    private fun importFromUrl(url: String) {
        lifecycleScope.launch {
            binding.progressBar.visibility = View.VISIBLE
            binding.progressBar.progress = 0
            binding.btnImportUrl.isEnabled = false
            try {
                val result = withContext(Dispatchers.IO) {
                    packManager.importPackFromUrl(url) { progress ->
                        launch(Dispatchers.Main) {
                            binding.progressBar.progress = (progress * 100).toInt()
                        }
                    }
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
                    packManager.importPackFromCatalog(baseUrl, code) { progress ->
                        launch(Dispatchers.Main) {
                            binding.progressBar.progress = (progress * 100).toInt()
                        }
                    }
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
        if (result.isValid) {
            Toast.makeText(requireContext(), "Pack verifie : jeu demarrable offline", Toast.LENGTH_SHORT).show()
            findNavController().navigate(R.id.action_importFragment_to_gameFragment)
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
                        manager.importPack(inputStream) { progress ->
                            launch(Dispatchers.Main) {
                                binding.progressBar.progress = (progress * 100).toInt()
                            }
                        }
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

class ModuleFragment : Fragment() {

    private var _binding: FragmentModuleBinding? = null
    private val binding get() = _binding!!
    private var nodeId: String? = null

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentModuleBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        nodeId = requireArguments().getString("nodeId")
        binding.tvModuleTitle.text = nodeId ?: "Module"
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
