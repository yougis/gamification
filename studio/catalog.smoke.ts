// Smoke test du client catalogue Studio (change studio-game-catalog, 2.1+2.3) :
// publishGame / listGames / fetchPack contre un vrai service en processus,
// puis chargement via le pipeline d'import (File → importerFichier).
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";

process.env.CATALOG_DATA_DIR = mkdtempSync(join(tmpdir(), "catalog-smoke-"));
const { createApp } = await import("../catalog/server.js");
const { publishGame, listGames, fetchPack, normaliserUrlService } = await import("./src/game/catalog.ts");

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`catalog.smoke: ${msg}`);
  console.log(`ok: ${msg}`);
}

const server = createServer(createApp());
await new Promise<void>((r) => server.listen(0, r));
const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
try {
  const gameJson = JSON.stringify({ gameId: "Fumée", schemaVersion: "1.0.0", nodes: [{ id: "start" }] });
  const manifest = {
    files: [{
      path: "game.json",
      version: "1.0.0",
      size: Buffer.byteLength(gameJson),
      sha256: (await import("node:crypto")).createHash("sha256").update(gameJson).digest("hex"),
    }],
  };
  // 2.1 : publier → code affiché ; republication → même code, version +1.
  const p1 = await publishGame(base, { gameId: "Fumée", gameJson, manifest, assets: [] });
  assert(/^\d{4}$/.test(p1.code), `publier → code ${p1.code}`);
  assert(p1.version === 1, "première version = 1");
  const p2 = await publishGame(base, { gameId: "Fumée", gameJson, manifest, assets: [] });
  assert(p2.code === p1.code && p2.version === 2, "republier garde le code, version 2");

  // 2.3 : liste + recherche côté appelant + import via File.
  const jeux = await listGames(base);
  assert(jeux.some((g) => g.code === p1.code && g.nom === "Fumée"), "liste contient le jeu");
  const trouves = jeux.filter((g) => g.nom.toLowerCase().includes("fum"));
  assert(trouves.length >= 1, "recherche par nom");
  const pack = await fetchPack(base, p1.code);
  assert(pack.gameJson === gameJson, "pack récupéré byte-identique");
  const f = new File([pack.gameJson], `${pack.gameId}.json`, { type: "application/json" });
  assert(f.size > 0 && f.name.endsWith(".json"), "File construisible pour importerFichier");

  // Lot-correctifs 4.2 : normalisation d'URL + erreur actionnable.
  assert(normaliserUrlService("http://localhost:3000/") === "http://localhost:3000", "slash final retiré");
  assert(normaliserUrlService("  http://localhost:3000/publish ") === "http://localhost:3000", "suffixe /publish retiré");
  assert(normaliserUrlService("http://hote:3000/jeux") === "http://hote:3000/jeux", "autre chemin conservé");
  const p3 = await publishGame(`${base}/publish`, { gameId: "Fumée", gameJson, manifest, assets: [] });
  assert(p3.code === p1.code, "URL d'endpoint normalisée : même jeu, pas de doublon");
  let explicite = "";
  try {
    await publishGame("http://127.0.0.1:1", { gameId: "X", gameJson, manifest, assets: [] });
  } catch (e) {
    explicite = e instanceof Error ? e.message : String(e);
  }
  assert(explicite.includes("injoignable") && explicite.includes("http://127.0.0.1:1"), `erreur actionnable (${explicite.slice(0, 60)}…)`);
} finally {
  server.close();
  rmSync(process.env.CATALOG_DATA_DIR, { recursive: true, force: true });
}

console.log("catalog.smoke: ALL OK");
