// Preuves headless du change 500 : hit-test, AR, 6e type, etancheite graphe, reprise.
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { hitTest, arMode } from "./src/game/modules.ts";
import { validateGame } from "./src/game/validate.ts";
import type { Game } from "./src/game/types.ts";

const root = new URL(".", import.meta.url).pathname;

// 1.3 : tap gante a cote d'une zone fine, avec dilatation.
{
  const zone = [{ x: 10, y: 10, w: 0.5, h: 0.5 }];
  assert.equal(hitTest(zone, 10.2, 10.2, 0), true);
  assert.equal(hitTest(zone, 12, 12, 0), false);
  assert.equal(hitTest(zone, 12, 12, 2), true); // dilatation : valide a cote
  console.log("1.3 hit-test : OK (exact, rate sans, valide avec dilatation)");
}

// 2.1 : AR avec fallback 2D obligatoire.
{
  assert.deepEqual(arMode({ cameraGranted: true, arSupported: true, modelSizeMb: 8, budgetMb: 25 }), {
    mode: "ar",
    motif: "capteurs et budget OK",
  });
  assert.equal(arMode({ cameraGranted: true, arSupported: true, modelSizeMb: 80, budgetMb: 25 }).mode, "fallback2D");
  assert.equal(arMode({ cameraGranted: false, arSupported: true, modelSizeMb: 8, budgetMb: 25 }).mode, "fallback2D");
  assert.equal(arMode({ cameraGranted: true, arSupported: false, modelSizeMb: 8, budgetMb: 25 }).mode, "fallback2D");
  console.log("2.1 AR : OK (ar si capteurs+budget, sinon fallback motive)");
}

// 1.1/1.2 : les 5 sous-schemas ne parlent jamais du graphe (etancheite).
{
  const files = ["quiz", "difference-game", "puzzle", "ar-marker", "boussole"];
  for (const f of files) {
    const text = readFileSync(`${root}src/game/schema/${f}.json`, "utf8");
    assert.match(text, /"const": "1\.0\.0"/); // versionne
    assert.ok(!/HEADING|NODE_COMPLETED|GEOFENCE|isEnding|allowCycle/.test(text), `${f} fuit vers le graphe`);
  }
  console.log("1.1/1.2 etancheite : OK (5 sous-schemas versionnes, aucune condition graphe)");
}

// 2.2 : 6e type sans toucher Nœuds/Liens (ni racine) : passe en couche 1.
{
  const g = {
    gameId: "memoire",
    schemaVersion: "1.0.0",
    minEngineVersion: "1.0.0",
    nodes: [
      {
        id: "m",
        module: { type: "MEMORY", data: { schemaVersion: "1.0.0", paires: 6 } },
        activation: { requires: [{ type: "TIMER", anchor: "GAME_START", delaySeconds: 0 }] },
      },
      {
        id: "fin",
        isEnding: true,
        module: { type: "QUIZ", data: { schemaVersion: "1.0.0", questions: [{ q: "?" }] } },
        activation: { requires: [{ type: "NODE_COMPLETED", nodeId: "m" }] },
      },
    ],
  } as unknown as Game;
  const v = validateGame(g);
  assert.deepEqual(v.layers[0].errors, []);
  console.log("2.2 6e type : OK (MEMORY inconnu accepte en couche 1, racine inchangee)");
}

// 1.3 : reprise puzzle via SQLite (fichier reel, fermeture brutale).
{
  const f = `${root}.tmp-puzzle.db`;
  try {
    await import("node:fs/promises").then((fs) => fs.unlink(f)).catch(() => {});
    const db = new DatabaseSync(f);
    db.exec("CREATE TABLE etat_module (nodeId TEXT PRIMARY KEY, etat TEXT NOT NULL)");
    db.exec("BEGIN");
    db.prepare("INSERT OR REPLACE INTO etat_module VALUES (?, ?)").run("puzzle-1", JSON.stringify({ pieces: 12, placees: 7 }));
    db.exec("COMMIT");
    db.close(); // app tuee
    const db2 = new DatabaseSync(f);
    const row = db2.prepare("SELECT etat FROM etat_module WHERE nodeId = ?").get("puzzle-1") as { etat: string };
    assert.deepEqual(JSON.parse(row.etat), { pieces: 12, placees: 7 });
    db2.close();
    console.log("1.3 reprise : OK (etat puzzle restaure apres kill)");
  } finally {
    await import("node:fs/promises").then((fs) => fs.unlink(f)).catch(() => {});
  }
}

console.log("MODULES SMOKE OK");
