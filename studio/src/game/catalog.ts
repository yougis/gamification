// Client du service catalogue GeoPlay (change studio-game-catalog).
// Pur (fetch + localStorage) : publication versionnée par nom, liste des
// jeux, récupération par code. La validation et la vérification restent
// côté appelant (exportPackFull / importerFichier) — le service n'est
// qu'un transport, jamais une autorité.
import type { ManifestFile } from "./mcp";

export interface CatalogEntry {
  code: string;
  nom: string;
  version: number;
  date: string | null;
}

export interface PublishedPack {
  code: string;
  gameId: string;
  version: number;
}

export interface CatalogPack {
  code: string;
  gameId: string;
  version: number;
  date: string | null;
  gameJson: string;
  manifest: { files: ManifestFile[] };
}

const CLE_URL = "geoplay-catalog-url";

export function getCatalogUrl(): string {
  try {
    return localStorage.getItem(CLE_URL) ?? "";
  } catch {
    return "";
  }
}

export function setCatalogUrl(url: string): void {
  try {
    localStorage.setItem(CLE_URL, url);
  } catch {
    /* stockage indisponible : URL en mémoire seulement */
  }
}

const sansSlash = (url: string): string => url.replace(/\/+$/, "");

async function lireErreur(r: Response): Promise<string> {
  try {
    const j = (await r.json()) as { error?: string };
    return j.error ?? `HTTP ${r.status}`;
  } catch {
    return `HTTP ${r.status}`;
  }
}

function octetsVersBase64(bytes: Uint8Array): string {
  let bin = "";
  const TAILLE = 0x8000;
  for (let i = 0; i < bytes.length; i += TAILLE) {
    bin += String.fromCharCode(...bytes.subarray(i, i + TAILLE));
  }
  return btoa(bin);
}

export async function listGames(serviceUrl: string): Promise<CatalogEntry[]> {
  const r = await fetch(`${sansSlash(serviceUrl)}/games`);
  if (!r.ok) throw new Error(await lireErreur(r));
  return (await r.json()) as CatalogEntry[];
}

export async function fetchPack(serviceUrl: string, code: string): Promise<CatalogPack> {
  const r = await fetch(`${sansSlash(serviceUrl)}/games/${code}`);
  if (r.status === 404) throw new Error("code inconnu");
  if (!r.ok) throw new Error(await lireErreur(r));
  return (await r.json()) as CatalogPack;
}

// Octets d'un asset du pack publié (change studio-inventory-catalog) :
// GET /games/:code/assets/<chemin>. Sert à ré-enregistrer icône/image d'un
// objet importé dans le manifest du jeu courant (pack autonome, jamais de
// référence externe).
export async function fetchAsset(serviceUrl: string, code: string, path: string): Promise<Uint8Array> {
  const r = await fetch(`${sansSlash(serviceUrl)}/games/${code}/assets/${path.split("/").map(encodeURIComponent).join("/")}`);
  if (r.status === 404) throw new Error("asset introuvable");
  if (!r.ok) throw new Error(await lireErreur(r));
  return new Uint8Array(await r.arrayBuffer());
}

export async function publishGame(
  serviceUrl: string,
  opts: { gameId: string; gameJson: string; manifest: { files: ManifestFile[] }; assets: { path: string; file: File }[] },
): Promise<PublishedPack> {
  const assets = [];
  for (const a of opts.assets) {
    const bytes = new Uint8Array(await a.file.arrayBuffer());
    assets.push({ path: a.path, base64: octetsVersBase64(bytes) });
  }
  const r = await fetch(`${sansSlash(serviceUrl)}/publish`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ gameId: opts.gameId, gameJson: opts.gameJson, manifest: opts.manifest, assets }),
  });
  if (!r.ok) throw new Error(await lireErreur(r));
  return (await r.json()) as PublishedPack;
}
