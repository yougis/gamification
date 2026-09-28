package com.geoplay.shared.ui.map

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.foundation.gestures.rememberTransformableState
import androidx.compose.foundation.gestures.transformable
import androidx.compose.foundation.layout.Row
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.geoplay.shared.game.DiscoveryState
import com.geoplay.shared.game.ECHELLE_MIN_VIEWPORT
import com.geoplay.shared.game.accesPoi
import com.geoplay.shared.game.bboxMarqueurs
import com.geoplay.shared.game.bornerEchelle
import com.geoplay.shared.game.cranZoom
import com.geoplay.shared.game.iconePoi
import com.geoplay.shared.game.marqueursCarte
import com.geoplay.shared.game.positionRelative
import com.geoplay.shared.game.voletCarteDefaut
import com.geoplay.shared.model.Game
import com.geoplay.shared.model.MapPoiStyle
import com.geoplay.shared.model.NodeState
import com.geoplay.shared.model.ScreenWidget
import com.geoplay.shared.providers.LocationProvider
import com.geoplay.shared.providers.defaultLocationProvider

// Widget carte joueur (change widget-cartographie) : fond schématique uni
// (les tuiles natives viendront par-dessus quand le shell les fournira),
// pastilles textuelles distinctes sans la couleur seule, cercles géofence
// approximés, position joueur optionnelle. Sélection + volet = état UI
// local : zéro transition moteur, zéro event.
fun symboleEtat(icone: String, etat: NodeState): String {
    val defaut = when (etat) {
        NodeState.LOCKED -> "alerte"
        NodeState.ACTIVE -> "etape"
        NodeState.COMPLETED -> "ok"
        NodeState.UNLOCKED -> "lieu"
    }
    if (icone.isNotBlank() && icone != defaut) return icone
    return when (etat) {
        NodeState.LOCKED -> "■"
        NodeState.UNLOCKED -> "●"
        NodeState.ACTIVE -> "▶"
        NodeState.COMPLETED -> "✓"
    }
}

// Position joueur (change carte-joueur-navigable, phase 2) : snapshot de la
// source plateforme, absence gracieuse (stub/fallback, permission refusée,
// exception → null = carte complète sans point, jamais bloquant). Le
// snapshot est repris à chaque recomposition liée au jeu/états.
@Composable
fun rememberPositionJoueur(
    provider: LocationProvider = remember { defaultLocationProvider() },
): Pair<Double, Double>? {
    return remember(provider) {
        try {
            val fix = provider.currentPosition()
            if (fix.fallback) null else fix.lat to fix.lng
        } catch (_: Exception) {
            null
        }
    }
}

@Composable
fun MapWidgetBlock(
    widget: ScreenWidget,
    game: Game,
    states: Map<String, NodeState>,
    discovery: DiscoveryState = DiscoveryState(),
    onOpenNode: (String) -> Unit = {},
    // Plein écran (change widget-cartographie) : l'icône du widget ouvre la
    // carte à la place de HOME ; retour via l'entrée Accueil (navigation).
    // Absent = pas d'ouverture plein écran.
    onPleinEcran: ((ScreenWidget) -> Unit)? = null,
    // Rendu du contenu strate 1 du volet (textes, boutons non liés…).
    // Absent = pastille texte.
    renduVolet: @Composable (ScreenWidget) -> Unit = { w ->
        Text(w.text ?: w.label ?: w.type, style = MaterialTheme.typography.bodyMedium)
    },
    position: Pair<Double, Double>? = null,
    modifier: Modifier = Modifier,
) {
    val marqueurs = remember(game, states, discovery, widget.source) {
        marqueursCarte(game, states, discovery, widget.source?.filter)
    }
    var selection by remember(widget) { mutableStateOf<String?>(null) }
    // Viewport navigable (change carte-joueur-navigable, phase 2) : état UI
    // strictement local — pan/zoom ne produisent ni transition ni event.
    // Échelle 1 = cadrage bbox ; boutons par cran ; recentrage = réinitialise.
    var echelle by remember(widget) { mutableFloatStateOf(1f) }
    var decalagePx by remember(widget) { mutableStateOf(Offset.Zero) }
    val transformable = rememberTransformableState { zoomChange, panChange, _ ->
        echelle = bornerEchelle(echelle * zoomChange)
        decalagePx += panChange
    }
    val bbox = remember(marqueurs) { bboxMarqueurs(marqueurs) }
    val fond = when (widget.background) {
        "indoor-plan" -> Color(0xFF1A1A2E)
        "solid" -> MaterialTheme.colorScheme.surface
        else -> Color(0xFF14141F)
    }
    val styles = widget.poiStyle?.let {
        MapPoiStyle(it.locked, it.unlocked, it.active, it.completed)
    }
    Column(modifier = modifier.fillMaxWidth()) {
        if (widget.icon != null && onPleinEcran != null) {
            TextButton(onClick = { onPleinEcran(widget) }) { Text("⤢ Carte") }
        }
        Row {
            TextButton(
                onClick = { echelle = cranZoom(echelle, -1) },
                modifier = Modifier.semantics { contentDescription = "Zoom arrière" },
            ) { Text("−") }
            TextButton(
                onClick = { echelle = cranZoom(echelle, 1) },
                modifier = Modifier.semantics { contentDescription = "Zoom avant" },
            ) { Text("+") }
            TextButton(
                onClick = { echelle = ECHELLE_MIN_VIEWPORT; decalagePx = Offset.Zero },
                modifier = Modifier.semantics { contentDescription = "Recentrer la carte" },
            ) { Text("◎") }
        }
        BoxWithConstraints(
            modifier = Modifier.fillMaxWidth().height(220.dp).background(fond),
        ) {
            // Projection unique (marqueurs + position) : relatif bbox puis
            // zoom centré + pan. Marqueurs, cercles et volet suivent le
            // viewport ; le volet (hors cadre) est inchangé.
            val densite = LocalDensity.current
            val dx = with(densite) { decalagePx.x.toDp() }
            val dy = with(densite) { decalagePx.y.toDp() }
            fun projeter(relX: Float, relY: Float): Pair<Dp, Dp> {
                val cx = maxWidth / 2
                val cy = maxHeight / 2
                val px = cx + (maxWidth * relX - cx) * echelle + dx
                val py = cy + (maxHeight * relY - cy) * echelle + dy
                return px to py
            }
            Box(modifier = Modifier.matchParentSize().transformable(transformable)) {
            if (marqueurs.isEmpty() || bbox == null) {
                Text(
                    "Aucune étape positionnée",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.align(Alignment.Center),
                )
            } else {
                for (m in marqueurs) {
                    val (x, y) = positionRelative(m, bbox)
                    val etat = states[m.id] ?: NodeState.LOCKED
                    val (px, py) = projeter(x, y)
                    Pastille(
                        xDp = px,
                        yDp = py,
                        symbole = symboleEtat(iconePoi(styles, etat), etat),
                        nom = m.id,
                        selectionne = selection == m.id,
                        onSelect = { selection = if (selection == m.id) null else m.id },
                    )
                }
                if (position != null) {
                    val dLat = (bbox.maxLat - bbox.minLat).coerceAtLeast(1e-9)
                    val dLng = (bbox.maxLng - bbox.minLng).coerceAtLeast(1e-9)
                    val x = ((position.second - bbox.minLng) / dLng).toFloat().coerceIn(0f, 1f)
                    val y = (1.0 - (position.first - bbox.minLat) / dLat).toFloat().coerceIn(0f, 1f)
                    val (px, py) = projeter(x, y)
                    Box(
                        modifier = Modifier
                            .offset(x = px - 6.dp, y = py - 6.dp)
                            .size(12.dp)
                            .background(Color(0xFF4DA3FF), CircleShape),
                    )
                }
            }
            }
        }
        val sel = selection?.let { id -> marqueurs.find { it.id == id } }
        if (sel != null) {
            VoletCarte(
                widget = widget,
                id = sel.id,
                etat = states[sel.id] ?: NodeState.LOCKED,
                onOpenNode = onOpenNode,
                onFermer = { selection = null },
                renduVolet = renduVolet,
            )
        }
    }
}

@Composable
private fun Pastille(
    xDp: Dp,
    yDp: Dp,
    symbole: String,
    nom: String,
    selectionne: Boolean,
    onSelect: () -> Unit,
) {
    Box(
        modifier = Modifier
            .offset(x = xDp - 14.dp, y = yDp - 14.dp)
            .semantics { contentDescription = nom }
            .clickable(onClick = onSelect),
    ) {
        Text(
            text = symbole,
            color = if (selectionne) MaterialTheme.colorScheme.primary else Color.White,
            style = MaterialTheme.typography.titleLarge,
            modifier = Modifier
                .background(Color.Black.copy(alpha = 0.45f), CircleShape)
                .padding(horizontal = 6.dp, vertical = 2.dp),
        )
    }
}

@Composable
private fun VoletCarte(
    widget: ScreenWidget,
    id: String,
    etat: NodeState,
    onOpenNode: (String) -> Unit,
    onFermer: () -> Unit,
    renduVolet: @Composable (ScreenWidget) -> Unit,
) {
    val volet = widget.volet?.widgets?.takeIf { it.isNotEmpty() } ?: voletCarteDefaut()
    val (etiquette, actif) = accesPoi(etat)
    val aBoutonLie = volet.any { it.type == "button" && it.poiAction == "open-step" }
    Column(modifier = Modifier.fillMaxWidth().padding(8.dp)) {
        Text(id, style = MaterialTheme.typography.titleMedium)
        for (w in volet) {
            when {
                w.type == "button" && w.poiAction == "open-step" -> {
                    if (actif) {
                        Button(onClick = { onOpenNode(id) }, modifier = Modifier.fillMaxWidth()) {
                            Text(w.label?.takeIf { it.isNotBlank() } ?: etiquette)
                        }
                    } else {
                        OutlinedButton(onClick = {}, enabled = false, modifier = Modifier.fillMaxWidth()) {
                            Text("Verrouillé")
                        }
                    }
                }
                w.type == "map" || w.type == "module" -> {
                    Text("(contenu non affichable dans le volet)", style = MaterialTheme.typography.labelSmall)
                }
                else -> renduVolet(w)
            }
        }
        if (!aBoutonLie && actif) {
            // Volet auteur sans bouton lié : proposition d'ouverture de repli.
            Button(onClick = { onOpenNode(id) }, modifier = Modifier.fillMaxWidth()) {
                Text("Ouvrir : $id")
            }
        }
        TextButton(onClick = onFermer) { Text("Fermer") }
    }
}
