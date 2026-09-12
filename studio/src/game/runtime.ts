// Runtime joueur (logique pure) : init topo, file FIFO a modale unique,
// hotes isoles, politiques GPS/boussole/camera. Liaisons natives (CoreLocation,
// capteurs, MapLibre) en differe plateforme ; tout le decidable est ici et teste.
import { drawPool } from "./evaluate";
import type { Game, GameNode } from "./types";

// --- 1.1 Resolution ON_GAME_START en ordre topo + persistance immediate ---
export function resolveGameStartPools(
  game: Game,
  sessionId: string,
  forced: Record<string, string[]> = {},
  persist: (poolId: string, drawn: string[]) => void = () => {},
): Record<string, string[]> {
  const pools = game.nodes.filter((n) => n.randomPool?.drawTiming === "ON_GAME_START");
  const byId = new Map(game.nodes.map((n) => [n.id, n]));
  const draws: Record<string, string[]> = {};
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  const resolve = (p: GameNode, stack: string[]): void => {
    color.set(p.id, GRAY);
    for (const c of p.activation.requires) {
      const depId = c.type === "POOL_DRAWN" ? c.poolNodeId : c.type === "NODE_COMPLETED" ? c.nodeId : undefined;
      const dep = depId ? byId.get(depId) : undefined;
      if (!dep?.randomPool || dep.randomPool.drawTiming !== "ON_GAME_START") continue;
      const col = color.get(dep.id) ?? WHITE;
      if (col === GRAY) throw new Error(`cycle inter-pools : ${[...stack, p.id, dep.id].join(" -> ")}`);
      if (col === WHITE) resolve(dep, [...stack, p.id]);
    }
    color.set(p.id, BLACK);
    if (!(p.id in draws)) {
      draws[p.id] = drawPool(p, sessionId, forced[p.id]);
      persist(p.id, draws[p.id]); // ecriture immediate, jamais de recalcul
    }
  };
  for (const p of pools) if ((color.get(p.id) ?? WHITE) === WHITE) resolve(p, []);
  return draws;
}

// --- 1.2 File FIFO a modale unique (ACTIVE latche, eviction au relock) ---
export interface Presentation {
  activeId: string | null;
  queue: string[];
}

export function present(
  unlocked: string[],
  prevQueue: string[],
  prevActive: string | null,
): Presentation {
  const stillThere = new Set(unlocked);
  if (prevActive && stillThere.has(prevActive)) {
    // ACTIVE latche : la modale ouverte survit, la file suit le latch.
    const queue = [...prevQueue.filter((id) => stillThere.has(id) && id !== prevActive)];
    for (const id of unlocked) if (id !== prevActive && !queue.includes(id)) queue.push(id);
    return { activeId: prevActive, queue };
  }
  const queue = [...prevQueue.filter((id) => stillThere.has(id))];
  for (const id of unlocked) if (!queue.includes(id)) queue.push(id);
  const [next = null, ...rest] = queue;
  return { activeId: next, queue: rest };
}

// --- 1.3 Hote de modules isole ---
export type RenderFn = (data: Record<string, unknown>) => unknown;

export function hostModule(
  registry: Map<string, { render: RenderFn }>,
  type: string,
  data: Record<string, unknown>,
): { ok: true; value: unknown } | { ok: false; nonJouable: string } {
  const entry = registry.get(type);
  if (!entry) return { ok: false, nonJouable: `Module ${type} inconnu : etape non jouable, jeu continue.` };
  try {
    return { ok: true, value: entry.render(data) };
  } catch (e) {
    return { ok: false, nonJouable: `Module ${type} en echec (${String(e)}) : etape non jouable, boucle vivante.` };
  }
}

// --- 2.1 GPS adaptatif (Hz) + message de refus poli ---
export type GpsPhase = "repos" | "navigation" | "epreuve";

export function gpsFrequencyHz(phase: GpsPhase, batterieFaible: boolean): number {
  const base = phase === "epreuve" ? 1 : phase === "navigation" ? 0.5 : 0.1;
  return batterieFaible ? base / 2 : base;
}

export function accuracyMessage(accuracyM: number, maxAccuracyM?: number): string | null {
  if (maxAccuracyM == null || accuracyM <= maxAccuracyM) return null;
  return `Précision insuffisante (${accuracyM} m pour ${maxAccuracyM} m requis) : avance vers un ciel dégagé, l'étape reste en attente.`;
}

// --- 2.2 Boussole lissee + masquage, camera a la demande ---
export function smoothHeading(prevDeg: number, nextDeg: number, alpha: number): number {
  let d = ((nextDeg - prevDeg + 540) % 360) - 180; // plus court chemin circulaire
  return (((prevDeg + alpha * d) % 360) + 360) % 360;
}

export function compassState(
  accuracyDeg: number,
  toleranceDeg: number,
): { masquee: boolean; capOk: boolean } {
  if (accuracyDeg > toleranceDeg * 2) return { masquee: true, capOk: false };
  return { masquee: false, capOk: true };
}

export function cameraPolicy(openDemand: number, closeDemand: number): boolean {
  return openDemand > closeDemand; // compteur : ouverte ssi demandes nettes > 0
}
