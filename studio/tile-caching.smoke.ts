// Vérification fonctionnelle du change smart-tile-caching (tsx, sans typecheck).
import { strict as assert } from "node:assert";
import game5poi from "./src/game/game-5poi.json" with { type: "json" };
import { validateGame } from "./src/game/validate.ts";
import {
  computeBboxFromPoi,
  computeBboxFromStrategy,
  computeOptimalBbox,
  exportPackFull,
  packActif,
  setActiveTilePack,
  setTileStrategy,
  type Bbox,
} from "./src/game/mcp.ts";
import { compterTuiles, detecterTuilesHorsBbox, estimerPackTuiles, clesTuiles, telechargerTuiles, verifyManifest, launchGate, sha256Hex } from "./src/game/pack.ts";
import { creerPack, listerPacks, supprimerPack, SEUIL_CONFIRMATION_TUILES, type TilePackDepot } from "./src/game/tile-packs.ts";
import { fondEffectifWidget, selectFondWidget } from "./src/game/map-widget.ts";
import type { Game, TilePackMeta } from "./src/game/types.ts";

const jeu = structuredClone(game5poi) as Game;
// Positions connues : 3 POI à (48.8566,2.3522),(48.86,2.355),(48.858,2.35).
const jeu3poi = {
  ...jeu,
  nodes: [
    { id: "a", module: { type: "QUIZ" }, activation: { requires: [{ type: "GEOFENCE", lat: 48.8566, lng: 2.3522, radiusMeters: 30 }] }, isEnding: true },
    { id: "b", module: { type: "QUIZ" }, activation: { requires: [{ type: "GEOFENCE", lat: 48.86, lng: 2.355, radiusMeters: 30 }] } },
    { id: "c", module: { type: "QUIZ" }, activation: { requires: [{ type: "GEOFENCE", lat: 48.858, lng: 2.35, radiusMeters: 30 }] } },
  ],
} as Game;

// 1.2/1.3 : game-5poi toujours accepté (champs optionnels).
assert.equal(validateGame(jeu).ok, true);
console.log("1.2/1.3 game-5poi accepté : OK");

// 2.1 : bbox couvre les 3 POI + buffer 300m.
const bbox = computeBboxFromPoi(jeu3poi, 300)!;
assert.ok(bbox, "bbox calculée");
for (const [lat, lng] of [[48.8566, 2.3522], [48.86, 2.355], [48.858, 2.35]]) {
  assert.ok(bbox.minLat <= lat && lat <= bbox.maxLat && bbox.minLng <= lng && lng <= bbox.maxLng, `couvre ${lat},${lng}`);
}
console.log("2.1 computeBboxFromPoi : OK", JSON.stringify(bbox));

// 2.2 : dispatch par stratégie.
const radius = setTileStrategy(jeu3poi, "radius", 300);
assert.deepEqual(computeBboxFromStrategy(radius), bbox);
assert.equal(computeBboxFromStrategy({ ...jeu3poi, global: { ...jeu3poi.global, tileStrategy: "none" } }), null);
const fixe = { ...jeu3poi, global: { ...jeu3poi.global, tileStrategy: "fixed", map: { bbox: { minLat: 1, minLng: 2, maxLat: 3, maxLng: 4 } } } } as Game;
assert.deepEqual(computeBboxFromStrategy(fixe), { minLat: 1, minLng: 2, maxLat: 3, maxLng: 4 });
assert.ok(computeBboxFromStrategy({ ...jeu3poi, global: { ...jeu3poi.global, tileStrategy: "viewport" } }));
console.log("2.2 computeBboxFromStrategy (radius/none/fixed/viewport) : OK");

// 5.6 : setTileStrategy + computeOptimalBbox (undo = pureté, pas de mutation).
const avant = JSON.stringify(jeu3poi);
const opt = computeOptimalBbox(radius);
assert.equal(opt.strategy, "radius");
assert.ok(opt.tileCount > 0);
assert.equal(JSON.stringify(jeu3poi), avant, "fonctions pures");
console.log("5.6 optimal bbox :", opt.tileCount, "tuiles estimées");

// Estimation : ±10 % du comptage direct.
const est = estimerPackTuiles(bbox, 12, 14);
assert.ok(Math.abs(est.nbTuiles - compterTuiles(bbox, 12, 14)) / est.nbTuiles < 0.001);
console.log("3.3 estimation :", est.nbTuiles, "tuiles,", est.lisible);

// 4.x : store local (dépôt mémoire).
const mem: TilePackMeta[] = [];
const depot: TilePackDepot = { lire: () => [...mem], ecrire: (p) => { mem.length = 0; mem.push(...p); } };
const p1 = creerPack(depot, "jeu-test", "Centre", { bbox, minZoom: 12, maxZoom: 14, tileStrategy: "radius", tileRadiusMeters: 300 }, est.nbTuiles, est.octets);
const p2 = creerPack(depot, "jeu-test", "Large", { bbox, minZoom: 10, maxZoom: 12, tileStrategy: "fixed" }, 10, 1000);
assert.equal(listerPacks(depot, "jeu-test").length, 2);
const avecActif = setActiveTilePack({ ...jeu3poi, gameId: "jeu-test" }, p2.id);
assert.equal(packActif(mem, avecActif)?.id, p2.id);
// Supprimer l'actif retire la désignation, JSON intact.
const { game: apresSuppr, supprime } = supprimerPack(depot, avecActif, p2.id);
assert.equal(supprime, true);
assert.equal(apresSuppr.global?.tilePackId, undefined);
assert.equal(listerPacks(depot, "jeu-test").length, 1);
console.log("4.2/4.3/4.4 multi-cache + actif : OK");

// 5.1/5.2 : fond pack-tiles résout l'actif, repli uni sinon.
const widget = { background: "pack-tiles" } as const;
assert.equal(fondEffectifWidget(avecActif, widget, [p1, p2]), "pack-tiles");
assert.equal(selectFondWidget(avecActif, widget, [p1, p2]), "tuiles");
assert.equal(fondEffectifWidget(apresSuppr, widget, mem), "solid");
assert.equal(selectFondWidget(apresSuppr, widget, mem), "uni");
console.log("5.1/5.2 liaison fond + repli : OK");

// 1.1/1.2 (carte-joueur-navigable) : rendu statique du MapWidgetRenderer —
// AUCUNE pastille visible (retirée), titre portant le nom du pack, mention
// « aucun pack actif » sinon. Même renderer pour Screen et Home.
{
  const sac: Record<string, string> = {};
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => sac[k] ?? null,
    setItem: (k: string, v: string) => { sac[k] = String(v); },
    removeItem: (k: string) => { delete sac[k]; },
    clear: () => { for (const k of Object.keys(sac)) delete sac[k]; },
  };
  const React = await import("react");
  // icons.tsx utilise le runtime JSX classique sans import React (résolu par
  // le bundler en dev) : sous tsx, fournir React en global (même cause que
  // l'échec pré-existant de test:modules — non couvert par ce change).
  (globalThis as Record<string, unknown>).React ??= React;
  const { createElement } = React;
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { MapWidgetRenderer } = await import("./src/components/wysiwyg/widgets/MapWidgetRenderer.tsx");
  const ecran = { type: "map", source: { kind: "steps" }, background: "pack-tiles" } as never;
  sac["geoplay-tile-packs-v1"] = JSON.stringify({ packs: [p1, p2] });
  const htmlActif = renderToStaticMarkup(createElement(MapWidgetRenderer, { widget: ecran, game: avecActif }));
  assert.ok(!htmlActif.includes("puce-ok"), "pastille retirée");
  assert.ok(htmlActif.includes("Large"), "nom du pack porté par le titre");
  const htmlSans = renderToStaticMarkup(createElement(MapWidgetRenderer, { widget: ecran, game: apresSuppr }));
  assert.ok(htmlSans.includes("aucun pack actif"), "mention repli rendue");
  assert.ok(!htmlSans.includes("puce-ok"), "pas de pastille sans actif");
  console.log("1.1/1.2 sans pastille + repli rendus (Screen + Home, même renderer) : OK");

  // 2.1 (pack-tuiles-effectif) : tuiles chargées en ligne avec badge.
  assert.ok(htmlActif.includes("/tiles/"), "grille de tuiles rendue");
  assert.ok(htmlActif.includes("aperçu en ligne"), "badge aperçu en ligne rendu");

  // 2.2 : hors-ligne connu d'avance → schéma uni, aucun <img> (aucun appel).
  const vraiNavigateur = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", { value: { onLine: false }, configurable: true });
  const htmlOffline = renderToStaticMarkup(createElement(MapWidgetRenderer, { widget: ecran, game: avecActif }));
  assert.ok(!htmlOffline.includes("/tiles/"), "aucune tuile tentée hors-ligne");
  assert.ok(!htmlOffline.includes("aperçu en ligne"), "pas de badge hors-ligne");
  assert.ok(!htmlOffline.includes("puce-ok"), "toujours pas de pastille hors-ligne");
  if (vraiNavigateur) Object.defineProperty(globalThis, "navigator", vraiNavigateur);
  else   delete (globalThis as Record<string, unknown>).navigator;
  console.log("2.1/2.2 tuiles en ligne + repli hors-ligne : OK");
}

// 5.3 : rayon invalide rejeté.
const mauvais = setTileStrategy(jeu3poi, "radius", -5);
assert.equal(validateGame(mauvais).ok, false);
console.log("5.3 rayon invalide rejeté : OK");

// 5.4 : none + map = avertissement non bloquant (export possible).
const jeuNone = { ...jeu, global: { ...jeu.global, tileStrategy: "none", map: { provider: "osm" } } } as Game;
const rNone = await exportPackFull(jeuNone, { status: Object.fromEntries(jeu.nodes.map((n) => [n.id, { state: "reviewed" }])) } as never, [], true);
assert.equal(rNone.ok, true, JSON.stringify(rNone.errors));
assert.ok(rNone.diagnostics.some((d) => d.code === "TILESTRATEGY_NONE_MAP" && d.niveau === "avertissement"));
console.log("5.4 none+map exportable avec avertissement : OK");

// 5.5 : 20 tuiles hors zone → avertissement nommé, export OK.
const clesHors = Array.from({ length: 20 }, (_, i) => `tuiles/10/${i}/${i}`);
const hors = detecterTuilesHorsBbox({ minLat: 48.85, minLng: 2.34, maxLat: 48.87, maxLng: 2.37 }, clesHors);
assert.equal(hors.length, 20);
const manifest = clesHors.map((p) => ({ path: p, version: "1", size: 100, sha256: "x".repeat(64) }));
const jeuFin = {
  ...jeu3poi,
  nodes: [
    ...jeu3poi.nodes,
    { id: "fin", module: { type: "INFO", data: { schemaVersion: "1.0.0", steps: [{ text: "fin" }] } }, activation: { requires: [{ type: "TIMER", anchor: "GAME_START", delaySeconds: 0 }] }, isEnding: true },
  ],
} as Game;
const rHors = await exportPackFull(
  jeuFin,
  { status: Object.fromEntries(jeuFin.nodes.map((n) => [n.id, { state: "reviewed" }])) } as never, manifest, true,
);
assert.ok(rHors.diagnostics.some((d) => d.code === "TUILES_HORS_BBOX" && d.niveau === "avertissement"), JSON.stringify(rHors.diagnostics.map((d) => d.code)));
console.log("5.5 tuiles hors zone signalées sans bloquer : OK");

// 2.3 : l'aperçu n'écrit jamais au JSON — jeu témoin (game-5poi valide) avec
// widget carte : validation Draft-07 OK et aucune URL dans les données.
const jeuCarte = {
  ...jeu,
  nodes: jeu.nodes.map((n, i) =>
    i === 0
      ? { ...n, screen: { zones: { content: { widgets: [{ type: "map", source: { kind: "steps" }, background: "pack-tiles" }] } } } }
      : n,
  ),
} as Game;
assert.equal(validateGame(jeuCarte).ok, true, JSON.stringify(validateGame(jeuCarte).layers.flatMap((l) => l.errors)));
assert.ok(!JSON.stringify(jeuCarte).includes("http"), "pack-only strict : aucune URL dans le JSON");
console.log("2.3 JSON sans URL après aperçu (pack-only) : OK");

// carte-plein-ecran-hauteur 1.2 : hauteur pleine en breakout, h-40 en flux.
{
  const { createElement: ce2 } = await import("react");
  const { renderToStaticMarkup: render2 } = await import("react-dom/server");
  const { MapWidgetRenderer: MapR } = await import("./src/components/wysiwyg/widgets/MapWidgetRenderer.tsx");
  const { CarteInteractiveSimu: SimuR } = await import("./src/components/wysiwyg/widgets/CarteInteractiveSimu.tsx");
  const { WidgetRenderer: WR } = await import("./src/components/wysiwyg/WidgetRenderer.tsx");
  const carte = { type: "map", source: { kind: "steps" }, background: "pack-tiles" } as never;
  const flux = render2(ce2(MapR as never, { widget: carte, game: jeu3poi } as never));
  assert.ok(flux.includes("h-40") && !flux.includes("h-full"), "flux garde h-40");
  const plein = render2(ce2(MapR as never, { widget: carte, game: jeu3poi, hauteurPleine: true } as never));
  assert.ok(plein.includes("h-full") && !plein.includes("h-40"), "breakout en h-full");
  const simuFlux = render2(ce2(SimuR as never, { widget: carte, game: jeu3poi, simu: { position: null, eligible: () => false, onOuvrir: () => {} } } as never));
  assert.ok(simuFlux.includes("h-40") && !simuFlux.includes("h-full"), "simu flux garde h-40");
  const simuPlein = render2(ce2(SimuR as never, { widget: carte, game: jeu3poi, simu: { position: null, eligible: () => false, onOuvrir: () => {} }, hauteurPleine: true } as never));
  assert.ok(simuPlein.includes("h-full") && !simuPlein.includes("h-40"), "simu breakout en h-full");
  const wr = render2(ce2(WR as never, { widget: carte, index: 0, game: jeu3poi, pleinEcran: true } as never));
  assert.ok(wr.includes("h-full"), "chaîne WidgetRenderer en h-full");
  console.log("carte-plein-ecran-hauteur : h-full en breakout, h-40 en flux : OK");

// carte-plein-ecran-hauteur 2.1 : budget plein écran (48) plus fin que bandeau (12).
{
  const { zoomApercu: za, compterTuiles: ct, MAX_TUILES_APERCU: B12, MAX_TUILES_PLEIN_ECRAN: B48 } = await import("./src/game/pack.ts");
  assert.equal(B12, 12);
  assert.equal(B48, 48);
  const g12 = za(bbox, 10, 16, B12)!;
  const g48 = za(bbox, 10, 16, B48)!;
  assert.ok(g48.z >= g12.z, `zoom plein écran ${g48.z} >= bandeau ${g12.z} (même finesse relative)`);
  const n48 = ct({ minLat: 48.8539, minLng: 2.3459, maxLat: 48.8627, maxLng: 2.3591 }, g48.z, g48.z);
  assert.ok(n48 <= B48, `${n48} tuiles dans le budget plein écran`);
  console.log("carte-plein-ecran-hauteur : budget 48 plus fin sans explosion : OK");

// carte-fond-flottant 1.2 : strate fond sous flottant, creux vers la carte.
{
  const { createElement: ce3 } = await import("react");
  const { renderToStaticMarkup: render3 } = await import("react-dom/server");
  const { PhoneCanvas: PC } = await import("./src/components/wysiwyg/PhoneCanvas.tsx");
  const ecranFond = {
    zones: {
      content: {
        layout: "stack",
        widgets: [
          { type: "map", source: { kind: "steps" }, background: "pack-tiles", pleinEcran: true, arrierePlan: true },
          { type: "text", text: "Titre flottant", style: "heading" },
        ],
      },
    },
  } as never;
  const jeuFond = {
    gameId: "t", schemaVersion: "1.0.0", minEngineVersion: "1.0.0", nodes: [],
    global: { map: { provider: "osm" } },
  } as never;
  // Lecture seule (terminal) : fond interactif, flottant transparent sauf widgets.
  const html = render3(ce3(PC as never, { screen: ecranFond, game: jeuFond } as never));
  const iFond = html.indexOf('aria-label="Arrière-plan"');
  const iTitre = html.indexOf("Titre flottant");
  assert.ok(iFond >= 0 && iTitre > iFond, "fond peint avant le flottant");
  assert.ok(html.includes("pointer-events-none"), "zones flottantes transparentes");
  assert.ok(html.includes("pointer-events-auto"), "widgets flottants opaques");
  // Édition (callbacks présents) : pas de transparence, fond non-interactif.
  const htmlEdit = render3(
    ce3(PC as never, { screen: ecranFond, game: jeuFond, onSelectZone: () => {}, onCreateZone: () => {} } as never),
  );
  assert.ok(htmlEdit.indexOf('aria-label="Arrière-plan"') >= 0, "fond présent en édition");
  assert.ok(!htmlEdit.includes("pointer-events-auto"), "pas de transparence en édition");
  // Sans arrierePlan : aucun changement (breakout historique par-dessus).
  const ecranBreak = {
    zones: { content: { layout: "stack", widgets: [{ type: "map", source: { kind: "steps" }, pleinEcran: true }] } },
  } as never;
  const htmlBreak = render3(ce3(PC as never, { screen: ecranBreak, game: jeuFond } as never));
  assert.ok(htmlBreak.includes('aria-label="Widgets plein écran"'), "breakout historique conservé");
  assert.ok(!htmlBreak.includes('aria-label="Arrière-plan"'), "pas de strate fond sans flag");
  console.log("carte-fond-flottant : fond sous flottant, creux vers carte, breakout intact : OK");

  // carte-fond-flottant 1.3 : sélecteur de calques (édition).
  const CAL_FOND = { actif: "fond", masques: { fond: false, flottant: false, overlay: false } } as never;
  const htmlCalque = render3(ce3(PC as never, {
    screen: ecranFond, game: jeuFond, onSelectZone: () => {}, onCreateZone: () => {}, calques: CAL_FOND,
  } as never));
  assert.ok(htmlCalque.includes('aria-label="Arrière-plan"'), "fond rendu");
  assert.ok(!htmlCalque.slice(htmlCalque.indexOf('aria-label="Arrière-plan"'), htmlCalque.indexOf('aria-label="Arrière-plan"') + 200).includes("pointer-events-none"), "fond interactif ciblé");
  // Fond masqué → absent ; overlay masqué → modale absente.
  const htmlMasque = render3(ce3(PC as never, {
    screen: { zones: { content: { layout: "stack", widgets: [{ type: "text", text: "x" }] }, overlay: { layout: "stack", widgets: [{ type: "text", text: "y" }] } } },
    game: jeuFond, onSelectZone: () => {}, onCreateZone: () => {},
    calques: { actif: "flottant", masques: { fond: true, flottant: false, overlay: true } },
  } as never));
  assert.ok(!htmlMasque.includes('aria-label="Arrière-plan"'), "fond masqué absent");
  assert.ok(!htmlMasque.includes("bg-black/50"), "overlay masquée absente");
  assert.ok(htmlMasque.includes(">x<"), "flottant visible");
  console.log("carte-fond-flottant : calques édition (ciblage fond, œil par strate) : OK");

  // carte-fond-flottant 1.4 : terminal = lecture seule, stacking hérité.
  const { PlayerTerminal: PT } = await import("./src/components/wysiwyg/PlayerTerminal.tsx");
  const noeudFond = {
    id: "n1",
    module: { type: "INFO", data: { schemaVersion: "1.0.0", steps: [{ text: "bonjour" }] } },
    activation: { requires: [{ type: "TIMER", anchor: "GAME_START", delaySeconds: 0 }] },
    screen: ecranFond,
  } as never;
  const noop = () => {};
  const htmlTerm = render3(ce3(PT as never, {
    node: noeudFond, game: jeuFond, holdMode: "none",
    onCompleteNode: noop, onTerminer: noop, onAbandonner: noop, onQuitter: noop,
  } as never));
  assert.ok(htmlTerm.includes('aria-label="Arrière-plan"'), "fond rendu dans le terminal");
  assert.ok(htmlTerm.includes("Titre flottant"), "flottant par-dessus dans le terminal");
  assert.ok(htmlTerm.includes("SIMULÉ") || htmlTerm.includes("Terminal joueur simulé"), "chrome simu intact");
  console.log("carte-fond-flottant : terminal hérite du stacking, simu intacte : OK");

  // carte-fond-flottant 2.3 : parité d'ordre fond → flottant → overlay.
  // Jambe partagée (natif+PWA) : partition pure déjà couverte en jvmTest +
  // compilation wasmJs ; ici la jambe Studio sur le même écran.
  const ecranStrates = {
    zones: {
      header: { layout: "stack", widgets: [{ type: "text", text: "Titre flottant", style: "heading" }] },
      content: {
        layout: "stack",
        widgets: [{ type: "map", source: { kind: "steps" }, background: "pack-tiles", pleinEcran: true, arrierePlan: true }],
      },
      overlay: { layout: "stack", widgets: [{ type: "text", text: "Message overlay", style: "body" }] },
    },
  } as never;
  const htmlStrates = render3(ce3(PC as never, { screen: ecranStrates, game: jeuFond } as never));
  const iF = htmlStrates.indexOf('aria-label="Arrière-plan"');
  const iT = htmlStrates.indexOf("Titre flottant");
  const iO = htmlStrates.indexOf("Message overlay");
  assert.ok(iF >= 0 && iT > iF && iO > iT, "ordre fond → flottant → overlay");
  assert.ok(htmlStrates.includes("bg-black/50"), "overlay modale au sommet");
  console.log("carte-fond-flottant : parité d'ordre fond → flottant → overlay (jambe Studio) : OK");
}
}
}

// 3.1/3.2/3.3 (carte-joueur-navigable) : carte interactive simulée —
// marqueurs cliquables, point SIMULÉ, volet fermé au repos, JSON intact.
{
  const { CarteInteractiveSimu } = await import("./src/components/wysiwyg/widgets/CarteInteractiveSimu.tsx");
  const ouvertes: string[] = [];
  const simu = {
    position: { lat: 48.857, lng: 2.353 },
    eligible: (id: string) => id === "a",
    onOuvrir: (id: string) => { ouvertes.push(id); },
  };
  const avant = JSON.stringify(jeu3poi);
  const { createElement: ce } = await import("react");
  const { renderToStaticMarkup: render } = await import("react-dom/server");
  const html = render(ce(CarteInteractiveSimu as never, { widget: { type: "map", source: { kind: "steps" } }, game: jeu3poi, simu } as never));
  assert.ok(html.includes('aria-label="POI a,'), "marqueur a cliquable");
  assert.ok(html.includes('aria-label="POI b,'), "marqueur b cliquable");
  assert.ok(html.includes("Position simulée"), "point SIMULÉ affiché");
  assert.ok(html.includes("SIMULÉ"), "badge SIMULÉ affiché");
  assert.ok(html.includes("Zoom avant") && html.includes("Zoom arrière") && html.includes("Recentrer"), "contrôles viewport");
  assert.ok(!html.includes("Détail simulé"), "volet fermé au repos");
  assert.equal(JSON.stringify(jeu3poi), avant, "rendu sans écriture JSON");
  // Sans position : pas de point, carte complète.
  const htmlSansPos = render(ce(CarteInteractiveSimu as never, { widget: { type: "map", source: { kind: "steps" } }, game: jeu3poi, simu: { ...simu, position: null } } as never));
  assert.ok(!htmlSansPos.includes("Position simulée"), "pas de point sans position");
  assert.ok(htmlSansPos.includes('aria-label="POI a,'), "marqueurs complets sans GPS");
  assert.deepEqual(ouvertes, [], "aucune ouverture au rendu (clic seul)");
  console.log("3.1/3.2/3.3 carte simu rendue (marqueurs, SIMULÉ, contrôles, JSON intact) : OK");
}

// 1.1/1.3/2.x (clic-carte-valide) : clic carte valide, quiz seedé, repli oneOf.
{
  const { donneesDefautModule } = await import("./src/game/module-screen-plugin.ts");
  const { rendreDiagnostic } = await import("./src/game/diagnostics.ts");
  // 1.1 : le littéral écrit par le clic MapView passe C1 sur l'activation.
  const clic = { type: "GEOFENCE", lat: 48.01, lng: 2.01, radiusMeters: 30, predicate: "enter" };
  const jeuClic = { ...jeu, nodes: jeu.nodes.map((n, i) => (i === 0 ? { ...n, activation: { requires: [clic] } } : n)) } as Game;
  const rClic = validateGame(jeuClic);
  assert.ok(!rClic.layers[0].errors.some((m) => m.includes("requires/0")), `clic sans erreur condition : ${JSON.stringify(rClic.layers[0].errors)}`);
  // 1.3 : quiz seedé passe C1, suppression de la dernière re-bloque.
  const seed = donneesDefautModule("QUIZ") as { questions: unknown[] };
  assert.ok(seed.questions.length >= 1, "1 question d'exemple");
  const jeuQuiz = { ...jeu, nodes: jeu.nodes.map((n, i) => (i === 0 ? { ...n, module: { type: "QUIZ", data: seed } } : n)) } as Game;
  assert.equal(validateGame(jeuQuiz).layers[0].errors.length, 0, "quiz seedé C1 OK");
  const jeuVide = { ...jeu, nodes: jeu.nodes.map((n, i) => (i === 0 ? { ...n, module: { type: "QUIZ", data: { schemaVersion: "1.0.0", questions: [] } } } : n)) } as Game;
  assert.ok(validateGame(jeuVide).layers[0].errors.some((m) => m.includes("questions")), "quiz vidé re-bloque");
  // 2.1/2.2 : GEOFENCE sans predicate → UN constat, champ nommé, glossaire.
  const jeuFautif = { ...jeu, nodes: jeu.nodes.map((n, i) => (i === 0 ? { ...n, activation: { requires: [{ type: "GEOFENCE", lat: 48.01, lng: 2.01, radiusMeters: 30 }] } } : n)) } as Game;
  const rFautif = validateGame(jeuFautif);
  assert.equal(rFautif.layers[0].errors.length, 1, `replié en 1 (reçu ${rFautif.layers[0].errors.length})`);
  const diag = rFautif.layers[0].diagnostics.find((d) => d.code === "C1_DECLENCHEUR_SANS_VARIANTE");
  assert.ok(diag && diag.noeud && diag.champ === "predicate", "constat structuré + champ probable");
  assert.ok(rendreDiagnostic(diag).includes("déclencheur"), "glossaire fermé");
  // 2.2 mixte : repli + quiz vide coexistent, chacun navigable.
  const jeuMixte = { ...jeuFautif, nodes: jeuFautif.nodes.map((n, i) => (i === 1 ? { ...n, module: { type: "QUIZ", data: { schemaVersion: "1.0.0", questions: [] } } } : n)) } as Game;
  const rMixte = validateGame(jeuMixte);
  const diagsMixte = rMixte.layers[0].diagnostics;
  assert.ok(diagsMixte.some((d) => d.code === "C1_DECLENCHEUR_SANS_VARIANTE"), "repli présent en mixte");
  assert.ok(diagsMixte.some((d) => JSON.stringify(d).includes("questions") || (d.message ?? "").includes("questions")), "erreur quiz présente en mixte");
  assert.ok(diagsMixte.every((d) => d.noeud), "tous navigables (Voir)");
  // 2.3 : game-5poi accepté sans repli.
  assert.equal(validateGame(jeu).ok, true);
  assert.ok(!validateGame(jeu).layers.flatMap((l) => l.diagnostics).some((d) => d.code === "C1_DECLENCHEUR_SANS_VARIANTE"), "pas de repli sur jeu valide");
  console.log("clic-carte-valide : clic OK, seed OK, repli 54→1, mixte, non-régression : OK");
}

// 3.1 (pack-tuiles-effectif) : téléchargement réel via fetcher injectable —
// retry sur clé instable, SHA-256 un par un, progression monotone, échec nommé.
{
  const cles = clesTuiles(bbox, 12, 14);
  assert.ok(cles.length >= 2 && cles.every((c) => /^tuiles\/\d{1,2}\/\d+\/\d+\.png$/.test(c)), "clés bien formées");
  assert.deepEqual(detecterTuilesHorsBbox(bbox, cles), [], "périmètre strict : aucune clé hors bbox");
  const tentatives = new Map<string, number>();
  const octets = async (cle: string) => {
    tentatives.set(cle, (tentatives.get(cle) ?? 0) + 1);
    if (cle === cles[0] && tentatives.get(cle) === 1) throw new Error("panne une fois");
    return new TextEncoder().encode(`tuile:${cle}`);
  };
  const vues: number[] = [];
  const res = await telechargerTuiles(cles, octets, { concurrence: 3, delaiMs: 1, essais: 3, onProgres: (p) => vues.push(p.faites) });
  assert.equal(res.echecs.length, 0, "retry absorbe la panne unique");
  assert.equal(res.fichiers.length, cles.length);
  for (const f of res.fichiers) {
    assert.equal(f.sha256, await sha256Hex(new TextEncoder().encode(`tuile:${f.path}`)), `SHA-256 ${f.path}`);
  }
  assert.ok(vues.length > 0 && vues[vues.length - 1] === cles.length, "progression jusqu'au total");
  // Échec définitif nommé, réussites conservées.
  const res2 = await telechargerTuiles(cles, async (cle) => (cle === cles[1] ? null : new TextEncoder().encode("x")), { delaiMs: 0 });
  assert.deepEqual(res2.echecs, [cles[1]]);
  assert.equal(res2.fichiers.length, cles.length - 1);
  console.log(`3.1 téléchargement vérifié (${cles.length} tuiles, retry, SHA, progression) : OK`);

  // 3.4 : seuil de confirmation exporté, périmètre déjà prouvé ci-dessus.
  assert.equal(SEUIL_CONFIRMATION_TUILES, 2000);
  console.log("3.4 seuil + périmètre bbox : OK");

  // 3.3 : export embarquant les tuiles du pack actif (lecteur mémoire) —
  // manifest enrichi, vérifiable et lançable offline (jeu de base valide).
  const jeuExport = {
    ...jeu,
    global: { ...jeu.global, tilePackId: "jeu-test/pack", map: { minZoom: 12, maxZoom: 12 } },
  } as Game;
  const clesExport = clesTuiles(computeBboxFromStrategy(jeuExport)!, 12, 12);
  assert.ok(clesExport.length > 0);
  const sac: Record<string, Uint8Array> = {};
  for (const c of clesExport) sac[c] = new TextEncoder().encode(`tuile:${c}`);
  const rExport = await exportPackFull(
    jeuExport,
    { status: Object.fromEntries(jeuExport.nodes.map((n) => [n.id, { state: "reviewed" }])) } as never,
    [],
    true,
    { lire: async (p) => sac[p] ?? null },
  );
  assert.equal(rExport.ok, true, JSON.stringify(rExport.errors));
  const entrees = rExport.manifest!.files.filter((m) => m.path.startsWith("tuiles/"));
  assert.equal(entrees.length, clesExport.length, "une entrée manifest par tuile");
  const checks = await verifyManifest(rExport.manifest!.files, async (p) => {
    if (p === "game.json") return new TextEncoder().encode(rExport.gameJson!);
    return sac[p] ?? null;
  });
  assert.ok(checks.every((c) => c.status === "ok"), "manifest vérifié fichier par fichier");
  assert.equal(launchGate(checks, rExport.manifest!.files).lancable, true, "pack lançable offline");
  // Lecteur incomplet → refus nommé bloquant.
  const rManquant = await exportPackFull(jeuExport, { status: {} } as never, [], true, { lire: async () => null });
  assert.equal(rManquant.ok, false);
  assert.ok(rManquant.diagnostics.some((d) => d.code === "TUILES_MANQUANTES"), "refus TUILES_MANQUANTES");
  console.log("3.3 export embarquant les tuiles, vérifié et lançable : OK");
}

console.log("\nToutes les vérifications smart-tile-caching : OK");

// publication-empreinte-nom 1.2 : gameJson accentué — size en octets,
// discriminant (l'ancienne formule String.length diverge), contrôle serveur simulé.
{
  const { exportPackFull } = await import("./src/game/mcp.ts");
  const { tailleOctets } = await import("./src/game/mcp.ts");
  const jeuAccent = {
    ...jeu,
    branding: { ...(jeu.branding ?? {}), name: "Château du Trésor — Édition été" },
  } as Game;
  const meta = { status: Object.fromEntries(jeuAccent.nodes.map((n) => [n.id, { state: "reviewed" }])) } as never;
  const r = await exportPackFull(jeuAccent, meta, [], true);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  const entree = r.manifest!.files.find((m) => m.path === "game.json")!;
  const octets = Buffer.byteLength(r.gameJson!, "utf8");
  assert.ok(r.gameJson!.length !== octets, "jeu discriminant (accents présents)");
  assert.equal(entree.size, octets, "size = octets, pas String.length");
  assert.equal(tailleOctets(r.gameJson!), octets);
  // Contrôle serveur simulé (catalog/server.js:179) : longueur + SHA sur octets.
  const recu = Buffer.from(r.gameJson!, "utf8");
  assert.equal(recu.length, entree.size);
  assert.equal((await import("node:crypto")).createHash("sha256").update(recu).digest("hex"), entree.sha256.toLowerCase());
  console.log("publication-empreinte-nom : gameJson accentué accepté, size en octets : OK");
}

// pastille-validation-source 1.2 : cas fantôme — succès compté comme problème.
{
  const { compterErreurs } = await import("./src/game/diagnostics.ts");
  const ancienneFormule = (rapport: string[]) => rapport.filter((r) => !r.includes(": OK")).length;
  const succes = ["Publié : chasse-vieux-port v3 — code 4217"];
  assert.equal(ancienneFormule(succes), 1, "bug reproduit (ancienne formule)");
  assert.equal(compterErreurs([]), 0, "aucun diagnostic → ✓ Valide");
  const diags = [
    { code: "X", niveau: "erreur", couche: 1, message: "m1", correctifs: [] },
    { code: "Y", niveau: "avertissement", couche: 2, message: "m2", correctifs: [] },
    { code: "Z", niveau: "info", couche: 2, message: "m3", correctifs: [] },
  ] as never;
  assert.equal(compterErreurs(diags), 1, "seules les erreurs comptent");
  console.log("pastille-validation-source : fantôme éteint, compteur sur diagnostics : OK");
}
