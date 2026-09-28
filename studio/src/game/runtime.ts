// Runtime joueur (logique pure) : init topo, file FIFO a modale unique,
// hotes isoles, politiques GPS/boussole/camera, meta-etat HOLD kiosque.
// Liaisons natives (CoreLocation, capteurs, MapLibre) en differe plateforme ;
// tout le deducible est ici et teste.
import { drawPool } from "./evaluate";
import type { Game, GameNode, HoldMode, HoldExit } from "./types";

// --- Hold kiosque meta-etat ---
export interface HoldState {
  active: boolean;
  mode: HoldMode;
  lockedAt: number;
  exitMethod?: HoldExit["method"];
  attempts: number;
  journal: HoldEvent[];
}

export interface HoldEvent {
  type: "holdLock" | "holdUnlock" | "holdBlock" | "holdExit" | "holdExitAttempt" | "holdForceExit";
  timestamp: number;
  method?: HoldExit["method"];
  success: boolean;
  sessionId: string;
}

export function createHoldState(mode: HoldMode): HoldState {
  return { active: mode !== "none", mode, lockedAt: Date.now(), attempts: 0, journal: [] };
}

export function holdLock(state: HoldState, sessionId: string): HoldEvent {
  const evt: HoldEvent = { type: "holdLock", timestamp: Date.now(), success: true, sessionId };
  state.journal.push(evt);
  return evt;
}

export function holdUnlock(state: HoldState, method: HoldExit["method"], sessionId: string): HoldEvent {
  state.attempts++;
  const evt: HoldEvent = { type: "holdUnlock", timestamp: Date.now(), method, success: true, sessionId };
  state.journal.push(evt);
  return evt;
}

export function holdExitAttempt(state: HoldState, sessionId: string): HoldEvent {
  state.attempts++;
  const evt: HoldEvent = { type: "holdExitAttempt", timestamp: Date.now(), success: false, sessionId };
  state.journal.push(evt);
  return evt;
}

export function holdForceExit(state: HoldState, sessionId: string): HoldEvent {
  const evt: HoldEvent = { type: "holdForceExit", timestamp: Date.now(), success: true, sessionId };
  state.journal.push(evt);
  state.active = false;
  return evt;
}

export function isHoldActive(state: HoldState): boolean {
  return state.active;
}

// --- Journalisation systématique des entrees/sorties ---
export type SessionEvent =
  | { type: "sessionStart"; timestamp: number; sessionId: string }
  | { type: "sessionPause"; timestamp: number; sessionId: string }
  | { type: "sessionResume"; timestamp: number; sessionId: string }
  | { type: "sessionEnd"; timestamp: number; sessionId: string }
  | HoldEvent
  | InventoryEvent;

// --- Événements d'inventaire (change inventory-events-hints) ---
// Vocabulaire fermé : ces six types, ni plus ni moins. Le journal EST le
// bus : l'écoute = filtre sur type (+ itemId) au rendu, jamais de callback.
export type InventoryEventType =
  | "INVENTORY_OPENED"
  | "ITEM_SELECTED"
  | "ITEM_USED"
  | "ITEM_COMBINED"
  | "ITEM_GIVEN"
  | "ITEM_REMOVED";

export const INVENTORY_EVENT_TYPES: readonly InventoryEventType[] = [
  "INVENTORY_OPENED",
  "ITEM_SELECTED",
  "ITEM_USED",
  "ITEM_COMBINED",
  "ITEM_GIVEN",
  "ITEM_REMOVED",
];

export interface InventoryEvent {
  type: InventoryEventType;
  timestamp: number;
  sessionId: string;
  itemId?: string;
  isCheat?: boolean;
}

export function createInventoryEvent(
  type: InventoryEventType,
  sessionId: string,
  itemId?: string,
  isCheat = false,
): InventoryEvent {
  return { type, timestamp: Date.now(), sessionId, ...(itemId ? { itemId } : {}), isCheat };
}

export function createSessionEvent(type: SessionEvent["type"], sessionId: string): SessionEvent {
  return { type, timestamp: Date.now(), sessionId };
}

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

// --- 1.2bis Suggestion d'ouverture (change home-player-runtime, compat-first) ---
// `present()` ci-dessus reste inchange (modale unique). `suggest()` calcule la
// meme file SANS jamais assigner d'actif : la tete est proposee, l'ouverture
// reste manuelle (volet/carte/liste). `prevFile` = file suggeree precedente
// complete (tete incluse). Eviction au relock, ordre stable, jamais d'event.
export interface Suggestion {
  tete: string | null;
  file: string[];
}

export function suggest(unlocked: string[], prevFile: string[]): Suggestion {
  const file = [...prevFile.filter((id) => unlocked.includes(id))];
  for (const id of unlocked) if (!file.includes(id)) file.push(id);
  return { tete: file[0] ?? null, file };
}

// --- 1.2ter Snapshot d'ouverture + verdict Valider (change home-player-runtime) ---
// Snapshot pris a l'entree etape (t0) : seuls les eligibles t0 sont jouables.
// Valider compare au frais (t1) : eligible t1 = COMPLETED normal, eligible t0
// seulement = COMPLETED + hors-delai (droit a finir), jamais eligible = refus
// (vue en apercu seul, aucun Valider possible). Pur, sans ecriture.
export interface Ouverture {
  id: string;
  t0: number;
  eligiblesT0: string[];
}

export function snapshotOuverture(id: string, nowMs: number, eligiblesT0: string[]): Ouverture {
  return { id, t0: nowMs, eligiblesT0: [...eligiblesT0] };
}

export type VerdictValider =
  | { ok: true; horsDelai: boolean }
  | { ok: false; motif: "non-eligible-ouverture" };

export function verdictValider(ouverture: Ouverture, eligiblesT1: string[]): VerdictValider {
  if (!ouverture.eligiblesT0.includes(ouverture.id)) {
    return { ok: false, motif: "non-eligible-ouverture" };
  }
  return { ok: true, horsDelai: !eligiblesT1.includes(ouverture.id) };
}

// --- 1.2quater Verdict Abandonner (change home-player-runtime, option B) ---
// Abandonner une tentative jouable/rejouable ecrit `ABANDON` (sans effet ni
// score) et consomme 1 essai du budget `maxReentries`. Apercu et relecture
// restent gratuits (refus `apercu-gratuit`, zero ecriture). Idempotent par
// ouverture (`id@t0` deja journalise = `deja-abandonne`). `hors-delai` si
// l'etape a expire entre t0 et l'abandon. Pur, sans ecriture.
export type VerdictAbandonner =
  | { ok: true; event: "ABANDON"; horsDelai: boolean; essaisRestants: number }
  | { ok: false; motif: "apercu-gratuit" | "deja-abandonne" };

export function cleOuverture(o: Ouverture): string {
  return `${o.id}@${o.t0}`;
}

export function verdictAbandonner(
  ouverture: Ouverture,
  eligiblesT1: string[],
  essaisRestants: number,
  abandonsDejaJournalises: Set<string>,
): VerdictAbandonner {
  if (!ouverture.eligiblesT0.includes(ouverture.id)) {
    return { ok: false, motif: "apercu-gratuit" };
  }
  if (abandonsDejaJournalises.has(cleOuverture(ouverture))) {
    return { ok: false, motif: "deja-abandonne" };
  }
  return {
    ok: true,
    event: "ABANDON",
    horsDelai: !eligiblesT1.includes(ouverture.id),
    essaisRestants: Math.max(0, essaisRestants - 1),
  };
}

// --- 1.2quinquies Regime de completion (change home-player-runtime) ---
// Effets une seule fois (premiere completion), score selon `scoreOnReplay`
// ensuite. `completionsDeja` = nombre de Valider deja journalises pour le
// noeud. Anti-farming : un rejeu ne redonne jamais (pas de double GIVE_ITEM,
// pas de REVEAL rejoue). Pur, sans ecriture.
export interface RegimeCompletion {
  effets: boolean;
  score: boolean;
}

export function regimeCompletion(completionsDeja: number, scoreOnReplay: boolean): RegimeCompletion {
  if (completionsDeja <= 0) return { effets: true, score: true };
  return { effets: false, score: scoreOnReplay };
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
