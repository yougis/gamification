// Validation couches 1 (AJV Draft-07) + 2 (applicative, sous-ensemble POC).
// C1 exhaustive. C2 : cycles, atteignabilite isEnding (+ chaque candidat),
// AND-exclusif direct, topo pools ON_GAME_START + regle boot, drawCount<=len,
// unicite candidats. Verdicts separes par couche, comme exige.
import Ajv from "ajv";
import schema from "./schema/game-schema.json";
import quiz from "./schema/quiz.json";
import differenceGame from "./schema/difference-game.json";
import puzzle from "./schema/puzzle.json";
import arMarker from "./schema/ar-marker.json";
import boussole from "./schema/boussole.json";
import type { Game, GameNode } from "./types";

export interface LayerReport {
  layer: 1 | 2;
  errors: string[];
}

const ajv = new Ajv({ allErrors: true, strict: false });
ajv.addSchema(quiz, "https://geoplay.example/schemas/modules/quiz.json");
ajv.addSchema(differenceGame, "https://geoplay.example/schemas/modules/difference-game.json");
ajv.addSchema(puzzle, "https://geoplay.example/schemas/modules/puzzle.json");
ajv.addSchema(arMarker, "https://geoplay.example/schemas/modules/ar-marker.json");
ajv.addSchema(boussole, "https://geoplay.example/schemas/modules/boussole.json");
const validateFn = ajv.compile(schema);

export function validateLayer1(game: unknown): LayerReport {
  const ok = validateFn(game) as boolean;
  const errors = ok
    ? []
    : (validateFn.errors ?? []).map((e) => `C1 ${e.instancePath || "/"} : ${e.message ?? "invalide"}`);
  return { layer: 1, errors };
}
function nodeRefs(n: GameNode): string[] {
  const out: string[] = [];
  for (const c of n.activation.requires) {
    if ((c.type === "NODE_COMPLETED" || c.type === "POOL_DRAWN") && typeof (c.nodeId ?? c.poolNodeId) === "string") {
      if (c.allowCycle !== true) out.push(String(c.nodeId ?? c.poolNodeId));
    }
    if (c.type === "TIMER" && c.anchor === "NODE_COMPLETION" && c.anchorNodeId) out.push(c.anchorNodeId);
  }
  return out;
}

// Atteignabilite partagee (validateur + surlignage d'impasses dans le Studio).
export function estActivable(
  byId: Map<string, GameNode>,
  poolOf: Map<string, GameNode>,
  n: GameNode,
  done: Set<string>,
  visiting: Set<string>,
): boolean {
  const evalReq = (c: GameNode["activation"]["requires"][number]): boolean => {
    if (c.type === "NODE_COMPLETED" && c.nodeId) {
      if (done.has(c.nodeId)) return true;
      if (visiting.has(c.nodeId)) return false;
      const d = byId.get(c.nodeId);
      if (!d) return false;
      visiting.add(c.nodeId);
      const r = estActivable(byId, poolOf, d, done, visiting);
      visiting.delete(c.nodeId);
      return r;
    }
    if (c.type === "POOL_DRAWN" && c.poolNodeId) {
      const p = poolOf.get(c.poolNodeId);
      if (!p) return false;
      if (visiting.has(p.id)) return false;
      visiting.add(p.id);
      const r = estActivable(byId, poolOf, p, done, visiting);
      visiting.delete(p.id);
      return r;
    }
    return true; // GEOFENCE/TIMER/PROXIMITY/CONDITIONAL/WINDOW : supposes vrais
  };
  const reqs = n.activation.requires;
  if (reqs.length > 1) {
    return n.activation.operator === "OR" ? reqs.some(evalReq) : reqs.every(evalReq);
  }
  return reqs.every(evalReq);
}

// Impasses : noeuds non structurels, non finaux, sans chemin vers une fin.
export function deadEnds(game: Game): string[] {
  const byId = new Map(game.nodes.map((n) => [n.id, n]));
  const poolOf = new Map(game.nodes.filter((n) => n.randomPool).map((n) => [n.id, n]));
  const endings = game.nodes.filter((n) => n.isEnding);
  if (!endings.length) return [];
  return game.nodes
    .filter((n) => !n.isEnding && !n.randomPool)
    .filter((n) => !endings.some((e) => estActivable(byId, poolOf, e, new Set([n.id]), new Set())))
    .map((n) => n.id);
}

export function validateLayer2(game: Game): LayerReport {
  const errors: string[] = [];
  const byId = new Map(game.nodes.map((n) => [n.id, n]));

  // Cycles (aretes allowCycle:true ignorees).
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  const visit = (id: string, stack: string[]): boolean => {
    color.set(id, GRAY);
    for (const dep of nodeRefs(byId.get(id)!)) {
      if (!byId.has(dep)) {
        errors.push(`C2 ${id} : reference inconnue ${dep}`);
        continue;
      }
      const c = color.get(dep) ?? WHITE;
      if (c === GRAY) {
        errors.push(`C2 cycle : ${[...stack, id, dep].join(" -> ")}`);
        return true;
      }
      if (c === WHITE && visit(dep, [...stack, id])) return true;
    }
    color.set(id, BLACK);
    return false;
  };
  for (const n of game.nodes) if ((color.get(n.id) ?? WHITE) === WHITE) visit(n.id, []);

  // Pools : candidates, drawCount, unicite, topo ON_GAME_START, regle boot.
  const poolOf = new Map<string, GameNode>();
  const inPool = new Map<string, string>();
  for (const n of game.nodes) {
    if (!n.randomPool) continue;
    poolOf.set(n.id, n);
    if (n.randomPool.drawCount > n.randomPool.candidates.length) {
      errors.push(`C2 ${n.id} : drawCount > candidates.length`);
    }
    for (const c of n.randomPool.candidates) {
      if (inPool.has(c)) errors.push(`C2 ${c} : candidat de deux pools (${inPool.get(c)}, ${n.id})`);
      else inPool.set(c, n.id);
      if (!byId.has(c)) errors.push(`C2 ${n.id} : candidat inconnu ${c}`);
    }
  }
  const boot = (id: string, seen: string[]): boolean => {
    if (seen.includes(id)) {
      errors.push(`C2 cycle inter-pools : ${[...seen, id].join(" -> ")}`);
      return false;
    }
    const n = byId.get(id);
    if (!n || n.randomPool?.drawTiming !== "ON_GAME_START") return true;
    return n.activation.requires.every((c) => {
      const dep = c.type === "POOL_DRAWN" ? c.poolNodeId : c.type === "NODE_COMPLETED" ? c.nodeId : undefined;
      return !dep || boot(dep, [...seen, id]);
    });
  };
  for (const [id, n] of poolOf) {
    if (n.randomPool?.drawTiming !== "ON_GAME_START") continue;
    for (const c of n.activation.requires) {
      if (c.type === "NODE_COMPLETED" && c.nodeId && inPool.has(c.nodeId)) {
        const owner = poolOf.get(inPool.get(c.nodeId)!);
        if (owner?.randomPool?.drawTiming === "ON_POOL_ACTIVATION") {
          errors.push(`C2 ${id} : pool ON_GAME_START depend du candidat ${c.nodeId} d'un pool ON_POOL_ACTIVATION`);
        }
      }
    }
    boot(id, []);
  }

  // Atteignabilite : env suppose favorable (GEOFENCE/TIMER/PROXIMITY vrais) ;
  // POOL et OR = alternatifs ; chaque candidat individuellement vers un isEnding.
  // Un NODE_COMPLETED est satisfait si son noeud est suppose complete ou activable.
  const activable = (n: GameNode, done: Set<string>, visiting: Set<string>): boolean =>
    estActivable(byId, poolOf, n, done, visiting);
  const endings = game.nodes.filter((n) => n.isEnding);
  if (endings.length === 0) errors.push("C2 : aucun noeud isEnding");
  else {
    if (!endings.some((e) => activable(e, new Set(), new Set()))) {
      errors.push("C2 : aucun isEnding atteignable depuis le depart");
    }
    for (const [pid, p] of poolOf) {
      for (const c of p.randomPool!.candidates) {
        const done = new Set([c]);
        if (!endings.some((e) => activable(e, done, new Set()))) {
          errors.push(`C2 : candidat ${c} du pool ${pid} sans chemin vers FIN`);
        }
      }
    }
  }

  // AND-exclusif direct.
  for (const m of game.nodes) {
    if (m.activation.operator !== "AND") continue;
    const completed = m.activation.requires.filter((c) => c.type === "NODE_COMPLETED" && c.nodeId);
    for (let i = 0; i < completed.length; i++) {
      for (let j = i + 1; j < completed.length; j++) {
        const a = inPool.get(String(completed[i].nodeId));
        const b = inPool.get(String(completed[j].nodeId));
        if (a && a === b) {
          const p = poolOf.get(a)!;
          if (p.randomPool!.drawCount === 1) {
            errors.push(`C2 ${m.id} : AND sur candidats exclusifs du pool ${a}`);
          }
        }
      }
    }
  }
  return { layer: 2, errors };
}

export function validateGame(game: unknown): { ok: boolean; layers: LayerReport[] } {
  const l1 = validateLayer1(game);
  const layers: LayerReport[] = [l1];
  if (l1.errors.length === 0) layers.push(validateLayer2(game as Game));
  return { ok: layers.every((l) => l.errors.length === 0), layers };
}
