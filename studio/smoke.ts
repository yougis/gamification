// Smoke test headless du spike : fixture verte C1+C2, 5 branches forcees vers FIN.
import { validateGame } from "./src/game/validate";
import { evaluate, type Sim } from "./src/game/evaluate";
import type { Game } from "./src/game/types";
import fixture from "./src/game/game-5poi.json";

const game = fixture as unknown as Game;
const v = validateGame(game);
console.log("C1:", v.layers[0].errors);
console.log("C2:", v.layers[1]?.errors ?? "(absente)");
if (!v.ok) throw new Error("fixture invalide");

const pool = game.nodes.find((n) => n.id === "pool")!;
for (const cand of pool.randomPool!.candidates) {
  const draws = { pool: [cand] };
  const done = new Map<string, number>();
  const count = new Map<string, number>();
  const s: Sim = {
    present: new Set(game.nodes.map((n) => n.id)),
    dwellOk: new Set(game.nodes.map((n) => n.id)),
    throughOk: new Set(game.nodes.map((n) => n.id)),
    nowMs: 3600000,
    completedAt: done,
  };
  let steps = 0;
  let progressed = true;
  while (progressed && steps < game.nodes.length * 3) {
    progressed = false;
    steps++;
    const r = evaluate(game, s, draws, done, count, new Set());
    const target = r.auto[0] ?? r.choice[0];
    if (!target) break;
    done.set(target, steps);
    count.set(target, 1);
    progressed = true;
  }
  const fin = game.nodes.some((n) => n.isEnding && done.has(n.id));
  console.log(`branche ${cand}: ${fin ? "FIN OK" : "BLOQUEE"}`);
  if (!fin) throw new Error(`branche ${cand} bloquee`);
}
console.log("SMOKE OK");
