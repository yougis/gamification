import type { ModuleScreenPlugin } from "./module-screen-plugin";
import { estPolygone, type DiffZone } from "../components/wysiwyg/plugins/difference-game";
import { MODULE_REGISTRY_BASE, type ModuleRegistryEntry } from "./module-registry";
import { quizScreenPlugin } from "../components/wysiwyg/plugins/quiz";
import { puzzleScreenPlugin } from "../components/wysiwyg/plugins/puzzle";
import { codeInputScreenPlugin } from "../components/wysiwyg/plugins/code-input";
import { differenceGameScreenPlugin } from "../components/wysiwyg/plugins/difference-game";
import { arMarkerScreenPlugin } from "../components/wysiwyg/plugins/ar-marker";
import { boussoleScreenPlugin } from "../components/wysiwyg/plugins/boussole";
import { infoScreenPlugin } from "../components/wysiwyg/plugins/info";

export type { ModuleRegistryEntry };

// Registre complet côté Studio (données pures + plugins d'écran React).
// Le validateur, l'évaluateur de compatibilité et les tests tsx importent
// `module-registry.ts` directement pour éviter la chaîne JSX.
export const MODULE_REGISTRY: Record<string, ModuleRegistryEntry> = {
  ...MODULE_REGISTRY_BASE,
  QUIZ: { ...MODULE_REGISTRY_BASE.QUIZ, screenPlugin: quizScreenPlugin },
  PUZZLE: { ...MODULE_REGISTRY_BASE.PUZZLE, screenPlugin: puzzleScreenPlugin },
  CODE_INPUT: { ...MODULE_REGISTRY_BASE.CODE_INPUT, screenPlugin: codeInputScreenPlugin },
  DIFFERENCE_GAME: { ...MODULE_REGISTRY_BASE.DIFFERENCE_GAME, screenPlugin: differenceGameScreenPlugin },
  AR_MARKER: { ...MODULE_REGISTRY_BASE.AR_MARKER, screenPlugin: arMarkerScreenPlugin },
  BOUSSOLE: { ...MODULE_REGISTRY_BASE.BOUSSOLE, screenPlugin: boussoleScreenPlugin },
  INFO: { ...MODULE_REGISTRY_BASE.INFO, screenPlugin: infoScreenPlugin },
};

// Tap valide si dans une zone dilatee (unites % : meme espace que les zones).
// Rectangle : boite elargie de `dilatation` de chaque cote (comportement
// historique). Polygone : interieur (parite des croisements) OU distance a
// une arete <= `dilatation` (change zones-7-erreurs).
export function hitTest(polygons: DiffZone[], px: number, py: number, dilatation: number): boolean {
  return polygons.some((p) => {
    if (!estPolygone(p)) {
      return px >= p.x - dilatation && px <= p.x + p.w + dilatation && py >= p.y - dilatation && py <= p.y + p.h + dilatation;
    }
    const pts = p.points;
    if (dansPolygone(pts, px, py)) return true;
    if (dilatation <= 0 || pts.length < 2) return false;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if (distanceSegment(px, py, a.x, a.y, b.x, b.y) <= dilatation) return true;
    }
    return false;
  });
}

function dansPolygone(pts: { x: number; y: number }[], px: number, py: number): boolean {
  let dedans = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x;
    const yi = pts[i].y;
    const xj = pts[j].x;
    const yj = pts[j].y;
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) dedans = !dedans;
  }
  return dedans;
}

function distanceSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.min(Math.max(((px - ax) * dx + (py - ay) * dy) / l2, 0), 1);
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export interface ArCaps {
  cameraGranted: boolean;
  arSupported: boolean;
  modelSizeMb: number;
  budgetMb: number;
}

export function arMode(caps: ArCaps): { mode: "ar" | "fallback2D"; motif: string } {
  if (!caps.cameraGranted) return { mode: "fallback2D", motif: "camera refusee ou indisponible" };
  if (!caps.arSupported) return { mode: "fallback2D", motif: "AR non supporte par l'appareil" };
  if (caps.modelSizeMb > caps.budgetMb) {
    return { mode: "fallback2D", motif: `modele ${caps.modelSizeMb} Mo > budget ${caps.budgetMb} Mo` };
  }
  return { mode: "ar", motif: "capteurs et budget OK" };
}
