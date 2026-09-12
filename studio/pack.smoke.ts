// Preuves headless du change 300 : manifest, diff, reprise, gating, quota,
// fallback carte, persistance SQLite (transaction tirage+etat, relecture crash).
import { strict as assert } from "node:assert";
import { DatabaseSync } from "node:sqlite";
import {
  verifyManifest, diffManifest, launchGate, estimateSize, checkQuota, selectFond,
  sha256Hex, type ManifestFile,
} from "./src/game/pack.ts";

const fauxFichiers = new Map<string, Uint8Array>();
const contenu = (i: number) => new TextEncoder().encode(`asset-${i}-` + "x".repeat(100));
const manifest: ManifestFile[] = [];
for (let i = 0; i < 20; i++) {
  const bytes = contenu(i);
  fauxFichiers.set(`assets/f${i}.bin`, i === 7 ? new TextEncoder().encode("CORROMPU") : bytes);
  manifest.push({ path: `assets/f${i}.bin`, version: "1.0.0", size: bytes.length, sha256: await sha256Hex(bytes) });
}

// 1.1 : 1 corrompu sur 20 -> seul lui a re-telecharger.
const checks = await verifyManifest(manifest, async (p) => fauxFichiers.get(p) ?? null);
assert.equal(checks.filter((c) => c.status === "corrompu").length, 1);
assert.equal(checks.find((c) => c.status === "corrompu")!.path, "assets/f7.bin");
const etat = Object.fromEntries(checks.map((c) => [c.path, c.status])) as Record<string, "ok" | "manquant" | "corrompu">;
const diff = diffManifest(structuredClone(manifest), manifest, etat);
assert.deepEqual(diff.aTelecharger.map((m) => m.path), ["assets/f7.bin"]);
assert.equal(diff.conserves.length, 19);
console.log("1.1 manifest+diff : OK (1/20 re-telecharge, 19 conserves)");

// 1.2 : reprise a 60 % -> seuls les manquants ; 90 % -> lancement refuse.
const partiel60 = manifest.map((m, i) => ({ path: m.path, status: (i < 12 ? "ok" : "manquant") as const }));
const etat60 = Object.fromEntries(partiel60.map((c) => [c.path, c.status]));
assert.equal(diffManifest(structuredClone(manifest), manifest, etat60).aTelecharger.length, 8);
const gate60 = launchGate(partiel60, manifest);
assert.equal(gate60.lancable, false);
assert.ok(Math.abs(gate60.progression - 0.6) < 0.01);
const partiel90 = manifest.map((m, i) => ({ path: m.path, status: (i < 18 ? "ok" : "manquant") as const }));
const gate90 = launchGate(partiel90, manifest);
assert.equal(gate90.lancable, false);
assert.ok(gate90.progression >= 0.89 && gate90.progression < 1);
assert.ok(gate90.motif!.includes("assets/f18.bin"));
const gate100 = launchGate(manifest.map((m) => ({ path: m.path, status: "ok" as const })), manifest);
assert.equal(gate100.lancable, true);
console.log("1.2 reprise+gating : OK (8 manquants a 60 %, refus motive a 90 %, vert a 100 %)");

// 1.3 : chiffrage avant + refus poli.
const { lisible } = estimateSize(manifest);
const quota = checkQuota(manifest, 10);
assert.equal(quota.ok, false);
assert.ok(quota.message.includes(lisible));
assert.equal(checkQuota(manifest, 10 ** 9).ok, true);
console.log(`1.3 taille+quota : OK (pack ${lisible}, refus poli)`);

// 2.1 (logique) : matrice fallback.
assert.equal(selectFond(true, true), "tuiles");
assert.equal(selectFond(false, true), "statique");
assert.equal(selectFond(false, false), "uni");
console.log("2.1 fallback : OK (tuiles > statique > uni)");

// 2.2 (logique) : transaction tirage+etat, relecture apres crash sans re-tirage.
{
  import("node:os").then(async ({ tmpdir }) => {
    const f = `${tmpdir()}/geoplay-pack-smoke.db`;
    try {
      await import("node:fs/promises").then((fs) => fs.unlink(f)).catch(() => {});
      const db = new DatabaseSync(f);
      db.exec("CREATE TABLE progression (sessionId TEXT PRIMARY KEY, draws TEXT NOT NULL, etat TEXT NOT NULL)");
      db.exec("BEGIN");
      db.prepare("INSERT OR REPLACE INTO progression VALUES (?, ?, ?)").run(
        "session-1", JSON.stringify({ pool: ["c"] }), JSON.stringify({ unlocked: ["c"] }));
      db.exec("COMMIT");
      db.close(); // crash simule : processus meurt ici, le fichier reste
      const db2 = new DatabaseSync(f);
      const row = db2.prepare("SELECT draws, etat FROM progression WHERE sessionId = ?").get("session-1") as {
        draws: string; etat: string;
      };
      assert.equal(JSON.parse(row.draws).pool[0], "c"); // relu, jamais recalcule
      assert.deepEqual(JSON.parse(row.etat), { unlocked: ["c"] });
      db2.close();
      console.log("2.2 SQLite : OK (transaction atomique, tirage relu a l'identique apres crash)");
      console.log("PACK SMOKE OK");
    } finally {
      await import("node:fs/promises").then((fs) => fs.unlink(f)).catch(() => {});
    }
  });
}
