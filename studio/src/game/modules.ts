import type { ModuleScreenPlugin } from "./module-screen-plugin";
import { quizScreenPlugin } from "../components/wysiwyg/plugins/quiz";
import { puzzleScreenPlugin } from "../components/wysiwyg/plugins/puzzle";

export interface ModuleRegistryEntry {
  type: string;
  render?: (data: Record<string, unknown>) => unknown;
  needsLock?: boolean;
  needsInventory?: boolean;
  presentationNeeds?: string[];
  experienceNeeds?: string[];
  producesEffects?: string[];
  screenPlugin?: ModuleScreenPlugin;
}

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

export const MODULE_REGISTRY: Record<string, ModuleRegistryEntry> = {
  QUIZ: { type: "QUIZ", schema: "quiz.json", version: "1.0.0", screenPlugin: quizScreenPlugin },
  DIFFERENCE_GAME: { type: "DIFFERENCE_GAME", schema: "difference-game.json", version: "1.0.0" },
  PUZZLE: { type: "PUZZLE", schema: "puzzle.json", version: "1.0.0", screenPlugin: puzzleScreenPlugin },
  AR_MARKER: { type: "AR_MARKER", schema: "ar-marker.json", version: "1.0.0", needsLock: true },
  BOUSSOLE: { type: "BOUSSOLE", schema: "boussole.json", version: "1.0.0" },
  CODE_INPUT: { type: "CODE_INPUT", schema: "code-input.json", version: "1.0.0", needsInventory: true, presentationNeeds: ["CLUE"], producesEffects: ["MODIFY_VARIABLE"] },
  CLUE_RESOLVER: { type: "CLUE_RESOLVER", schema: "clue-resolver.json", version: "1.0.0", presentationNeeds: ["CLUE"], producesEffects: ["REVEAL_NODE"] },
  ITEM_DROPPER: { type: "ITEM_DROPPER", schema: "item-dropper.json", version: "1.0.0", needsInventory: true, presentationNeeds: ["TOOLBOX"], producesEffects: ["GIVE_ITEM"] },
  ITEM_CONSUMER: { type: "ITEM_CONSUMER", schema: "item-consumer.json", version: "1.0.0", needsInventory: true, presentationNeeds: ["TOOLBOX"], producesEffects: ["REMOVE_ITEM"] }
};
