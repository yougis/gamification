// Templates d'ecran WYSIWYG : points de depart predefinis (change studio-screen-wysiwyg).
// Choisir un template remplace zones + layout du screen courant (cf. 4.3).
import type { ScreenDefinition } from "./types";

export interface ScreenTemplate {
  id: string;
  name: string;
  description: string;
  screen: ScreenDefinition;
}

export const SCREEN_TEMPLATES: ScreenTemplate[] = [
  {
    id: "basic-story",
    name: "Récit simple",
    description: "Fond, en-tête avec titre, zone de contenu scrollable.",
    screen: {
      layout: "basic-story",
      background: { type: "color", value: "#1a1a2e" },
      zones: {
        header: { layout: "stack", widgets: [{ type: "text", text: "Titre de l'étape", style: "heading", align: "center" }] },
        content: {
          layout: "stack",
          widgets: [
            { type: "text", text: "Racontez l'histoire ici…", style: "body" },
            { type: "module" },
          ],
        },
      },
    },
  },
  {
    id: "quiz-focus",
    name: "Quiz",
    description: "Fond sombre, compteur en en-tête, quiz au centre, navigation en pied.",
    screen: {
      layout: "quiz-focus",
      background: { type: "color", value: "#14141f" },
      zones: {
        header: {
          layout: "stack",
          widgets: [
            { type: "text", text: "Question", style: "heading", align: "center" },
            { type: "progress", progressType: "steps", showLabel: true },
          ],
        },
        content: { layout: "stack", widgets: [{ type: "module" }] },
        footer: {
          layout: "stack",
          widgets: [{ type: "button", label: "Valider", action: "navigate", variant: "primary" }],
        },
      },
    },
  },
  {
    id: "map-fullscreen",
    name: "Carte plein écran",
    description: "Contenu carte en plein écran avec contrôles en surimpression.",
    screen: {
      layout: "map-fullscreen",
      background: { type: "color", value: "#0e1420" },
      zones: {
        content: { layout: "stack", widgets: [{ type: "module" }] },
        overlay: {
          layout: "stack",
          widgets: [
            { type: "text", text: "Rejoignez le point indiqué", style: "subtitle", align: "center" },
            { type: "button", label: "Centrer", action: "navigate", variant: "secondary" },
          ],
        },
      },
    },
  },
  {
    id: "clue-focus",
    name: "Indice",
    description: "Fond sombre, zone d'indices avec texte et images.",
    screen: {
      layout: "clue-focus",
      background: { type: "color", value: "#1c1a2e" },
      zones: {
        header: { layout: "stack", widgets: [{ type: "text", text: "Indice", style: "heading", align: "center" }] },
        content: {
          layout: "stack",
          widgets: [
            { type: "image", src: "indice.jpg", fit: "contain", alt: "Illustration de l'indice" },
            { type: "text", text: "Décrivez l'indice ici…", style: "body" },
            { type: "module" },
          ],
        },
      },
    },
  },
  {
    id: "inventory-view",
    name: "Inventaire",
    description: "Fond sombre, titre en en-tête, grille d'objets au centre.",
    screen: {
      layout: "inventory-view",
      background: { type: "color", value: "#1a1e1a" },
      zones: {
        header: { layout: "stack", widgets: [{ type: "text", text: "Boîte à outils", style: "heading", align: "center" }] },
        content: {
          layout: "grid",
          widgets: [{ type: "module" }, { type: "text", text: "Objets collectés", style: "caption", align: "center" }],
        },
      },
    },
  },
];

export function getScreenTemplate(layoutId: string | undefined): ScreenTemplate | undefined {
  return allScreenTemplates().find((t) => t.id === layoutId);
}

// Bibliotheque de modeles (change studio-media-templates, design D4) :
// predefinis embarques (immuables) + modeles enregistres par l'auteur
// (« Enregistrer comme modele », persistance locale). Appliquer = copie
// profonde : toute modification ulterieure est une declinaison, le modele
// n'est jamais mute.
export interface CustomScreenTemplate {
  id: string;
  name: string;
  screen: ScreenDefinition;
}

const CLE_MODELES = "geoplay-screen-templates-v1";

function slug(nom: string): string {
  const s = nom
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return s || "modele";
}

export function loadCustomTemplates(): CustomScreenTemplate[] {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(CLE_MODELES);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((e): CustomScreenTemplate[] => {
      if (!e || typeof e !== "object") return [];
      const { id, name, screen } = e as { id?: unknown; name?: unknown; screen?: unknown };
      if (typeof id !== "string" || typeof name !== "string" || !screen || typeof screen !== "object") return [];
      return [{ id, name, screen: screen as ScreenDefinition }];
    });
  } catch {
    return [];
  }
}

export function customTemplateExists(id: string): boolean {
  return loadCustomTemplates().some((t) => t.id === id);
}

export function customTemplateId(nom: string): string {
  return `custom-${slug(nom)}`;
}

// Enregistre (copie profonde figeante) ; ecrase l'enregistrement de meme id
// (l'appelant confirme). Retourne l'id. Silencieux hors stockage (false).
export function saveCustomTemplate(nom: string, screen: ScreenDefinition): { id: string; persisted: boolean } {
  const id = customTemplateId(nom);
  const copie: ScreenDefinition =
    typeof structuredClone === "function" ? structuredClone(screen) : JSON.parse(JSON.stringify(screen));
  const liste = loadCustomTemplates().filter((t) => t.id !== id);
  liste.push({ id, name: nom, screen: copie });
  try {
    if (typeof localStorage === "undefined") return { id, persisted: false };
    localStorage.setItem(CLE_MODELES, JSON.stringify(liste));
    return { id, persisted: true };
  } catch {
    return { id, persisted: false };
  }
}

// Tous les modeles : predefinis puis enregistres (meme forme pour le picker).
export function allScreenTemplates(): ScreenTemplate[] {
  return [
    ...SCREEN_TEMPLATES,
    ...loadCustomTemplates().map((t) => ({
      id: t.id,
      name: t.name,
      description: "Modèle enregistré par l'auteur.",
      screen: t.screen,
    })),
  ];
}
