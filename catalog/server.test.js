// Tests du service catalogue (change studio-game-catalog, tâches 1.1-1.3).
// node:test pur, sans dépendance : le serveur tourne sur port éphémère,
// données isolées via CATALOG_DATA_DIR (défini AVANT l'import dynamique).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.CATALOG_DATA_DIR = mkdtempSync(join(tmpdir(), "catalog-test-"));
const { createApp, _resetRateLimit } = await import("./server.js");

const sha = (s) => createHash("sha256").update(s).digest("hex");
const gameJson = (id) => JSON.stringify({ gameId: id, schemaVersion: "1.0.0", nodes: [{ id: "start" }] });
const manifestFor = (text, extra = []) => ({
  files: [{ path: "game.json", version: "1.0.0", size: Buffer.byteLength(text), sha256: sha(text) }, ...extra],
});

let base;
let server;
before(async () => {
  server = createServer(createApp());
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
  _resetRateLimit();
});
after(async () => {
  server.close();
  rmSync(process.env.CATALOG_DATA_DIR, { recursive: true, force: true });
});

async function post(path, body) {
  const r = await fetch(base + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return { status: r.status, json: await r.json() };
}
async function get(path) {
  const r = await fetch(base + path);
  const ct = r.headers.get("content-type") ?? "";
  return { status: r.status, json: ct.includes("json") ? await r.json() : null, raw: r };
}

test("santé", async () => {
  const r = await get("/health");
  assert.equal(r.status, 200);
  assert.equal(r.json.ok, true);
});

test("publication → code 4 chiffres ; deux jeux → codes distincts", async () => {
  const g1 = gameJson("Chasse du Vieux-Port");
  const r1 = await post("/publish", { gameId: "Chasse du Vieux-Port", gameJson: g1, manifest: manifestFor(g1) });
  assert.equal(r1.status, 200);
  assert.match(r1.json.code, /^\d{4}$/);
  assert.equal(r1.json.version, 1);
  const g2 = gameJson("Rallye du Panier");
  const r2 = await post("/publish", { gameId: "Rallye du Panier", gameJson: g2, manifest: manifestFor(g2) });
  assert.equal(r2.status, 200);
  assert.notEqual(r2.json.code, r1.json.code);
});

test("republication garde le code, version 2, historique [1,2]", async () => {
  const g1 = gameJson("Chasse du Vieux-Port");
  const first = await post("/publish", { gameId: "Chasse du Vieux-Port", gameJson: g1, manifest: manifestFor(g1) });
  const g2 = gameJson("Chasse du Vieux-Port").replace("start", "start-v2");
  const second = await post("/publish", { gameId: "Chasse du Vieux-Port", gameJson: g2, manifest: manifestFor(g2) });
  assert.equal(second.json.code, first.json.code);
  assert.equal(second.json.version, first.json.version + 1);
  const hist = await get(`/games/${first.json.code}/versions`);
  assert.equal(hist.status, 200);
  const nums = hist.json.map((v) => v.version);
  // Versions 1..n consécutives, la dernière étant celle qui vient d'être publiée
  // (un test précédent a déjà publié ce nom une fois : pas d'isolation entre tests).
  assert.deepEqual(nums, Array.from({ length: nums.length }, (_, i) => i + 1));
  assert.equal(nums[nums.length - 1], second.json.version);
});

test("liste GET /games triée avec versions courantes", async () => {
  const r = await get("/games");
  assert.equal(r.status, 200);
  const names = r.json.map((g) => g.nom);
  assert.deepEqual(names, [...names].sort());
  assert.ok(r.json.every((g) => /^\d{4}$/.test(g.code) && g.version >= 1));
});

test("pack byte-identique : gameJson exact + assets aller-retour", async () => {
  const assetBytes = Buffer.from([0, 1, 2, 3, 255]);
  const g = gameJson("Jeu Assets");
  const manifest = manifestFor(g, [{ path: "img.png", version: "1.0.0", size: assetBytes.length, sha256: createHash("sha256").update(assetBytes).digest("hex") }]);
  const pub = await post("/publish", {
    gameId: "Jeu Assets", gameJson: g, manifest,
    assets: [{ path: "img.png", base64: assetBytes.toString("base64") }],
  });
  assert.equal(pub.status, 200);
  const pack = await get(`/games/${pub.json.code}`);
  assert.equal(pack.status, 200);
  assert.equal(pack.json.gameJson, g);
  assert.equal(sha(pack.json.gameJson), manifest.files[0].sha256);
  const asset = await get(`/games/${pub.json.code}/assets/img.png`);
  assert.equal(asset.status, 200);
  assert.deepEqual(Buffer.from(await asset.raw.arrayBuffer()), assetBytes);
});

test("code inconnu → 404 propre, pack invalide → 400", async () => {
  for (const bad of ["/games/abcd", "/games/12345"]) {
    const r = await get(bad);
    assert.equal(r.status, 404);
  }
  // Code bien formé mais absent : déterminé depuis la liste publiée.
  const list = (await get("/games")).json.map((g) => g.code);
  const absent = Array.from({ length: 10000 }, (_, i) => String(i).padStart(4, "0")).find((c) => !list.includes(c));
  const r404 = await get(`/games/${absent}`);
  assert.equal(r404.status, 404);
  assert.match(r404.json.error, /inconnu/);
  const bad = await post("/publish", { gameId: "Cassé", gameJson: JSON.stringify({}), manifest: { files: [] } });
  assert.equal(bad.status, 400);
  const g = gameJson("Menteur");
  const tampered = manifestFor(g);
  tampered.files[0].sha256 = "0".repeat(64);
  const menteur = await post("/publish", { gameId: "Menteur", gameJson: g, manifest: tampered });
  assert.equal(menteur.status, 400);
});
