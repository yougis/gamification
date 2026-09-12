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
