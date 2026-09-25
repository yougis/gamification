// Registre des modules, données pures (change player-pwa-shell).
// AUCUN import de composant ici : ce fichier doit rester importable hors
// navigateur (tests tsx, validateur, évaluateur de compatibilité). Les
// screenPlugins (React) sont branchés dans `modules.ts`, seule surcouche UI.
import type { ModuleScreenPlugin } from "./module-screen-plugin";

export interface ModuleRegistryEntry {
  type: string;
  render?: (data: Record<string, unknown>) => unknown;
  schema?: string;
  version?: string;
  needsGPS?: boolean;
  needsCompass?: boolean;
  needsCamera?: boolean;
  needsMap?: boolean;
  needsLock?: boolean;
  needsInventory?: boolean;
  presentationNeeds?: string[];
  experienceNeeds?: string[];
  producesEffects?: string[];
  screenPlugin?: ModuleScreenPlugin;
}

export const MODULE_REGISTRY_BASE: Record<string, ModuleRegistryEntry> = {
  QUIZ: { type: "QUIZ", schema: "quiz.json", version: "1.0.0" },
  DIFFERENCE_GAME: { type: "DIFFERENCE_GAME", schema: "difference-game.json", version: "1.0.0" },
  PUZZLE: { type: "PUZZLE", schema: "puzzle.json", version: "1.0.0" },
  AR_MARKER: { type: "AR_MARKER", schema: "ar-marker.json", version: "1.0.0", needsCamera: true, needsLock: true },
  BOUSSOLE: { type: "BOUSSOLE", schema: "boussole.json", version: "1.0.0", needsCompass: true },
  CODE_INPUT: { type: "CODE_INPUT", schema: "code-input.json", version: "1.0.0", needsInventory: true, presentationNeeds: ["CLUE"], producesEffects: ["MODIFY_VARIABLE"] },
  INFO: { type: "INFO", schema: "info.json", version: "1.0.0" },
  CLUE_RESOLVER: { type: "CLUE_RESOLVER", schema: "clue-resolver.json", version: "1.0.0", presentationNeeds: ["CLUE"], producesEffects: ["REVEAL_NODE"] },
  ITEM_DROPPER: { type: "ITEM_DROPPER", schema: "item-dropper.json", version: "1.0.0", needsInventory: true, presentationNeeds: ["TOOLBOX"], producesEffects: ["GIVE_ITEM"] },
  ITEM_CONSUMER: { type: "ITEM_CONSUMER", schema: "item-consumer.json", version: "1.0.0", needsInventory: true, presentationNeeds: ["TOOLBOX"], producesEffects: ["REMOVE_ITEM"] }
};

// Types proposés à la création d'étape (change
// studio-info-registry-cleanup) : entrées du registre dans l'ordre,
// INFO premier par habitude, RANDOM_POOL structurel en dernier. Fonction
// pure (importable hors navigateur) : chaque type exactement une fois —
// aucun doublon possible même quand un type rejoint le registre, et les
// clés techniques (`$comment` de registry.json) n'y figurent jamais.
export function typesCreation(): string[] {
  const types = Object.keys(MODULE_REGISTRY_BASE).filter((t) => t !== "INFO" && !t.startsWith("$"));
  return ["INFO", ...types, "RANDOM_POOL"];
}
