// Coeur pack offline (pur, isomorphe, sans I/O) : manifest, verification,
// differentiel, reprise, gating de lancement, estimation, fallback carte.
// Utilise par le Studio (export) et, demain, par le runtime natif.
export interface ManifestFile {
  path: string;
  version: string;
  size: number;
  sha256: string;
}

export async function sha256Hex(s: string | Uint8Array): Promise<string> {
  const data = typeof s === "string" ? new TextEncoder().encode(s) : s;
  const buf = await crypto.subtle.digest("SHA-256", data as BufferSource);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type FileCheck = { path: string; status: "ok" | "manquant" | "corrompu" };

export async function verifyManifest(
  manifest: ManifestFile[],
  lire: (path: string) => Promise<Uint8Array | null>,
): Promise<FileCheck[]> {
  const out: FileCheck[] = [];
  for (const m of manifest) {
    const bytes = await lire(m.path);
    if (!bytes) {
      out.push({ path: m.path, status: "manquant" });
      continue;
    }
    out.push({ path: m.path, status: (await sha256Hex(bytes)) === m.sha256 ? "ok" : "corrompu" });
  }
  return out;
}

// Fichiers a (re)telecharger : absents, corrompus, ou version changee.
export function diffManifest(
  ancien: ManifestFile[],
  nouveau: ManifestFile[],
  etatLocal: Record<string, "ok" | "manquant" | "corrompu">,
): { aTelecharger: ManifestFile[]; conserves: string[] } {
  const oldByPath = new Map(ancien.map((m) => [m.path, m]));
  const aTelecharger: ManifestFile[] = [];
  const conserves: string[] = [];
  for (const m of nouveau) {
    const prev = oldByPath.get(m.path);
    const sameVersion = prev !== undefined && prev.version === m.version && prev.sha256 === m.sha256;
    if (sameVersion && etatLocal[m.path] === "ok") conserves.push(m.path);
    else aTelecharger.push(m);
  }
  return { aTelecharger, conserves };
}

export interface LaunchGate {
  lancable: boolean;
  motif?: string;
  progression: number; // 0..1 en octets verifies
}

export function launchGate(checks: FileCheck[], manifest: ManifestFile[]): LaunchGate {
  const sizes = new Map(manifest.map((m) => [m.path, m.size]));
  const total = manifest.reduce((s, m) => s + m.size, 0) || 1;
  const okBytes = checks
    .filter((c) => c.status === "ok")
    .reduce((s, c) => s + (sizes.get(c.path) ?? 0), 0);
  const fautifs = checks.filter((c) => c.status !== "ok").map((c) => `${c.path} (${c.status})`);
  if (!fautifs.length) return { lancable: true, progression: 1 };
  return {
    lancable: false,
    motif: `Pack incomplet : ${fautifs.join(", ")}`,
    progression: okBytes / total,
  };
}

export function estimateSize(manifest: ManifestFile[]): { octets: number; lisible: string } {
  const octets = manifest.reduce((s, m) => s + m.size, 0);
  const lisible = octets >= 1048576 ? `${(octets / 1048576).toFixed(1)} Mo` : `${Math.ceil(octets / 1024)} Ko`;
  return { octets, lisible };
}

export function checkQuota(
  manifest: ManifestFile[],
  octetsLibres: number,
): { ok: boolean; message: string } {
  const { octets, lisible } = estimateSize(manifest);
  if (octetsLibres >= octets) return { ok: true, message: `Pack ${lisible}, espace suffisant.` };
  return { ok: false, message: `Pack ${lisible} pour ${Math.ceil(octetsLibres / 1024)} Ko libres : telechargement refuse poliment.` };
}

export type FondCarte = "tuiles" | "statique" | "uni";

// Fond uni si tuiles absentes (trace + position + fleche restent lisibles).
export function selectFond(tuilesDisponibles: boolean, statiqueDisponible: boolean): FondCarte {
  if (tuilesDisponibles) return "tuiles";
  if (statiqueDisponible) return "statique";
  return "uni";
}

// --- Estimation des tuiles (change smart-tile-caching) ---
// Comptage pur des tuiles slippy-map couvrant une bbox pour une plage de
// zooms. Borne les zooms à [0, 22] et la bbox aux plages valides : jamais
// d'explosion combinatoire sur une config aberrante.

export interface BboxTuiles {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

const ZOOM_MIN = 0;
const ZOOM_MAX = 22;
/** Poids moyen constaté d'une tuile raster (estimation, jamais un quota). */
export const OCTETS_PAR_TUILE_ESTIMES = 20 * 1024;

function bornerZoom(z: number): number {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.floor(z)));
}

function tuilesPourZoom(bbox: BboxTuiles, zoom: number): number {
  const n = 2 ** zoom;
  const lonVersX = (lon: number) => Math.floor(((lon + 180) / 360) * n);
  const latVersY = (lat: number) => {
    const rad = (Math.max(-85, Math.min(85, lat)) * Math.PI) / 180;
    return Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n);
  };
  const x0 = Math.max(0, lonVersX(Math.min(bbox.minLng, bbox.maxLng)));
  const x1 = Math.min(n - 1, lonVersX(Math.max(bbox.minLng, bbox.maxLng)));
  const y0 = Math.max(0, latVersY(Math.max(bbox.minLat, bbox.maxLat)));
  const y1 = Math.min(n - 1, latVersY(Math.min(bbox.minLat, bbox.maxLat)));
  if (x1 < x0 || y1 < y0) return 0;
  return (x1 - x0 + 1) * (y1 - y0 + 1);
}

/** Nombre de tuiles couvrant la bbox sur [minZoom, maxZoom] (bornes incluses). */
export function compterTuiles(bbox: BboxTuiles, minZoom: number, maxZoom: number): number {
  const lo = bornerZoom(Math.min(minZoom, maxZoom));
  const hi = bornerZoom(Math.max(minZoom, maxZoom));
  let total = 0;
  for (let z = lo; z <= hi; z++) total += tuilesPourZoom(bbox, z);
  return total;
}

/** Estimation {nbTuiles, octets, lisible} avant génération (menu Packs de carte). */
export function estimerPackTuiles(
  bbox: BboxTuiles,
  minZoom: number,
  maxZoom: number,
): { nbTuiles: number; octets: number; lisible: string } {
  const nbTuiles = compterTuiles(bbox, minZoom, maxZoom);
  const octets = nbTuiles * OCTETS_PAR_TUILE_ESTIMES;
  return { nbTuiles, octets, lisible: estimateSize([{ path: "tuiles", version: "1", size: octets, sha256: "" }]).lisible };
}

// --- Tuiles hors zone (change smart-tile-caching) ---
// Décode une clé de tuile `tuiles/z/x/y.*` (ou `z/x/y`) vers ses bornes
// géographiques et teste l'intersection avec la bbox du jeu. Pur, sans I/O.

const CLE_TUILE = /^(?:tuiles\/)?(\d{1,2})\/(\d+)\/(\d+)(?:\..*)?$/;

function bornesTuile(z: number, x: number, y: number): BboxTuiles {
  const n = 2 ** z;
  const minLng = (x / n) * 360 - 180;
  const maxLng = ((x + 1) / n) * 360 - 180;
  const yVersLat = (t: number) => {
    const rad = Math.atan(Math.sinh(Math.PI * (1 - (2 * t) / n)));
    return (rad * 180) / Math.PI;
  };
  return { minLat: yVersLat(y + 1), minLng, maxLat: yVersLat(y), maxLng };
}

function intersecte(a: BboxTuiles, b: BboxTuiles): boolean {
  return a.minLng <= b.maxLng && a.maxLng >= b.minLng && a.minLat <= b.maxLat && a.maxLat >= b.minLat;
}

/** Clés de tuiles du manifest qui n'intersectent pas la bbox du jeu. */
export function detecterTuilesHorsBbox(bbox: BboxTuiles, cles: string[]): string[] {
  const hors: string[] = [];
  for (const cle of cles) {
    const m = CLE_TUILE.exec(cle);
    if (!m) continue; // pas une tuile (asset, game.json…) : hors périmètre
    const z = Number(m[1]);
    if (z < ZOOM_MIN || z > ZOOM_MAX) continue;
    if (!intersecte(bbox, bornesTuile(z, Number(m[2]), Number(m[3])))) hors.push(cle);
  }
  return hors;
}
