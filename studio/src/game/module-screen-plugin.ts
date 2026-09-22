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
}

export interface ModulePlayerRendererProps {
  data: Record<string, unknown>;
  branding?: Branding;
  experienceStyle?: ExperienceStyle;
  onComplete?: (score: number) => void;
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
