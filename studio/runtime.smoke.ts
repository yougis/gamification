// Preuves headless du change 400 : init topo, FIFO, hote, GPS, boussole, forceDraw.
import { strict as assert } from "node:assert";
import {
  resolveGameStartPools, suggest, snapshotOuverture, verdictValider, verdictAbandonner, regimeCompletion, hostModule, gpsFrequencyHz, accuracyMessage,
  smoothHeading, compassState, cameraPolicy, createInventoryEvent, INVENTORY_EVENT_TYPES,
} from "./src/game/runtime.ts";
import { drawPool } from "./src/game/evaluate.ts";
import { evaluate, type Sim } from "./src/game/evaluate.ts";
import fixtureHome from "./src/game/game-home-2pts.json";
import { navigationInitiale, estEtape, modeOuverture, type Navigation } from "./src/game/navigation.ts";
import type { Game } from "./src/game/types.ts";

const q = (id: string, extra = {}) => ({
  id,
  module: { type: "QUIZ", data: { schemaVersion: "1.0.0", questions: [{ q: "?" }] } },
  activation: { requires: [] as never[] },
  ...extra,
});
const base = (nodes: never[]): Game => ({
  gameId: "t", schemaVersion: "1.0.0", minEngineVersion: "1.0.0", nodes: nodes as never,
}) as unknown as Game;

// 1.1 : cascade A->B a l'init + persistance immediate + cycle rejete.
{
  const poolA = { ...q("poolA"), module: { type: "RANDOM_POOL", data: {} }, randomPool: { candidates: ["poolB", "x"], drawCount: 1, drawTiming: "ON_GAME_START" } };
  const poolB = { ...q("poolB"), module: { type: "RANDOM_POOL", data: {} }, randomPool: { candidates: ["y"], drawCount: 1, drawTiming: "ON_GAME_START" } };
  const g = base([poolA, poolB, q("x"), q("y")] as never[]);
  const ecrits: Record<string, string[]> = {};
  const draws = resolveGameStartPools(g, "s1", {}, (id, d) => { ecrits[id] = d; });
  assert.deepEqual(Object.keys(draws).sort(), ["poolA", "poolB"]);
  assert.deepEqual(ecrits, draws); // chaque tirage persiste aussitot
  const cyc = base([
    { ...q("p1"), module: { type: "RANDOM_POOL", data: {} }, randomPool: { candidates: ["p2"], drawCount: 1, drawTiming: "ON_GAME_START" }, activation: { requires: [{ type: "POOL_DRAWN", poolNodeId: "p2" }] } },
    { ...q("p2"), module: { type: "RANDOM_POOL", data: {} }, randomPool: { candidates: ["p1"], drawCount: 1, drawTiming: "ON_GAME_START" }, activation: { requires: [{ type: "POOL_DRAWN", poolNodeId: "p1" }] } },
  ] as never[]);
  assert.throws(() => resolveGameStartPools(cyc, "s1"), /cycle inter-pools/);
  console.log("1.1 topo init : OK (cascade A->B, persistance immediate, cycle rejete)");
}

// 1.2 : suggestion, 2 geofences sans auto-assignation, eviction au relock,
// tete proposee (change home-player-runtime, 7.2 : present() supprime).
{
  const s = suggest(["a", "b"], []);
  assert.deepEqual([s.tete, s.file], ["a", ["a", "b"]]);
  console.log("1.2 suggestion : OK (tete proposee, sans actif, ordre conserve)");
}

// 1.3 : hote isole (inconnu + crash), boucle vivante.
{
  const reg = new Map([["QUIZ", { render: () => "quiz" }], ["BOOM", { render: () => { throw new Error("plantage"); } }]]);
  assert.equal(hostModule(reg, "QUIZ", {}).ok, true);
  const inconnu = hostModule(reg, "MEMORY", {});
  assert.equal(inconnu.ok, false);
  assert.match((inconnu as { nonJouable: string }).nonJouable, /non jouable/);
  const crash = hostModule(reg, "BOOM", {});
  assert.equal(crash.ok, false);
  assert.match((crash as { nonJouable: string }).nonJouable, /boucle vivante/);
  console.log("1.3 hote : OK (inconnu et crash degrades, jeu continu)");
}

// 2.1 : GPS adaptatif + refus poli.
{
  assert.equal(gpsFrequencyHz("epreuve", false), 1);
  assert.equal(gpsFrequencyHz("navigation", false), 0.5);
  assert.equal(gpsFrequencyHz("repos", false), 0.1);
  assert.equal(gpsFrequencyHz("epreuve", true), 0.5);
  assert.equal(accuracyMessage(8, 15), null);
  assert.match(accuracyMessage(40, 15)!, /reste en attente/);
  console.log("2.1 GPS : OK (frequences, division batterie, refus poli)");
}

// 2.2 : boussole lissee circulaire + masquage, camera a la demande.
{
  assert.ok(Math.abs(smoothHeading(350, 10, 0.5) - 0) < 1e-9); // plus court chemin, pas 180
  assert.ok(Math.abs(smoothHeading(90, 100, 1) - 100) < 1e-9);
  assert.deepEqual(compassState(5, 10), { masquee: false, capOk: true });
  assert.deepEqual(compassState(30, 10), { masquee: true, capOk: false });
  assert.equal(cameraPolicy(1, 0), true);
  assert.equal(cameraPolicy(1, 1), false);
  console.log("2.2 boussole/camera : OK (lissage circulaire, masquage discret, compteur)");
}

// 2.3 : forceDraw sans alterer le tirage reel.
{
  const pool = { ...q("pool"), module: { type: "RANDOM_POOL", data: {} }, randomPool: { candidates: ["a", "b", "c"], drawCount: 1, drawTiming: "ON_POOL_ACTIVATION" } };
  const reel = drawPool(pool as never, "s1");
  const force = drawPool(pool as never, "s1", ["b"]);
  assert.deepEqual(force, ["b"]);
  assert.deepEqual(drawPool(pool as never, "s1"), reel); // le reel est inchange
  console.log("2.3 forceDraw : OK (force sans alterer le reel)");
}

// Inventaire (change inventory-events-hints) : vocabulaire fermé à six,
// fabrique timestampée avec itemId optionnel et flag triche.
{
  assert.deepEqual([...INVENTORY_EVENT_TYPES], [
    "INVENTORY_OPENED", "ITEM_SELECTED", "ITEM_USED",
    "ITEM_COMBINED", "ITEM_GIVEN", "ITEM_REMOVED",
  ]);
  const sel = createInventoryEvent("ITEM_SELECTED", "s1", "loupe");
  assert.equal(sel.type, "ITEM_SELECTED");
  assert.equal(sel.sessionId, "s1");
  assert.equal(sel.itemId, "loupe");
  assert.equal(sel.isCheat, false);
  assert.ok(typeof sel.timestamp === "number");
  const open = createInventoryEvent("INVENTORY_OPENED", "s1");
  assert.equal(open.itemId, undefined);
  const cheat = createInventoryEvent("ITEM_USED", "s1", "cle", true);
  assert.equal(cheat.isCheat, true);
  console.log("3.1 events inventaire : OK (vocabulaire fermé, fabrique, flag triche)");
}

// Suggestion d'ouverture (change home-player-runtime, 7.2 : `present()` et
// la modale unique sont supprimes) : tete proposee sans actif assigne, ordre
// stable, eviction au relock.
{
  let s = suggest(["a", "b"], []);
  assert.deepEqual([s.tete, s.file], ["a", ["a", "b"]]);
  assert.equal("activeId" in s, false); // jamais d'actif, ouverture manuelle
  s = suggest(["a", "c"], s.file); // b relocke hors file, c ajoute, tete stable
  assert.deepEqual([s.tete, s.file], ["a", ["a", "c"]]);
  s = suggest(["c"], s.file); // a relocke : eviction, c promu en tete proposee
  assert.deepEqual([s.tete, s.file], ["c", ["c"]]);
  s = suggest([], s.file);
  assert.deepEqual([s.tete, s.file], [null, []]);
  console.log("4.1 suggest : OK (tete proposee, sans actif, eviction)");
}

// Verdict Valider (change home-player-runtime) : nominal, droit a finir +
// hors-delai, refus si jamais eligible a l'ouverture.
{
  const nominal = verdictValider(snapshotOuverture("a", 1000, ["a", "b"]), ["a", "b"]);
  assert.deepEqual(nominal, { ok: true, horsDelai: false });
  const grace = verdictValider(snapshotOuverture("a", 1000, ["a", "b"]), ["b"]);
  assert.deepEqual(grace, { ok: true, horsDelai: true }); // droit a finir, flagge
  const refus = verdictValider(snapshotOuverture("a", 1000, ["b"]), ["a", "b"]);
  assert.deepEqual(refus, { ok: false, motif: "non-eligible-ouverture" });
  console.log("4.2 verdict : OK (nominal, grace hors-delai, refus apercu)");
}

// Verdict Abandonner (change home-player-runtime, option B) : ecriture
// budgetee, apercu gratuit, idempotence par ouverture, hors-delai propage.
{
  const ouv = snapshotOuverture("a", 1000, ["a", "b"]);
  const abd = verdictAbandonner(ouv, ["a", "b"], 3, new Set());
  assert.deepEqual(abd, { ok: true, event: "ABANDON", horsDelai: false, essaisRestants: 2 });
  const tard = verdictAbandonner(ouv, ["b"], 2, new Set());
  assert.deepEqual(tard, { ok: true, event: "ABANDON", horsDelai: true, essaisRestants: 1 });
  const double = verdictAbandonner(ouv, ["a", "b"], 2, new Set([`${ouv.id}@${ouv.t0}`]));
  assert.deepEqual(double, { ok: false, motif: "deja-abandonne" });
  const gratuit = verdictAbandonner(snapshotOuverture("z", 1000, ["b"]), ["b"], 3, new Set());
  assert.deepEqual(gratuit, { ok: false, motif: "apercu-gratuit" });
  console.log("4.3 abandon : OK (budgete, gratuit apercu, idempotent, hors-delai)");
}

// Regime de completion (change home-player-runtime) : effets une seule fois,
// score selon scoreOnReplay ensuite — jamais de double GIVE_ITEM au rejeu.
{
  assert.deepEqual(regimeCompletion(0, false), { effets: true, score: true });
  assert.deepEqual(regimeCompletion(0, true), { effets: true, score: true });
  assert.deepEqual(regimeCompletion(1, false), { effets: false, score: false });
  assert.deepEqual(regimeCompletion(2, true), { effets: false, score: true }); // score sans redon
  console.log("4.4 regime : OK (effets 1ere fois, score rejeu selon scoreOnReplay)");
}

// Navigation explicite (change home-player-runtime, 3.1.1) : 4 vues pures,
// sans cablage UI, sans ecriture ni event.
{
  const init = navigationInitiale();
  assert.deepEqual(init, { vue: "HOME" });
  const vues: Navigation[] = [
    init,
    { vue: "volet", id: "point-a" },
    { vue: "etape", id: "point-a", mode: "jouable" },
    { vue: "etape", id: "point-b", mode: "apercu" },
    { vue: "etape", id: "fin", mode: "relecture" },
    { vue: "etape", id: "fin", mode: "rejeu" },
    { vue: "plein-ecran" },
  ];
  assert.ok(vues.every((v) => typeof v.vue === "string"));
  assert.equal(estEtape(vues[2]), true);
  assert.equal(estEtape(vues[0]), false);
  console.log("4.5 navigation : OK (HOME, volet, etape x4 modes, plein-ecran)");
}

// Modes d'ouverture (change home-player-runtime, 5.1) : matrice termine ×
// eligible × rejouable, sans ecriture.
{
  assert.equal(modeOuverture({ termine: false, eligible: true, rejouable: false }), "jouable");
  assert.equal(modeOuverture({ termine: false, eligible: false, rejouable: false }), "apercu");
  assert.equal(modeOuverture({ termine: true, eligible: true, rejouable: true }), "rejeu");
  assert.equal(modeOuverture({ termine: true, eligible: false, rejouable: false }), "relecture");
  assert.equal(modeOuverture({ termine: true, eligible: true, rejouable: false }), "relecture");
  console.log("4.7 modes : OK (jouable, apercu, rejeu, relecture)");
}

// Parcours fixture (change home-player-runtime, 1.3/4.3) : boucle manuelle
// complete sur game-home-2pts.json via fonctions pures — ouvrir (snapshot),
// valider (verdict), retour HOME (suggestion), sans auto-ouverture.
{
  const jeu = fixtureHome as unknown as Game;
  const simBase: Sim = {
    present: new Set(["point-a", "point-b"]), dwellOk: new Set(), throughOk: new Set(),
    nowMs: 0, completedAt: new Map(), accuracyM: 5,
  };
  const done = new Map<string, number>();
  const counts = new Map<string, number>();
  const r0 = evaluate(jeu, { ...simBase }, {}, done, counts, new Set());
  assert.deepEqual([...r0.unlocked].sort(), ["point-a", "point-b"]);
  assert.equal(suggest(r0.unlocked, []).tete, "point-a"); // ordre noeuds stable
  const ouvA = snapshotOuverture("point-a", 0, r0.unlocked);
  assert.deepEqual(verdictValider(ouvA, r0.unlocked), { ok: true, horsDelai: false });
  done.set("point-a", 1); counts.set("point-a", 1);
  const r1 = evaluate(jeu, { ...simBase, completedAt: done }, {}, done, counts, new Set());
  assert.ok(r1.unlocked.includes("point-b") && r1.unlocked.includes("fin")); // OR debloquee
  const ouvB = snapshotOuverture("point-b", 0, r1.unlocked);
  assert.deepEqual(verdictValider(ouvB, r1.unlocked), { ok: true, horsDelai: false });
  done.set("point-b", 2); counts.set("point-b", 1);
  const r2 = evaluate(jeu, { ...simBase, completedAt: done }, {}, done, counts, new Set());
  assert.deepEqual(verdictValider(snapshotOuverture("fin", 0, r2.unlocked), r2.unlocked), { ok: true, horsDelai: false });
  // Grace : WINDOW expiree entre t0 et t1 -> droit a finir + hors-delai.
  const jeuW = {
    gameId: "w", schemaVersion: "1.0.0", minEngineVersion: "1.0.0",
    nodes: [{
      id: "a",
      module: { type: "INFO", data: { schemaVersion: "1.0.0", steps: [{ text: "x" }] } },
      activation: { requires: [{ type: "WINDOW", avantSecondes: 600 }] },
    }],
  } as unknown as Game;
  const e0 = evaluate(jeuW, { ...simBase, nowMs: 0 }, {}, new Map(), new Map(), new Set());
  const e1 = evaluate(jeuW, { ...simBase, nowMs: 700000 }, {}, new Map(), new Map(), new Set());
  assert.deepEqual(e0.unlocked, ["a"]);
  assert.deepEqual(e1.unlocked, []);
  assert.deepEqual(verdictValider(snapshotOuverture("a", 0, e0.unlocked), e1.unlocked), { ok: true, horsDelai: true });
  console.log("4.6 parcours : OK (boucle manuelle 2pts + fin OR + grace WINDOW)");
}
console.log("RUNTIME SMOKE OK");
