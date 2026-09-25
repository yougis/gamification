// Preuves headless du change 400 : init topo, FIFO, hote, GPS, boussole, forceDraw.
import { strict as assert } from "node:assert";
import {
  resolveGameStartPools, present, hostModule, gpsFrequencyHz, accuracyMessage,
  smoothHeading, compassState, cameraPolicy, createInventoryEvent, INVENTORY_EVENT_TYPES,
} from "./src/game/runtime.ts";
import { drawPool } from "./src/game/evaluate.ts";
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

// 1.2 : FIFO, 2 geofences simultanees sans empilement, eviction au relock, ACTIVE latche.
{
  let p = present(["a", "b"], [], null);
  assert.deepEqual([p.activeId, p.queue], ["a", ["b"]]);
  p = present(["a", "b"], p.queue, p.activeId); // a reste ACTIVE (latche)
  assert.deepEqual([p.activeId, p.queue], ["a", ["b"]]);
  p = present(["b"], p.queue, p.activeId); // a relocke hors file, b promu
  assert.deepEqual([p.activeId, p.queue], ["b", []]);
  console.log("1.2 FIFO : OK (1 modale, ordre conserve, eviction, latch)");
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
console.log("RUNTIME SMOKE OK");
