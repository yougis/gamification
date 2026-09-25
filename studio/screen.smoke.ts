// Smoke test de resolveScreen() : heritage global, override noeud, merge de zones.
// + resolveStyles() (heritage global → ecran → widget, par propriete),
// + resolveMinigameParam() (locale → globale → defaut),
// + moveScreenWidgetAcross() (deplacement inter-zones en une operation),
// + validation AJV des styles, minigameDefaults, QCM image et puzzle
// (change studio-screen-editor).
import { resolveScreen, DEFAULT_SCREEN, resolveStyles, resolveMinigameParam } from "./src/game/screen-utils";
import { moveScreenWidgetAcross, patchScreenZone } from "./src/game/mcp";
import { SCREEN_TEMPLATES, getScreenTemplate, loadCustomTemplates, saveCustomTemplate, allScreenTemplates } from "./src/game/screen-templates";
import { estImageAcceptable } from "./src/components/wysiwyg/image-files";
import { validateGame } from "./src/game/validate";
import game5poi from "./src/game/game-5poi.json";
import type { Game, GameNode, ScreenDefinition } from "./src/game/types";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`screen.smoke: ${msg}`);
  console.log(`ok: ${msg}`);
}

const node = (screen?: ScreenDefinition): GameNode => ({
  id: "n",
  module: { type: "INFO", data: {} },
  activation: { requires: [{ type: "GEOFENCE", lat: 48.01, lng: 2.01, radiusMeters: 30, predicate: "enter" }] },
  ...(screen ? { screen } : {}),
});

// 1. Ni noeud ni global -> ecran par defaut (fond uni, content-only).
const r1 = resolveScreen(node());
assert(r1 === DEFAULT_SCREEN, "defaut sans screen");
assert(r1.zones?.content?.layout === "stack" && (r1.zones?.content?.widgets?.length ?? -1) === 0, "defaut content-only vide");
assert(!r1.zones?.header && !r1.zones?.footer, "defaut sans header/footer");

// 2. Noeud sans screen herite du global tel quel.
const global: ScreenDefinition = {
  background: { type: "color", value: "#000" },
  zones: { header: { layout: "stack", widgets: [{ type: "text", text: "Jeu" }] } },
};
const r2 = resolveScreen(node(), global);
assert(r2.background?.value === "#000", "heritage background global");
assert(r2.zones?.header?.widgets?.[0]?.type === "text", "heritage header global");

// 3. Noeud override le background ; header vide (ni global ni noeud ne definissent de zones).
const globalBgOnly: ScreenDefinition = { background: { type: "color", value: "#000" } };
const r3 = resolveScreen(node({ background: { type: "image", value: "chateau.jpg" } }), globalBgOnly);
assert(r3.background?.value === "chateau.jpg", "override background noeud");
assert(!r3.zones?.header, "header vide non specifie");

// 4. Merge de zones : header du global + content du noeud ; footer noeud remplace footer global.
const global2: ScreenDefinition = {
  layout: "basic-story",
  zones: {
    header: { layout: "stack", widgets: [{ type: "text", text: "Titre" }] },
    footer: { layout: "stack", widgets: [{ type: "text", text: "Vieux footer" }] },
  },
};
const r4 = resolveScreen(
  node({ zones: { content: { layout: "stack", widgets: [{ type: "module" }] }, footer: { layout: "stack", widgets: [{ type: "button", label: "Go" }] } } }),
  global2
);
assert(r4.layout === "basic-story", "layout herite du global");
assert(r4.zones?.header?.widgets?.[0]?.type === "text", "header du global conserve");
assert(r4.zones?.content?.widgets?.[0]?.type === "module", "content du noeud ajoute");
assert(r4.zones?.footer?.widgets?.[0]?.type === "button", "footer noeud remplace footer global");

// 5. resolveStyles : heritage global → ecran → widget, par propriete
// (scenario du delta spec : Georgia / 18 / #ff0000).
const rs = resolveStyles(
  { fontFamily: "Georgia", fontSize: 14 },
  { fontSize: 18 },
  { color: "#ff0000" },
);
assert(rs.styles.fontFamily === "Georgia", "styles herite fontFamily du global");
assert(rs.styles.fontSize === 18, "styles surcharge fontSize par l'ecran");
assert(rs.styles.color === "#ff0000", "styles surcharge color par le widget");
assert(rs.origins.fontFamily === "global" && rs.origins.fontSize === "ecran" && rs.origins.color === "widget", "origines par propriete");

// 6. Ecran sans styles herite integralement du global.
const rs2 = resolveStyles({ fontSize: 14 }, undefined, undefined);
assert(rs2.styles.fontSize === 14 && rs2.origins.fontSize === "global", "ecran sans styles herite tout");

// 7. resolveMinigameParam : locale → globale → defaut.
const mp1 = resolveMinigameParam(30, { timeLimitSeconds: 60 }, "timeLimitSeconds");
assert(mp1.value === 30 && mp1.origin === "locale", "surcharge locale 30s");
const mp2 = resolveMinigameParam(undefined, { maxAttempts: 3 }, "maxAttempts");
assert(mp2.value === 3 && mp2.origin === "globale", "defaut global 3 essais");
const mp3 = resolveMinigameParam(undefined, undefined, "maxAttempts");
assert(mp3.value === undefined && mp3.origin === "defaut", "defaut module sans valeur");

// 8. moveScreenWidgetAcross : content[0] → footer (fin), ordre persiste.
const jeuDnD = (pid: string): Game => ({
  gameId: "dnd",
  schemaVersion: "1.0.0",
  minEngineVersion: "1.0.0",
  nodes: [
    {
      id: pid,
      module: { type: "INFO", data: {} },
      activation: { requires: [{ type: "TIMER", anchor: "GAME_START", delaySeconds: 0 }] },
      isEnding: true,
      screen: {
        zones: {
          content: { layout: "stack", widgets: [{ type: "text", text: "A" }, { type: "text", text: "B" }] },
          footer: { layout: "stack", widgets: [{ type: "text", text: "C" }] },
        },
      },
    },
  ],
});
const dnd = moveScreenWidgetAcross(jeuDnD("n"), "n", "content", 0, "footer", "end");
const zc = dnd.nodes[0].screen?.zones?.content?.widgets ?? [];
const zf = dnd.nodes[0].screen?.zones?.footer?.widgets ?? [];
assert(zc.length === 1 && (zc[0] as { text?: string }).text === "B", "source retiree");
assert(zf.length === 2 && (zf[1] as { text?: string }).text === "A", "cible en fin de footer");

// 8b. Clic fantome : patchScreenZone materialise la zone vide (change
// studio-screen-selection-zones) ; undo = retirer la zone (cote App).
const fantome = patchScreenZone(jeuDnD("n"), "n", "header", { widgets: [] });
const zh = fantome.nodes[0].screen?.zones?.header;
assert(zh != null && (zh.widgets ?? []).length === 0, "fantome cree zone header vide");

// 9. AJV : jeu avec les 3 niveaux de styles accepte, champ inconnu rejete.
const jeuStyles = (patch: Record<string, unknown>): Game => ({
  gameId: "styles",
  schemaVersion: "1.0.0",
  minEngineVersion: "1.0.0",
  global: { screen: { styles: { fontFamily: "Georgia", fontSize: 14 } } },
  nodes: [
    {
      id: "n",
      module: { type: "INFO", data: {} },
      activation: { requires: [{ type: "TIMER", anchor: "GAME_START", delaySeconds: 0 }] },
      isEnding: true,
      ...patch,
    },
  ],
});
const vStyles = validateGame(
  jeuStyles({ screen: { styles: { fontSize: 18 }, zones: { content: { layout: "stack", widgets: [{ type: "text", text: "T", styles: { color: "#ff0000" } }] } } } }),
);
assert(vStyles.layers[0].errors.length === 0, `3 niveaux de styles acceptes (${vStyles.layers[0].errors.join("; ")})`);
const vStylesKo = validateGame(
  jeuStyles({ screen: { zones: { content: { layout: "stack", widgets: [{ type: "text", text: "T", styles: { shadow: true } }] } } } }),
);
assert(vStylesKo.layers[0].errors.length > 0, "style inconnu rejete");

// 10. AJV : minigameDefaults valides acceptes, maxAttempts 0 rejete.
const vDef = validateGame({ ...jeuStyles({}), global: { minigameDefaults: { maxAttempts: 3, timeLimitSeconds: 60 } } });
assert(vDef.layers[0].errors.length === 0, "minigameDefaults valides acceptes");
const vDefKo = validateGame({ ...jeuStyles({}), global: { minigameDefaults: { maxAttempts: 0 } } });
assert(vDefKo.layers[0].errors.length > 0, "maxAttempts 0 rejete");

// 11. AJV : option QCM image acceptee, decoupe puzzle 4x4 acceptee.
const jeuQuiz = (data: Record<string, unknown>): Game => ({
  gameId: "quiz",
  schemaVersion: "1.0.0",
  minEngineVersion: "1.0.0",
  nodes: [
    {
      id: "q",
      module: { type: "QUIZ", data },
      activation: { requires: [{ type: "TIMER", anchor: "GAME_START", delaySeconds: 0 }] },
      isEnding: true,
    },
  ],
});
const vQuiz = validateGame(
  jeuQuiz({
    schemaVersion: "1.0.0",
    questions: [{ q: "Quoi ?", options: ["A", "B", { text: "C", image: "c.jpg" }, { image: "d.jpg" }], correctIndex: 2 }],
    maxAttempts: 2,
  }),
);
assert(vQuiz.layers[0].errors.length === 0, `QCM mixte accepte (${vQuiz.layers[0].errors.join("; ")})`);
const jeuPuzzle = (data: Record<string, unknown>): Game => ({
  gameId: "puzzle",
  schemaVersion: "1.0.0",
  minEngineVersion: "1.0.0",
  nodes: [
    {
      id: "p",
      module: { type: "PUZZLE", data },
      activation: { requires: [{ type: "TIMER", anchor: "GAME_START", delaySeconds: 0 }] },
      isEnding: true,
    },
  ],
});
const vPuzzle = validateGame(
  jeuPuzzle({ schemaVersion: "1.0.0", image: "p.jpg", tileRows: 4, tileCols: 4, maxAttempts: 3, timeLimitSeconds: 120 }),
);
assert(vPuzzle.layers[0].errors.length === 0, `puzzle 4x4 accepte (${vPuzzle.layers[0].errors.join("; ")})`);

// 12. Non-regression : game-5poi.json toujours valide couches 1+2.
const v5poi = validateGame(game5poi);
assert(v5poi.ok, `game-5poi.json valide (${v5poi.layers.flatMap((l) => l.errors).join("; ")})`);

// 13. Bibliotheque de modeles (change studio-media-templates) : application
// par copie profonde = declinaison sans mutation du modele.
const quizFocus = getScreenTemplate("quiz-focus");
assert(quizFocus != null, "template quiz-focus resolu (predefini + enregistres)");
const declinaison: ScreenDefinition = structuredClone(quizFocus.screen);
if (declinaison.zones?.header?.widgets?.[0]?.type === "text") {
  (declinaison.zones.header.widgets[0] as { text?: string }).text = "Titre modifie";
}
const headerOrigine = quizFocus.screen.zones?.header?.widgets?.[0];
assert(
  headerOrigine?.type === "text" && (headerOrigine as { text?: string }).text === "Question",
  "declinaison sans mutation du modele",
);
assert(
  SCREEN_TEMPLATES.every((t) => getScreenTemplate(t.id) === t || (getScreenTemplate(t.id)?.name === t.name)),
  "predefinis intacts et resolus",
);
// Hors navigateur (pas de localStorage) : pas d'exception, persistance signalee.
assert(loadCustomTemplates().length === 0, "sans stockage : aucun modele enregistre");
const saveHs = saveCustomTemplate("ACTE II", declinaison);
assert(saveHs.persisted === false && allScreenTemplates().length === SCREEN_TEMPLATES.length, "sans stockage : echec explicite");

// 14. Refus des non-images (change studio-media-templates).
const fauxFichier = (name: string, type: string): File => ({ name, type }) as File;
assert(estImageAcceptable(fauxFichier("chateau.jpg", "image/jpeg")), "jpg accepte");
assert(estImageAcceptable(fauxFichier("plan.SVG", "")), "svg accepte par extension");
assert(!estImageAcceptable(fauxFichier("doc.pdf", "application/pdf")), "pdf refuse");

// 15. Indices d'inventaire (change inventory-events-hints 1.2) : C1 rejette
// un type hors vocabulaire en le nommant, C2 rejette un itemId orphelin.
{
  const jeuHints = (hints: unknown) => ({
    gameId: "indices",
    schemaVersion: "1.0.0",
    minEngineVersion: "1.0.0",
    objects: [{ id: "loupe", name: "Loupe" }],
    nodes: [
      {
        id: "q",
        module: { type: "QUIZ", data: { schemaVersion: "1.0.0", questions: [{ q: "?" }], inventoryHints: hints } },
        activation: { requires: [{ type: "TIMER", anchor: "GAME_START", delaySeconds: 0 }] },
      },
      {
        id: "fin",
        isEnding: true,
        module: { type: "INFO", data: {} },
        activation: { requires: [{ type: "NODE_COMPLETED", nodeId: "q" }] },
      },
    ],
  }) as unknown as Game;
  const ok = validateGame(jeuHints([{ event: "ITEM_SELECTED", itemId: "loupe", hint: "Regarde en haut." }]));
  assert(ok.layers[0].errors.length === 0, "hints valides passent C1");
  assert(!ok.layers[1].errors.some((m) => m.includes("inventoryHints")), JSON.stringify(ok.layers[1].errors));
  const koType = validateGame(jeuHints([{ event: "ITEM_DEVINE", hint: "?" }]));
  assert(koType.layers[0].errors.some((m) => m.includes("ITEM_DEVINE")), JSON.stringify(koType.layers[0].errors));
  const koRef = validateGame(jeuHints([{ event: "ITEM_SELECTED", itemId: "objet_inexistant", hint: "?" }]));
  assert(koRef.layers[0].errors.length === 0, "itemId orphelin passe C1");
  assert(
    koRef.layers[1].errors.some((m) => m.includes("inventoryHints") && m.includes("objet_inexistant")),
    JSON.stringify(koRef.layers[1].errors),
  );
  console.log("ok: hints C1 type fautif nommé, C2 itemId orphelin nommé");
}

console.log("screen.smoke: ALL OK");
