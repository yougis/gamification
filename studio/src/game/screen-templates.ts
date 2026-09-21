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
  return SCREEN_TEMPLATES.find((t) => t.id === layoutId);
}
