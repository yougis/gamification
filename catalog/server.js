// Service catalogue GeoPlay (change studio-game-catalog, design D1-D2).
// Distributeur de fichiers bête : publication versionnée par nom de jeu,
// code d'accès à 4 chiffres (simple identifiant, PAS une sécurité),
// récupération + historique. Aucun compte, aucun scoring en ligne.
// Zéro dépendance : node:http + node:fs + node:crypto uniquement.
//
// Stockage (CATALOG_DATA_DIR, défaut ./data) :
//   index.json                  { codes: {code: {gameId, versions: [n...]}}, games: {gameId: {code, current}} }
//   <gameId>/v<n>/game.json     octets EXACTS reçus (jamais re-sérialisés)
//   <gameId>/v<n>/manifest.json manifest tel que publié
//   <gameId>/v<n>/assets/...    octets des assets
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, normalize } from "node:path";

export const DATA_DIR = process.env.CATALOG_DATA_DIR ?? join(dirname(new URL(import.meta.url).pathname), "data");
const BODY_LIMIT = 25 * 1024 * 1024;
// Anti-rafale de base (anti-abus, PAS une sécurité) : 120 req/min/IP.
const RATE_MAX = 120;
const RATE_WINDOW_MS = 60_000;

const hits = new Map(); // ip -> number[]

function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > RATE_MAX;
}
export function _resetRateLimit() { hits.clear(); }

function sha256hex(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function loadIndex() {
  const p = join(DATA_DIR, "index.json");
  if (!existsSync(p)) return { codes: {}, games: {} };
  return JSON.parse(readFileSync(p, "utf8"));
}

function saveIndex(index) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(join(DATA_DIR, "index.json"), JSON.stringify(index, null, 2));
}

function drawCode(index) {
  for (let i = 0; i < 200; i++) {
    const code = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    if (!index.codes[code]) return code;
  }
  throw new Error("catalogue saturé (10 000 codes)");
}

function send(res, status, obj, contentType = "application/json") {
  const body = typeof obj === "string" ? obj : JSON.stringify(obj);
  // CORS (change studio-lot-correctifs) : catalogue public par design
  // (codes non secrets) — appels navigateur cross-origin assumés.
  res.writeHead(status, {
    "content-type": contentType,
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > BODY_LIMIT) {
        reject(new Error("corps trop volumineux"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function safeAssetPath(raw) {
  const norm = normalize(raw).replace(/^(\.\.(\/|\\|$))+/, "");
  if (!norm || norm.startsWith("/") || norm.includes("..")) return null;
  return norm;
}

export function createApp() {
  return async (req, res) => {
    // Pré-vol CORS : 204 immédiat (change studio-lot-correctifs).
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "content-type",
        "content-length": "0",
      });
      res.end();
      return;
    }
    const ip = req.socket?.remoteAddress ?? "unknown";
    if (rateLimited(ip)) {
      send(res, 429, { error: "trop de requêtes, réessayez dans une minute" });
      return;
    }
    const url = new URL(req.url ?? "/", "http://catalog");
    const parts = url.pathname.split("/").filter(Boolean);

    if (req.method === "GET" && (parts.length === 0 || url.pathname === "/health")) {
      send(res, 200, { ok: true, service: "geoplay-catalog", version: 1 });
      return;
    }

    // GET /games → liste [{code, nom, version, date}]
    if (req.method === "GET" && parts.length === 1 && parts[0] === "games") {
      const index = loadIndex();
      const list = Object.entries(index.codes).map(([code, e]) => {
        const g = index.games[e.gameId];
        return { code, nom: e.gameId, version: g?.current ?? 0, date: g?.date ?? null };
      }).sort((a, b) => a.nom.localeCompare(b.nom));
      send(res, 200, list);
      return;
    }

    // POST /publish {gameId, gameJson (string EXACTE d'export), manifest, assets:[{path, base64}]}
    if (req.method === "POST" && parts.length === 1 && parts[0] === "publish") {
      let body;
      try {
        body = JSON.parse(await readBody(req));
      } catch {
        send(res, 400, { error: "JSON invalide ou trop volumineux" });
        return;
      }
      const { gameId, gameJson, manifest, assets = [] } = body ?? {};
      if (typeof gameId !== "string" || !gameId.trim() || typeof gameJson !== "string") {
        send(res, 400, { error: "gameId et gameJson (string) requis" });
        return;
      }
      let game;
      try {
        game = JSON.parse(gameJson);
      } catch {
        send(res, 400, { error: "gameJson illisible" });
        return;
      }
      if (!game || typeof game !== "object" || !Array.isArray(game.nodes)) {
        send(res, 400, { error: "gameJson invalide : pas un jeu GeoPlay (nodes[] manquant)" });
        return;
      }
      const files = manifest?.files;
      if (!Array.isArray(files) || files.length === 0) {
        send(res, 400, { error: "manifest.files requis" });
        return;
      }
      const assetBytes = new Map();
      for (const a of assets) {
        const p = typeof a?.path === "string" ? safeAssetPath(a.path) : null;
        if (!p || typeof a?.base64 !== "string") {
          send(res, 400, { error: `asset invalide : ${a?.path}` });
          return;
        }
        assetBytes.set(p, Buffer.from(a.base64, "base64"));
      }
      // Cohérence manifest : chaque entrée est re-hachée (game.json sur les
      // octets EXACTS reçus, jamais re-sérialisés).
      const gameBytes = Buffer.from(gameJson, "utf8");
      for (const m of files) {
        const expected = m.path === "game.json" ? gameBytes : assetBytes.get(m.path);
        if (!expected) {
          send(res, 400, { error: `fichier du manifest absent du dépôt : ${m.path}` });
          return;
        }
        if (expected.length !== m.size || sha256hex(expected) !== String(m.sha256).toLowerCase()) {
          send(res, 400, { error: `empreinte incohérente : ${m.path}` });
          return;
        }
      }
      const index = loadIndex();
      let entry = index.games[gameId];
      let code;
      if (entry) {
        code = entry.code;
      } else {
        code = drawCode(index);
        entry = { code, current: 0, date: null };
        index.games[gameId] = entry;
        index.codes[code] = { gameId, versions: [] };
      }
      const version = entry.current + 1;
      const date = new Date().toISOString();
      const dir = join(DATA_DIR, gameId, `v${version}`);
      mkdirSync(join(dir, "assets"), { recursive: true });
      writeFileSync(join(dir, "game.json"), gameBytes);
      writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
      for (const [p, bytes] of assetBytes) {
        const dest = join(dir, "assets", p);
        mkdirSync(dirname(dest), { recursive: true });
        writeFileSync(dest, bytes);
      }
      entry.current = version;
      entry.date = date;
      index.codes[code].versions.push(version);
      saveIndex(index);
      send(res, 200, { code, gameId, version });
      return;
    }

    // GET /games/:code[?v=n] → pack courant (+ compat : game.json TEXTE exact)
    // GET /games/:code/versions → [{version, date}]
    // GET /games/:code/assets/... → octets
    if (req.method === "GET" && parts.length >= 2 && parts[0] === "games") {
      const code = parts[1];
      if (!/^\d{4}$/.test(code)) {
        send(res, 404, { error: "code inconnu" });
        return;
      }
      const index = loadIndex();
      const ref = index.codes[code];
      if (!ref) {
        send(res, 404, { error: "code inconnu" });
        return;
      }
      const gameEntry = index.games[ref.gameId];
      if (parts.length === 3 && parts[2] === "versions") {
        send(res, 200, (ref.versions ?? []).map((v) => ({ version: v })));
        return;
      }
      if (parts.length >= 3 && parts[2] === "assets") {
        const rel = safeAssetPath(parts.slice(3).join("/"));
        if (!rel) {
          send(res, 400, { error: "chemin invalide" });
          return;
        }
        const version = Number(url.searchParams.get("v") ?? gameEntry.current);
        const fp = join(DATA_DIR, ref.gameId, `v${version}`, "assets", rel);
        if (!existsSync(fp)) {
          send(res, 404, { error: "asset introuvable" });
          return;
        }
        const bytes = readFileSync(fp);
        res.writeHead(200, {
          "content-type": "application/octet-stream",
          "content-length": bytes.length,
          "access-control-allow-origin": "*",
        });
        res.end(bytes);
        return;
      }
      if (parts.length === 2) {
        const version = Number(url.searchParams.get("v") ?? gameEntry.current);
        const dir = join(DATA_DIR, ref.gameId, `v${version}`);
        const gfp = join(dir, "game.json");
        const mfp = join(dir, "manifest.json");
        if (!existsSync(gfp) || !existsSync(mfp)) {
          send(res, 404, { error: "version introuvable" });
          return;
        }
        send(res, 200, {
          code,
          gameId: ref.gameId,
          version,
          date: gameEntry.date ?? null,
          gameJson: readFileSync(gfp, "utf8"),
          manifest: JSON.parse(readFileSync(mfp, "utf8")),
        });
        return;
      }
    }

    send(res, 404, { error: "route inconnue" });
  };
}

const PORT = Number(process.env.CATALOG_PORT ?? 3000);
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) {
  createServer(createApp()).listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`geoplay-catalog sur :${PORT} (data: ${DATA_DIR})`);
  });
}
