package com.geoplay.shared.game

import com.geoplay.shared.model.ConditionType
import com.geoplay.shared.model.Game
import com.geoplay.shared.model.MapPoiStyle
import com.geoplay.shared.model.NodeState
import com.geoplay.shared.model.ScreenWidget

// Logique pure du widget carte (change widget-cartographie) : extraction des
// marqueurs, filtre discovery, étiquette d'accès, icônes par état, bbox.
// Strate 2 strictement passive : aucune transition, aucun event — les
// composables ne font que lire ces valeurs.

// Icônes par défaut, distinguables sans la couleur seule.
fun iconePoiDefaut(etat: NodeState): String = when (etat) {
    NodeState.LOCKED -> "alerte"
    NodeState.ACTIVE -> "etape"
    NodeState.COMPLETED -> "ok"
    NodeState.UNLOCKED -> "lieu"
}

fun iconePoi(style: MapPoiStyle?, etat: NodeState): String {
    val custom = when (etat) {
        NodeState.LOCKED -> style?.locked
        NodeState.ACTIVE -> style?.active
        NodeState.COMPLETED -> style?.completed
        NodeState.UNLOCKED -> style?.unlocked
    }
    return custom?.takeIf { it.isNotBlank() } ?: iconePoiDefaut(etat)
}

data class MarqueurCarte(
    val id: String,
    val lat: Double,
    val lng: Double,
    val rayonM: Int,
    val etat: NodeState
)

data class BboxMarqueurs(val minLat: Double, val minLng: Double, val maxLat: Double, val maxLng: Double)

/**
 * Marqueurs de la carte : étapes non-pool avec position GEOFENCE, filtrées
 * discovery (`discovered` par défaut : les non-découvertes restent
 * invisibles ; `all` les montre toutes avec avertissement côté Studio).
 */
fun marqueursCarte(
    game: Game,
    states: Map<String, NodeState>,
    discoveryState: DiscoveryState = DiscoveryState(),
    filter: String? = null,
): List<MarqueurCarte> {
    val tout = filter == "all"
    return game.nodes.mapNotNull { n ->
        if (n.randomPool != null) return@mapNotNull null
        if (!tout && !evaluateDiscovery(n, discoveryState)) return@mapNotNull null
        val g = n.activation.requires.firstOrNull {
            it.type == ConditionType.GEOFENCE && it.lat != null && it.lng != null
        } ?: return@mapNotNull null
        MarqueurCarte(
            id = n.id,
            lat = g.lat!!,
            lng = g.lng!!,
            rayonM = g.radiusMeters ?: 30,
            etat = states[n.id] ?: NodeState.LOCKED,
        )
    }
}

/** Bbox des marqueurs + marge 200 m (miroir Studio computeBbox), null si vide. */
fun bboxMarqueurs(marqueurs: List<MarqueurCarte>): BboxMarqueurs? {
    if (marqueurs.isEmpty()) return null
    var minLat = Double.MAX_VALUE
    var minLng = Double.MAX_VALUE
    var maxLat = -Double.MAX_VALUE
    var maxLng = -Double.MAX_VALUE
    for (m in marqueurs) {
        if (m.lat < minLat) minLat = m.lat
        if (m.lng < minLng) minLng = m.lng
        if (m.lat > maxLat) maxLat = m.lat
        if (m.lng > maxLng) maxLng = m.lng
    }
    val centreLat = (minLat + maxLat) / 2.0
    val margeLat = 200.0 / 111320.0
    val margeLng = 200.0 / (111320.0 * kotlin.math.cos(Math.toRadians(centreLat)).coerceAtLeast(0.01))
    return BboxMarqueurs(minLat - margeLat, minLng - margeLng, maxLat + margeLat, maxLng + margeLng)
}

/** Position relative 0..1 dans le cadre (projection équirectangulaire). */
fun positionRelative(m: MarqueurCarte, bbox: BboxMarqueurs): Pair<Float, Float> {
    val dLat = (bbox.maxLat - bbox.minLat).coerceAtLeast(1e-9)
    val dLng = (bbox.maxLng - bbox.minLng).coerceAtLeast(1e-9)
    return (((m.lng - bbox.minLng) / dLng).toFloat() to (1.0 - (m.lat - bbox.minLat) / dLat).toFloat())
}

/** Étiquette + activation du bouton d'accès : Ouvrir si éligible, sinon Verrouillé. */
fun accesPoi(etat: NodeState): Pair<String, Boolean> =
    if (etat == NodeState.UNLOCKED) "Ouvrir" to true else "Verrouillé" to false

/** Volet par défaut d'un widget carte sans volet auteur (texte + bouton lié). */
fun voletCarteDefaut(): List<ScreenWidget> = listOf(
    ScreenWidget(type = "text", text = "POI", style = "heading"),
    ScreenWidget(type = "button", label = "Ouvrir", poiAction = "open-step", variant = "primary"),
)

/** Widgets carte d'un écran (dock HOME, plein écran) : toutes zones confondues. */
fun widgetsCarteEcran(screen: com.geoplay.shared.model.ScreenDefinition?): List<ScreenWidget> {
    val zones = screen?.zones ?: return emptyList()
    return listOfNotNull(zones.header, zones.content, zones.footer, zones.overlay)
        .flatMap { it.widgets }
        .filter { it.type == "map" }
}
