// Resolution d'ecran WYSIWYG : fusion global.screen -> node.screen (change studio-screen-wysiwyg).
// Regle : le global sert de template, le noeud remplace par zone (pas d'append).
import type { CSSProperties } from "react";
import type { GameNode, MinigameDefaults, ScreenBackground, ScreenDefinition, StyleOrigin, WidgetStyles } from "./types";

export const DEFAULT_SCREEN: ScreenDefinition = {
  layout: "default",
  background: { type: "color", value: "#1a1a2e" },
  zones: { content: { layout: "stack", widgets: [] } },
};

export function resolveScreen(node: GameNode, globalScreen?: ScreenDefinition): ScreenDefinition {
  if (!node.screen && !globalScreen) return DEFAULT_SCREEN;
  if (!node.screen) return globalScreen!;
  if (!globalScreen) return node.screen;
  return {
    ...globalScreen,
    ...node.screen,
    zones: { ...globalScreen.zones, ...node.screen.zones },
  };
}

// Convertit un ScreenBackground en style CSS React (color | image | gradient).
export function screenBackgroundStyle(bg?: ScreenBackground): CSSProperties {
  if (!bg) return {};
  if (bg.type === "color") return { backgroundColor: bg.value };
  if (bg.type === "image")
    return { backgroundImage: `url(${bg.value})`, backgroundSize: "cover", backgroundPosition: "center" };
  return { backgroundImage: bg.value };
}

// Couleur de texte par défaut d'un écran (change studio-lot-correctifs) :
// couleur auteur = verbatim (gérée par l'appelant) ; sinon contraste calculé
// sur le fond couleur résolu (fond sombre → texte clair et inversement) ;
// sinon undefined = héritage du thème du Studio. Pur et testable.
export function couleurTexteDefaut(bg?: ScreenBackground): string | undefined {
  if (!bg || bg.type !== "color") return undefined;
  const lum = luminanceHex(bg.value);
  if (lum == null) return undefined;
  return lum < 0.45 ? "#eef1f6" : "#212529";
}

function luminanceHex(hex: string): number | null {
  const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

// Heritage des styles global → ecran → widget, par propriete (change
// studio-screen-editor, design D3) : a chaque niveau, seules les proprietes
// renseignees surchargent ; les autres sont heritees. Pur et testable.
export interface ResolvedStyles {
  styles: WidgetStyles;
  origins: Partial<Record<keyof WidgetStyles, StyleOrigin>>;
}

const STYLE_KEYS: (keyof WidgetStyles)[] = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "color",
  "align",
  "backgroundColor",
  "textColor",
  "borderRadius",
];

export function resolveStyles(
  globalStyles?: WidgetStyles,
  screenStyles?: WidgetStyles,
  widgetStyles?: WidgetStyles,
): ResolvedStyles {
  const styles: WidgetStyles = {};
  const origins: Partial<Record<keyof WidgetStyles, StyleOrigin>> = {};
  const niveaux: [WidgetStyles | undefined, StyleOrigin][] = [
    [globalStyles, "global"],
    [screenStyles, "ecran"],
    [widgetStyles, "widget"],
  ];
  for (const [niveau, origine] of niveaux) {
    if (!niveau) continue;
    for (const cle of STYLE_KEYS) {
      const v = niveau[cle];
      if (v !== undefined) {
        (styles as Record<string, unknown>)[cle] = v;
        origins[cle] = origine;
      }
    }
  }
  return { styles, origins };
}

export type MinigameParamOrigin = "locale" | "globale" | "defaut";

export interface ResolvedMinigameParam {
  value: number | undefined;
  origin: MinigameParamOrigin;
}

// Resolution locale → globale → defaut module (change studio-screen-editor,
// design D4). `undefined` + origine `defaut` = comportement actuel du module.
export function resolveMinigameParam(
  localValue: number | undefined,
  globalDefaults: MinigameDefaults | undefined,
  key: "maxAttempts" | "timeLimitSeconds",
): ResolvedMinigameParam {
  if (localValue !== undefined) return { value: localValue, origin: "locale" };
  const g = globalDefaults?.[key];
  if (g !== undefined) return { value: g, origin: "globale" };
  return { value: undefined, origin: "defaut" };
}
