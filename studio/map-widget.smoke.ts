// Smoke test du widget cartographie (change widget-cartographie, tache 1.3) :
// game-5poi.json reste valide (non-regression) + fixture avec widget map
// valide en C1, cas invalides rejetes (fond reseau, kind inconnu, champ etranger).
import { validateGame } from "./src/game/validate";
import { messagesBloquants } from "./src/game/diagnostics";
import { carteWidgetDefaut, marqueursCarte, voletCarteDefaut } from "./src/game/map-widget";
import game5poi from "./src/game/game-5poi.json";

// AddWidgetMenu tire la chaine JSX (Icon) : React global requis hors Vite.
const ReactMod = await import("react");
(globalThis as Record<string, unknown>).React = (ReactMod as { default: unknown }).default ?? ReactMod;
const { defaultWidget } = await import("./src/components/wysiwyg/AddWidgetMenu");

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`map-widget.smoke: ${msg}`);
  console.log(`ok: ${msg}`);
}

const r5 = validateGame(game5poi);
assert(r5.ok, "game-5poi.json reste valide couches 1+2");

const noeudBase = {
  module: { type: "INFO", data: { schemaVersion: "1.0.0", steps: [{ text: "Bienvenue" }] } },
  activation: { requires: [{ type: "GEOFENCE", lat: 48.01, lng: 2.01, radiusMeters: 30, predicate: "enter" }] },
};

const jeuCarte = {
  gameId: "fixture-carte",
  schemaVersion: "1.0.0",
  minEngineVersion: "1.0.0",
  branding: { name: "Fixture carte" },
  global: { presentation: ["HOME", "MAP"] },
  nodes: [
    {
      id: "start",
      ...noeudBase,
      screen: {
        layout: "basic-story",
        zones: {
          content: {
            layout: "stack",
            widgets: [
              {
                type: "map",
                source: { kind: "steps" },
                background: "pack-tiles",
                poiStyle: { locked: "cadenas", unlocked: "etoile" },
                volet: { widgets: [{ type: "button", label: "Ouvrir", poiAction: "open-step", variant: "primary" }] },
              },
            ],
          },
        },
      },
    },
    { id: "fin", ...noeudBase, isEnding: true, activation: { requires: [{ type: "NODE_COMPLETED", nodeId: "start" }] } },
  ],
};

const rCarte = validateGame(jeuCarte);
assert(rCarte.ok, `fixture carte valide C1+C2 (erreurs: ${JSON.stringify(rCarte.layers.flatMap((l) => l.errors))})`);

// Fond reseau rejete.
const jeuFondReseau = JSON.parse(JSON.stringify(jeuCarte));
jeuFondReseau.nodes[0].screen.zones.content.widgets[0].background = "https://tuiles.exemple.fr/{z}/{x}/{y}.png";
assert(!validateGame(jeuFondReseau).ok, "fond reseau rejete en C1");

// Kind source inconnu rejete.
const jeuKindInconnu = JSON.parse(JSON.stringify(jeuCarte));
jeuKindInconnu.nodes[0].screen.zones.content.widgets[0].source = { kind: "scores" };
assert(!validateGame(jeuKindInconnu).ok, "kind source inconnu rejete en C1");

// Champ etranger au variant rejete.
const jeuChampEtranger = JSON.parse(JSON.stringify(jeuCarte));
jeuChampEtranger.nodes[0].screen.zones.content.widgets[0].questions = [];
assert(!validateGame(jeuChampEtranger).ok, "champ etranger au variant map rejete en C1");

// Map sans source rejete (source requise).
const jeuSansSource = JSON.parse(JSON.stringify(jeuCarte));
delete jeuSansSource.nodes[0].screen.zones.content.widgets[0].source;
assert(!validateGame(jeuSansSource).ok, "map sans source rejete en C1");

// 2.1 : filter "all" + discovery masquee = avertissement non bloquant, nœud nommé.
const jeuAll = JSON.parse(JSON.stringify(jeuCarte));
jeuAll.nodes[1].discovery = { mode: "ON_CLUE", clueId: "indice_1" };
jeuAll.nodes[0].screen.zones.content.widgets[0].source = { kind: "steps", filter: "all" };
const rAll = validateGame(jeuAll);
const diagsAll = rAll.layers.flatMap((l) => l.diagnostics);
assert(diagsAll.some((d) => d.code === "CARTE_ALL_EVENTE" && d.niveau === "avertissement"), "filter all + discovery = avertissement CARTE_ALL_EVENTE");
assert(messagesBloquants(diagsAll).length === 0, "avertissement non bloquant pour l'export");

// 2.2 : source steps sur jeu HOME-seul sans nœud = avertissement, sans rejet.
const jeuHomeSeul = {
  gameId: "fixture-carte-home",
  schemaVersion: "1.0.0",
  minEngineVersion: "1.0.0",
  branding: { name: "Fixture carte home" },
  global: {
    presentation: ["HOME"],
    screen: { zones: { content: { layout: "stack", widgets: [{ type: "map", source: { kind: "steps" } }] } } },
  },
  nodes: [],
};
const rHome = validateGame(jeuHomeSeul);
const diagsHome = rHome.layers.flatMap((l) => l.diagnostics);
assert(diagsHome.some((d) => d.code === "CARTE_SANS_ETAPE" && d.niveau === "avertissement"), "carte sans etape = avertissement CARTE_SANS_ETAPE");
assert(messagesBloquants(diagsHome).length === 0, "HOME-seul sans etape non bloque");

// 3.3 : volet par defaut a la pose (menu d'ajout), jamais reapplique.
const defaut = defaultWidget("map");
assert(defaut.type === "map", "menu d'ajout propose la carte");
if (defaut.type !== "map") throw new Error("unreachable");
const volet = defaut.volet?.widgets ?? [];
assert(volet.length === 2 && volet[0].type === "text", "volet par defaut : texte");
assert(volet[1].type === "button" && volet[1].poiAction === "open-step", "volet par defaut : bouton a etat lie");
assert(JSON.stringify(voletCarteDefaut()) === JSON.stringify(defaut.volet), "fabrique volet = defaut du menu");
assert(JSON.stringify(carteWidgetDefaut()) === JSON.stringify(defaut), "fabrique carte = defaut du menu");

// Positions d'apercu : marqueurs relatifs 0..100 pour la fixture.
const jeuMarqueurs = JSON.parse(JSON.stringify(jeuCarte));
const ms = marqueursCarte(jeuMarqueurs);
assert(ms.length >= 1 && ms.every((m) => m.x >= 0 && m.x <= 100 && m.y >= 0 && m.y <= 100), "marqueurs relatifs 0..100");

// 2.3 : le cas kind inconnu figure au rapport avec son nœud fautif.
const rKind = validateGame(jeuKindInconnu);
const diagsKind = rKind.layers.flatMap((l) => l.diagnostics);
assert(diagsKind.some((d) => d.noeud === "start"), "rapport C1 nomme le nœud fautif (start)");
