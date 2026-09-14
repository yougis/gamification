// Orchestrateur minimal pour la preview scriptee (logique pure, testable).
// Semantique = specs 000/100. Toute preview porte le flag triche.
import type { Condition, Game, GameNode } from "./types";

export interface Sim {
  present: Set<string>; // nodeIds dont GEOFENCE/PROXIMITY simule vrai
  dwellOk: Set<string>; // nodeIds dont le dwell simule est ecoule
  throughOk: Set<string>; // nodeIds dont la traversee simulee est faite
  nowMs: number; // horloge session, GAME_START = 0
  completedAt: Map<string, number>; // nodeId -> timestamp
  accuracyM?: number; // precision GPS simulee (defaut : bonne, 5 m)
  holdMode?: string; // mode kiosque HOLD actif
  holdExit?: { method: string }; // exit animateur en cours
}

export interface PreviewEvent {
  t: number;
  msg: string;
  triche: true;
}

const hashSeed = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export function drawPool(pool: GameNode, seedStr: string, forced?: string[]): string[] {
  const { candidates, drawCount } = pool.randomPool!;
  if (forced?.length) return forced.slice(0, drawCount);
  const rand = rng(hashSeed(seedStr + pool.id));
  const bag = [...candidates];
  const out: string[] = [];
  while (out.length < drawCount && bag.length) {
    out.push(bag.splice(Math.floor(rand() * bag.length), 1)[0]);
  }
  return out;
}

const ENV = new Set(["GEOFENCE", "TIMER", "PROXIMITY_MASTER"]);

export function condTrue(
  game: Game,
  nodeId: string,
  c: Condition,
  sim: Sim,
  draws: Record<string, string[]>,
  completedAt: Map<string, number>,
  completedCount: Map<string, number>,
): boolean {
  void game;
  void completedCount;
  switch (c.type) {
    case "GEOFENCE": {
      if (c.maxAccuracyM != null && (sim.accuracyM ?? 5) > c.maxAccuracyM) return false;
      const p = sim.present.has(nodeId);
      if (c.predicate === "exit") return !p;
      if (c.predicate === "dwell") return p && sim.dwellOk.has(nodeId);
      if (c.predicate === "through") return sim.throughOk.has(nodeId);
      return p;
    }
    case "PROXIMITY_MASTER": {
      const p = sim.present.has(nodeId);
      if (c.predicate === "exit") return !p;
      if (c.predicate === "dwell") return p && sim.dwellOk.has(nodeId);
      if (c.predicate === "through") return sim.throughOk.has(nodeId);
      return p;
    }
    case "NODE_COMPLETED":
      return (completedAt.get(c.nodeId!) ?? -1) >= 0;
    case "TIMER": {
      const anchor = c.anchor === "NODE_COMPLETION" ? (completedAt.get(c.anchorNodeId!) ?? Infinity) : 0;
      return sim.nowMs >= anchor + (c.delaySeconds ?? 0) * 1000;
    }
    case "POOL_DRAWN":
      return (draws[c.poolNodeId!] ?? []).length > 0;
    default:
      return false; // CONDITIONAL/WINDOW : ignores gracieusement
  }
}

export function evalNode(
  game: Game,
  n: GameNode,
  sim: Sim,
  draws: Record<string, string[]>,
  completedAt: Map<string, number>,
  completedCount: Map<string, number>,
): boolean {
  const vals = n.activation.requires.map((c) => condTrue(game, n.id, c, sim, draws, completedAt, completedCount));
  const op = n.activation.operator;
  if (n.activation.requires.length > 1) return op === "OR" ? vals.some(Boolean) : vals.every(Boolean);
  return vals[0] ?? false;
}

export interface EvalResult {
  unlocked: string[];
  auto: string[]; // conditions environnementales -> passage auto
  choice: string[]; // graphe seul -> choix
}

export function evaluate(
  game: Game,
  sim: Sim,
  draws: Record<string, string[]>,
  completedAt: Map<string, number>,
  completedCount: Map<string, number>,
  prevUnlocked: Set<string>,
): EvalResult {
  const unlocked: string[] = [];
  for (const n of game.nodes) {
    if (n.randomPool) continue; // structurel, jamais presente
    if ((completedCount.get(n.id) ?? 0) > 0) continue; // COMPLETED : reentry gere a part
    const ok = evalNode(game, n, sim, draws, completedAt, completedCount);
    if (ok) {
      unlocked.push(n.id);
    } else if (prevUnlocked.has(n.id) && (n.activation.latch ?? true)) {
      unlocked.push(n.id); // latch : reste eligible (sinon relock implicite)
    }
  }
  const hasEnv = (id: string) =>
    game.nodes.find((n) => n.id === id)!.activation.requires.some((c) => ENV.has(c.type));
  return {
    unlocked,
    auto: unlocked.filter(hasEnv),
    choice: unlocked.filter((id) => !hasEnv(id)),
  };
}
