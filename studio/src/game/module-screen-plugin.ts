// Contrat ModuleScreenPlugin + registre de recherche (change studio-screen-wysiwyg).
// Chaque type de module peut enregistrer un screenPlugin : apercu editeur,
// panneau de proprietes, rendu joueur, ecran par defaut, styles customisables.
// La table PLUGINS ci-dessous est renseignee par les plugins implémentes ;
// getScreenPlugin consulte aussi l'entree du registre de modules (modules.ts),
// ce qui permet d'ajouter un plugin sans toucher ce fichier.
import type { ComponentType } from "react";
import { MODULE_REGISTRY } from "./modules";
import type { Branding, ExperienceStyle, MinigameDefaults, ScreenDefinition } from "./types";

export interface ModuleEditorPreviewProps {
  data: Record<string, unknown>;
}

export interface ModulePropertiesPanelProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  readOnly?: boolean;
  // Defauts globaux des mini-jeux (change studio-screen-editor) : affiches
  // comme valeurs heritees dans les blocs QCM/puzzle.
  minigameDefaults?: MinigameDefaults;
  // Enregistrement d'un fichier image au manifest (change
  // studio-media-templates) : retourne le chemin d'asset.
  onPickFile?: (file: File) => Promise<string>;
  // Renvoi vers l'atelier d'édition (change zones-7-erreurs) : quand fourni,
  // le panneau affiche un aperçu + un bouton vers l'éditeur grand format
  // au lieu du traceur intégré. Absent = comportement historique.
  onEditerZones?: () => void;
}

export interface ModulePlayerRendererProps {
  data: Record<string, unknown>;
  branding?: Branding;
  experienceStyle?: ExperienceStyle;
  onComplete?: (score: number) => void;
  // Indice résolu depuis inventoryHints pour l'événement courant (Nœud
  // ACTIVE uniquement, fourni par l'appelant). Passif : zone d'affichage,
  // jamais de modale, ne vole pas le focus, ne change ni état ni score.
  hint?: string | null;
}

export interface ModuleScreenPlugin {
  type: string;
  label: string;
  icon: string;
  zoneNeeds: { content: boolean; header: boolean; footer: boolean };
  defaultScreen: ScreenDefinition;
  editorPreview: ComponentType<ModuleEditorPreviewProps>;
  propertiesPanel: ComponentType<ModulePropertiesPanelProps>;
  playerRenderer: ComponentType<ModulePlayerRendererProps>;
  customizableStyles: {
    backgroundColor?: boolean;
    textColor?: boolean;
    fontSize?: boolean;
    fontFamily?: boolean;
    fontWeight?: boolean;
    borderRadius?: boolean;
  };
}

// Table des plugins implementes (import type-only cote plugin : pas de cycle).
export function getScreenPlugin(type: string): ModuleScreenPlugin | null {
  return MODULE_REGISTRY[type]?.screenPlugin ?? null;
}

export function hasScreenPlugin(type: string): boolean {
  return getScreenPlugin(type) !== null;
}

export function getPreview(type: string): ComponentType<ModuleEditorPreviewProps> | null {
  return getScreenPlugin(type)?.editorPreview ?? null;
}

// Rendu joueur du module (change studio-player-preview) : null si le type
// est inconnu ou sans renderer — l'appelant affiche un état non bloquant.
export function getPlayer(type: string): ComponentType<ModulePlayerRendererProps> | null {
  return getScreenPlugin(type)?.playerRenderer ?? null;
}

// Ecran generique content-only (change studio-module-first) pour les types
// sans screenPlugin : un widget `{ type: "module" }` rendu comme placeholder.
const ECRAN_GENERIQUE: ScreenDefinition = {
  layout: "default",
  zones: { content: { layout: "stack", widgets: [{ type: "module" }] } },
};

// Ecran initial d'un Nœud (change studio-module-first) : clone profond du
// `defaultScreen` du screenPlugin du type, ou ecran generique si le type n'a
// pas de plugin (INFO, RANDOM_POOL, futurs types). Toujours un clone :
// l'appelant peut muter sans affecter le registre.
export function ecranDefautModule(type: string): ScreenDefinition {
  const plugin = getScreenPlugin(type);
  if (plugin) return JSON.parse(JSON.stringify(plugin.defaultScreen)) as ScreenDefinition;
  return JSON.parse(JSON.stringify(ECRAN_GENERIQUE)) as ScreenDefinition;
}

// Donnees initiales d'un Module (change studio-module-first) : la forme requise
// par le sous-schema est toujours posee (`schemaVersion` lue au registre),
// le contenu restant a l'auteur (comme le QUIZ historique naissant avec
// `questions: []`, invalide en contenu mais de forme complete). Les panneaux
// savent afficher ces vides (etats incitatifs) et la validation guide la
// suite. Types sans schema de donnees (INFO, RANDOM_POOL) : `{}`.
export function donneesDefautModule(type: string): Record<string, unknown> {
  const version = MODULE_REGISTRY[type]?.version;
  const base: Record<string, unknown> = version ? { schemaVersion: version } : {};
  if (type === "QUIZ") return { ...base, questions: [] };
  return base;
}
