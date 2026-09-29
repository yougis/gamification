// Endpoint /emulate du Studio dev-only (change preview-pwa-iframe) : sert
// le jeu COURANT (snapshot poussé par App depuis Prévisualiser) à la PWA
// émulée en iframe — même esprit que le proxy /tiles existant.
// AUCUNE persistance : mémoire du process `vite dev` uniquement. Ne jamais
// importer ce module dans le bundle navigateur (serveur uniquement).
// Testé via emulate.smoke.ts (requêtes/réponses factices, sans Vite).

export interface EmulateAssetDepot {
  path: string;
  bytes: Uint8Array;
}

export interface EmulateSnapshot {
  gameJson: string;
  manifestJson: string;
  compatJson: string | null;
  assets: Map<string, Uint8Array>;
}

export function createEmulateStore() {
  let snapshot: EmulateSnapshot | null = null;
  return {
    get(): EmulateSnapshot | null {
      return snapshot;
    },
    set(s: EmulateSnapshot): void {
      snapshot = s;
    },
  };
}

export type EmulateStore = ReturnType<typeof createEmulateStore>;

export interface EmulateReq {
  url?: string;
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  [Symbol.asyncIterator]?: () => AsyncIterator<Uint8Array>;
  on?: (event: string, cb: (...args: never[]) => void) => void;
}

export interface EmulateRes {
  writeHead: (status: number, headers?: Record<string, string | number>) => void;
  end: (body?: string | Uint8Array) => void;
}

const LIMITE_OCTETS = 25 * 1024 * 1024;

async function lireCorps(req: EmulateReq): Promise<string> {
  if (typeof req[Symbol.asyncIterator] === "function") {
    const morceaux: Uint8Array[] = [];
    let taille = 0;
    for await (const brut of req as AsyncIterable<unknown>) {
      const b = brut instanceof Uint8Array ? brut : new TextEncoder().encode(String(brut));
      taille += b.length;
      if (taille > LIMITE_OCTETS) throw new Error("corps trop volumineux");
      morceaux.push(b);
    }
    const total = new Uint8Array(taille);
    let pos = 0;
    for (const m of morceaux) {
      total.set(m, pos);
      pos += m.length;
    }
    return new TextDecoder().decode(total);
  }
  // Repli EventEmitter (IncomingMessage Node pur).
  return new Promise((resolve, reject) => {
    const morceaux: Buffer[] = [];
    let taille = 0;
    const onData = (c: never) => {
      const b = Buffer.isBuffer(c) ? c : Buffer.from(c as unknown as Uint8Array);
      taille += b.length;
      if (taille > LIMITE_OCTETS) {
        reject(new Error("corps trop volumineux"));
        return;
      }
      morceaux.push(b);
    };
    const onEnd = () => resolve(Buffer.concat(morceaux).toString("utf8"));
    const onError = (e: unknown) => reject(e instanceof Error ? e : new Error(String(e)));
    try {
      (req.on ?? (() => {}))("data", onData as never);
      (req.on ?? (() => {}))("end", onEnd as never);
      (req.on ?? (() => {}))("error", onError as never);
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)));
    }
  });
}

function repondre(res: EmulateRes, statut: number, corps: string | Uint8Array, type = "application/json"): void {
  res.writeHead(statut, {
    "content-type": type,
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  res.end(corps);
}

function base64VersOctets(b64: string): Uint8Array {
  if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(b64, "base64"));
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Traite une requête `/emulate/*`. Retourne true si prise en charge
 * (réponse envoyée), false sinon (passer au middleware suivant).
 */
export async function handleEmulate(
  store: EmulateStore,
  req: EmulateReq,
  res: EmulateRes,
): Promise<boolean> {
  const methode = (req.method ?? "GET").toUpperCase();
  const chemin = (req.url ?? "/").split("?")[0];
  if (!chemin.startsWith("/emulate")) return false;
  if (methode === "OPTIONS") {
    repondre(res, 204, "");
    return true;
  }
  const rel = chemin.slice("/emulate".length) || "/";

  if (methode === "POST" && rel === "/snapshot") {
    let body: unknown;
    try {
      body = JSON.parse(await lireCorps(req));
    } catch {
      repondre(res, 400, JSON.stringify({ error: "JSON invalide ou trop volumineux" }));
      return true;
    }
    const b = (body ?? {}) as Record<string, unknown>;
    const files = (b.manifest as { files?: unknown } | undefined)?.files;
    if (typeof b.gameJson !== "string" || !Array.isArray(files) || files.length === 0) {
      repondre(res, 400, JSON.stringify({ error: "gameJson (string) et manifest.files requis" }));
      return true;
    }
    const assets = new Map<string, Uint8Array>();
    for (const a of ((b.assets ?? []) as { path?: unknown; base64?: unknown }[])) {
      if (typeof a?.path !== "string" || typeof a?.base64 !== "string" || a.path.includes("..")) {
        repondre(res, 400, JSON.stringify({ error: `asset invalide : ${a?.path}` }));
        return true;
      }
      assets.set(a.path, base64VersOctets(a.base64));
    }
    store.set({
      gameJson: b.gameJson,
      manifestJson: JSON.stringify(b.manifest),
      compatJson: typeof b.compat === "string" ? b.compat : null,
      assets,
    });
    repondre(res, 200, JSON.stringify({ ok: true, fichiers: files.length }));
    return true;
  }

  if (methode === "GET" && (rel === "/game.json" || rel === "/manifest.json" || rel === "/compat.json")) {
    const snap = store.get();
    if (snap == null) {
      repondre(res, 404, JSON.stringify({ error: "aucun snapshot — poussez depuis Prévisualiser" }));
      return true;
    }
    if (rel === "/game.json") {
      repondre(res, 200, snap.gameJson);
      return true;
    }
    if (rel === "/manifest.json") {
      repondre(res, 200, snap.manifestJson);
      return true;
    }
    if (snap.compatJson == null) {
      repondre(res, 404, JSON.stringify({ error: "compat indisponible pour ce snapshot" }));
      return true;
    }
    repondre(res, 200, snap.compatJson);
    return true;
  }

  if (methode === "GET" && rel.startsWith("/assets/")) {
    const snap = store.get();
    const chemin = rel.slice("/assets/".length);
    const octets = snap?.assets.get(chemin);
    if (octets == null) {
      repondre(res, 404, JSON.stringify({ error: "asset introuvable dans le snapshot" }));
      return true;
    }
    repondre(res, 200, octets, "application/octet-stream");
    return true;
  }

  repondre(res, 404, JSON.stringify({ error: "route emulate inconnue" }));
  return true;
}
