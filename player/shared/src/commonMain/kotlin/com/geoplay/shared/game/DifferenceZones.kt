package com.geoplay.shared.game

import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min

// Zones du 7-erreurs (change zones-7-erreurs) : rectangle historique OU
// polygone (sommets en %), miroir de `hitTest` côté Studio. Unités % :
// même espace que les zones, dilatation en marge.

// Rectangle {x, y, w, h} en %.
data class RectZone(val x: Double, val y: Double, val w: Double, val h: Double)

// Polygone {points: [{x, y}, ...]} en %, au moins 3 sommets.
data class PolyZone(val points: List<ZonePoint>)

data class ZonePoint(val x: Double, val y: Double)

sealed interface DiffZone {
    data class Rect(val zone: RectZone) : DiffZone
    data class Poly(val zone: PolyZone) : DiffZone
}

// Tap valide si dans une zone dilatée : rectangle élargi de chaque côté
// (comportement historique), polygone intérieur (parité) OU à une distance
// d'arête <= dilatation.
fun hitTest(zones: List<DiffZone>, px: Double, py: Double, dilatation: Double): Boolean =
    zones.any { zone ->
        when (zone) {
            is DiffZone.Rect -> {
                val r = zone.zone
                px >= r.x - dilatation && px <= r.x + r.w + dilatation &&
                    py >= r.y - dilatation && py <= r.y + r.h + dilatation
            }
            is DiffZone.Poly -> {
                val pts = zone.zone.points
                if (pointInPolygon(pts, px, py)) true
                else if (dilatation <= 0.0 || pts.size < 2) false
                else pts.indices.any { i ->
                    val a = pts[i]
                    val b = pts[(i + 1) % pts.size]
                    distToSegment(px, py, a.x, a.y, b.x, b.y) <= dilatation
                }
            }
        }
    }

fun pointInPolygon(pts: List<ZonePoint>, px: Double, py: Double): Boolean {
    var inside = false
    var j = pts.size - 1
    for (i in pts.indices) {
        val xi = pts[i].x
        val yi = pts[i].y
        val xj = pts[j].x
        val yj = pts[j].y
        if (yi > py != yj > py && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside
        j = i
    }
    return inside
}

fun distToSegment(px: Double, py: Double, ax: Double, ay: Double, bx: Double, by: Double): Double {
    val dx = bx - ax
    val dy = by - ay
    val l2 = dx * dx + dy * dy
    if (l2 == 0.0) return hypot(px - ax, py - ay)
    val t = min(max(((px - ax) * dx + (py - ay) * dy) / l2, 0.0), 1.0)
    return hypot(px - (ax + t * dx), py - (ay + t * dy))
}
