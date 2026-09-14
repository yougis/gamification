// Outils MCP du Studio (spike) : meme schema des deux cotes, rien ne sort sans validation.
import { validateGame } from "./validate";
import { sha256Hex, type ManifestFile } from "./pack";
import type { Game, GameNode, ReviewStatus, StudioMeta, HoldMode, HoldExit } from "./types";

export type { ManifestFile };
const sha256hex = sha256Hex;

export function setHoldMode(game: Game, mode: HoldMode): Game {
  const global = { ...(game.global ?? {}), holdMode: mode };
  return { ...game, global };
}

export function setHoldExit(game: Game, exitConfig: HoldExit): Game {
  const global = { ...(game.global ?? {}), holdExit: exitConfig };
  return { ...game, global };
}

export function getHoldConfig(game: Game): { holdMode: HoldMode; holdExit?: HoldExit } {
  const g = game.global as Record<string, unknown> | undefined;
  return {
    holdMode: (g?.holdMode as HoldMode) ?? "none",
    holdExit: g?.holdExit as HoldExit | undefined,
  };
}

export function composeNodes(game: Game, nodes: GameNode[]): Game {
  return { ...game, nodes: [...game.nodes, ...nodes] };
}

export function setActivation(game: Game, nodeId: string, activation: GameNode["activation"]): Game {
  return { ...game, nodes: game.nodes.map((n) => (n.id === nodeId ? { ...n, activation } : n)) };
}

export function registerAsset(
  manifest: ManifestFile[],
  file: ManifestFile,
): ManifestFile[] {
  if (!/^[0-9a-f]{64}$/.test(file.sha256)) throw new Error(`SHA-256 invalide pour ${file.path}`);
  return [...manifest.filter((m) => m.path !== file.path), file];
}

export interface ExportResult {
  ok: boolean;
  errors: string[];
  gameJson?: string;
  manifest?: { files: ManifestFile[] };
}

export async function exportPack(
  game: Game,
  meta: StudioMeta,
  manifest: ManifestFile[],
  animatorMode: boolean,
): Promise<ExportResult> {
  const v = validateGame(game);
  const errors = v.layers.flatMap((l) => l.errors);
  if (!animatorMode) {
    for (const n of game.nodes) {
      if ((meta.status[n.id]?.state ?? "draft") === "draft") {
        errors.push(`export refuse : noeud ${n.id} en draft (hors mode animateur)`);
      }
    }
  }
  if (errors.length) return { ok: false, errors };
  const gameJson = JSON.stringify(game, null, 2);
  const files = await Promise.all(
    manifest.map(async (m) =>
      m.path === "game.json" ? { ...m, size: gameJson.length, sha256: await sha256hex(gameJson) } : m,
    ),
  );
  const withGame = files.some((m) => m.path === "game.json")
    ? files
    : [...files, { path: "game.json", version: game.schemaVersion, size: gameJson.length, sha256: await sha256hex(gameJson) }];
  return { ok: true, errors: [], gameJson, manifest: { files: withGame } };
}

export function setReview(  meta: StudioMeta,
  nodeId: string,
  state: ReviewStatus,
  reviewedBy?: string,
): StudioMeta {
  return { ...meta, status: { ...meta.status, [nodeId]: { state, reviewedBy } } };
}

// Secours code d'un noeud : QUIZ immediat + OR sur chaque aval reference.
// Rotation masterId = simple re-saisie (bouton ↻), l'ancien est revoque.
export function addSecoursCode(game: Game, nodeId: string): Game {
  const sid = `secours-${nodeId}`;
  if (game.nodes.some((m) => m.id === sid)) throw new Error("secours existe déjà");
  const secours: GameNode = {
    id: sid,
    module: { type: "QUIZ", data: { schemaVersion: "1.0.0", questions: [{ q: "Code secours affiché par l'animateur ?" }] } },
    activation: { requires: [{ type: "TIMER", anchor: "GAME_START", delaySeconds: 0 }] },
  };
  const nodes = [...game.nodes, secours].map((m) => {
    const uses = m.activation.requires.some((c) => c.type === "NODE_COMPLETED" && c.nodeId === nodeId);
    if (!uses) return m;
    const requires = [...m.activation.requires, { type: "NODE_COMPLETED", nodeId: sid } as GameNode["activation"]["requires"][number]];
    return { ...m, activation: { ...m.activation, requires, operator: "OR" as const } };
  });
  return { ...game, nodes };
}
