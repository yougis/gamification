// Helpers purs du widget cartographie (change widget-cartographie) :
// extraction des positions, fabriques par defaut, bornes d'apercu.
// Aucune ecriture, aucun etat : strate 2 strictement passive.
import { computeBbox } from "./mcp";
import type { Game, GameNode, MapWidget, PoiState, Widget } from "./types";

export interface MarqueurCarte {
  id: string;
  // Position relative 0..100 dans le cadre d'apercu (projection
  // equirectangulaire sur la bbox, ou sur le plan indoor actif).
  x: number;
  y: number;
  // Rayon relatif (0..100, meme echelle que x) pour le cercle geofence.
  rayon: number;
}

/** Volet par defaut a la pose : texte (nom du POI) + bouton d'acces a etat lie. */
export function voletCarteDefaut(): NonNullable<MapWidget["volet"]> {
  return {
    widgets: [
      { type: "text", text: "POI", style: "heading" },
      { type: "button", label: "Ouvrir", poiAction: "open-step", variant: "primary" },
    ],
  };
}

/** Widget carte par defaut (menu d'ajout) : source steps, fond tuiles, volet par defaut. */
export function carteWidgetDefaut(): MapWidget {
  return { type: "map", source: { kind: "steps" }, background: "pack-tiles", volet: voletCarteDefaut() };
}

function extraireLatLng(n: GameNode): { lat: number; lng: number; rayon: number } | null {
  for (const c of n.activation.requires) {
    if (c.type === "GEOFENCE" && typeof c.lat === "number" && typeof c.lng === "number") {
      return { lat: c.lat, lng: c.lng, rayon: typeof c.radiusMeters === "number" ? c.radiusMeters : 30 };
    }
  }
  return null;
}

/** Etapes cartographiables (hors pools structurels). */
export function etapesCartographiables(game: Game): GameNode[] {
  return game.nodes.filter((n) => !n.randomPool);
}

/** Le jeu a-t-il une configuration de fond (tuiles ou plans indoor) ? */
export function aFondCarte(game: Game): boolean {
  const g = (game.global ?? {}) as { map?: unknown; indoorPlans?: unknown };
  const mapOk = !!g.map && typeof g.map === "object" && Object.keys(g.map).length > 0;
  const indoorOk = Array.isArray(g.indoorPlans) && g.indoorPlans.length > 0;
  return mapOk || indoorOk;
}

/**
 * Marqueurs en coordonnees relatives 0..100 pour l'apercu auteur.
 * Outdoor : projection sur computeBbox ; indoor : sur le premier plan
 * (x/y en metres rapportes a sizeMeters). Sans position : cadre vide.
 */
export function marqueursCarte(game: Game): MarqueurCarte[] {
  const etapes = etapesCartographiables(game);
  const g = (game.global ?? {}) as {
    indoorPlans?: { id: string; sizeMeters?: { w: number; h: number } }[];
  };
  if (Array.isArray(g.indoorPlans) && g.indoorPlans.length > 0) {
    const plan = g.indoorPlans[0];
    const w = plan.sizeMeters?.w ?? 0;
    const h = plan.sizeMeters?.h ?? 0;
    if (w <= 0 || h <= 0) return [];
    return etapes
      .filter((n) => n.position && n.position.planId === plan.id)
      .map((n) => ({
        id: n.id,
        x: Math.max(0, Math.min(100, (n.position!.x / w) * 100)),
        y: Math.max(0, Math.min(100, (n.position!.y / h) * 100)),
        rayon: 0,
      }));
  }
  const bbox = computeBbox(game);
  if (!bbox) return [];
  const dLat = Math.max(bbox.maxLat - bbox.minLat, 1e-9);
  const dLng = Math.max(bbox.maxLng - bbox.minLng, 1e-9);
  const out: MarqueurCarte[] = [];
  for (const n of etapes) {
    const p = extraireLatLng(n);
    if (!p) continue;
    out.push({
      id: n.id,
      x: ((p.lng - bbox.minLng) / dLng) * 100,
      y: (1 - (p.lat - bbox.minLat) / dLat) * 100,
      rayon: (p.rayon / 111320 / dLat) * 100,
    });
  }
  return out;
}

/** Icone par defaut d'un etat POI (noms du jeu d'icones du Studio). */
export function iconePoiDefaut(etat: PoiState): string {
  switch (etat) {
    case "locked":
      return "alerte";
    case "active":
      return "etape";
    case "completed":
      return "ok";
    case "unlocked":
    default:
      return "lieu";
  }
}

/** Les widgets de volet rendables en apercu (strate 1 hors module/carte). */
export function widgetsVoletApercu(widgets: Widget[] | undefined): Widget[] {
  return (widgets ?? []).filter((w) => w.type === "text" || w.type === "image" || w.type === "button" || w.type === "spacer" || w.type === "progress");
}
