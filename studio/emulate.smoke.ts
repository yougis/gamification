// Smoke du endpoint /emulate (change preview-pwa-iframe, 2.1) : requêtes
// factices, sans Vite ni navigateur. `npx tsx emulate.smoke.ts`.
import { strict as assert } from "node:assert";
import {
  createEmulateStore,
  handleEmulate,
  type EmulateReq,
  type EmulateRes,
} from "./emulate-plugin.ts";

function requete(url: string, methode = "GET", corps?: string): EmulateReq {
  return {
    url,
    method: methode,
    async *[Symbol.asyncIterator]() {
      if (corps !== undefined) yield new TextEncoder().encode(corps);
    },
  };
}

function reponse(): { res: EmulateRes; resultat: () => { statut: number; corps: string } } {
  let statut = 0;
  const morceaux: Uint8Array[] = [];
  return {
    res: {
      writeHead: (s: number) => {
        statut = s;
      },
      end: (b?: string | Uint8Array) => {
        if (b !== undefined) morceaux.push(typeof b === "string" ? new TextEncoder().encode(b) : b);
      },
    },
    resultat: () => ({
      statut,
      corps: new TextDecoder().decode(
        morceaux.reduce((acc, m) => {
          const t = new Uint8Array(acc.length + m.length);
          t.set(acc);
          t.set(m, acc.length);
          return t;
        }, new Uint8Array(0)),
      ),
    }),
  };
}

async function appel(
  store: ReturnType<typeof createEmulateStore>,
  url: string,
  methode = "GET",
  corps?: string,
) {
  const r = reponse();
  const pris = await handleEmulate(store, requete(url, methode, corps), r.res);
  return { pris, ...r.resultat() };
}

const store = createEmulateStore();

// Non pris en charge → false (passe au middleware suivant).
{
  const r = reponse();
  assert.equal(await handleEmulate(store, requete("/tiles/1/2/3.png"), r.res), false);
  console.log("2.1 passthrough hors /emulate : OK");
}

// 404 explicite avant snapshot.
{
  const r = await appel(store, "/emulate/game.json");
  assert.equal(r.pris, true);
  assert.equal(r.statut, 404);
  assert.match(r.corps, /aucun snapshot/);
  console.log("2.1 404 explicite sans snapshot : OK");
}

// Snapshot invalide → 400.
{
  const r = await appel(store, "/emulate/snapshot", "POST", JSON.stringify({ gameJson: 42 }));
  assert.equal(r.statut, 400);
  console.log("2.1 snapshot invalide refusé : OK");
}

// Snapshot complet → lecture game/manifest/compat + asset.
{
  const gameJson = JSON.stringify({ gameId: "Château", schemaVersion: "1.0.0", nodes: [] });
  const manifest = { files: [{ path: "game.json", version: "1", size: 1, sha256: "x" }] };
  const mise = await appel(
    store,
    "/emulate/snapshot",
    "POST",
    JSON.stringify({
      gameJson,
      manifest,
      compat: JSON.stringify({ ok: true }),
      assets: [{ path: "assets/a.png", base64: Buffer.from("octets-tuile").toString("base64") }],
    }),
  );
  assert.equal(mise.statut, 200);
  const g = await appel(store, "/emulate/game.json");
  assert.equal(g.statut, 200);
  assert.equal(g.corps, gameJson);
  const m = await appel(store, "/emulate/manifest.json");
  assert.ok(m.corps.includes("game.json"));
  const c = await appel(store, "/emulate/compat.json");
  assert.ok(c.corps.includes('"ok":true'));
  const a = await appel(store, "/emulate/assets/assets/a.png");
  assert.equal(a.statut, 200);
  assert.equal(a.corps, "octets-tuile");
  const manque = await appel(store, "/emulate/assets/nope.png");
  assert.equal(manque.statut, 404);
  const opt = await appel(store, "/emulate/game.json", "OPTIONS");
  assert.equal(opt.statut, 204);
  console.log("2.1 snapshot → game/manifest/compat/assets + CORS : OK");
}

console.log("\nEmulate endpoint : OK");
