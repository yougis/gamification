import type { ModuleScreenPlugin } from "./module-screen-plugin";
import { MODULE_REGISTRY_BASE, type ModuleRegistryEntry } from "./module-registry";
import { quizScreenPlugin } from "../components/wysiwyg/plugins/quiz";
import { puzzleScreenPlugin } from "../components/wysiwyg/plugins/puzzle";
import { codeInputScreenPlugin } from "../components/wysiwyg/plugins/code-input";
import { differenceGameScreenPlugin } from "../components/wysiwyg/plugins/difference-game";
import { arMarkerScreenPlugin } from "../components/wysiwyg/plugins/ar-marker";
import { boussoleScreenPlugin } from "../components/wysiwyg/plugins/boussole";

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
};

// Tap valide si dans un polygone dilate (unites % : meme espace que les polygones).
export function hitTest(polygons: { x: number; y: number; w: number; h: number }[], px: number, py: number, dilatation: number): boolean {
  return polygons.some(
    (p) => px >= p.x - dilatation && px <= p.x + p.w + dilatation && py >= p.y - dilatation && py <= p.y + p.h + dilatation,
  );
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
