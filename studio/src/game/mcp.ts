// Outils MCP du Studio (spike) : meme schema des deux cotes, rien ne sort sans validation.
import { validateGame } from "./validate";
import { sha256Hex, type ManifestFile } from "./pack";
import type { Game, GameNode, ReviewStatus, StudioMeta, HoldMode, HoldExit, NavigationModel, Discovery, Effect, GameObject, ExperienceStyle, Branding, GameMode, Difficulty } from "./types";

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

// --- Import de fichier JSON (change import-game-studio) ---
// Lit un fichier choisi par l'utilisateur et le parse en Game.
// La validation bi-couche (validateGame) est faite par l'appelant
// avant de charger le jeu dans l'état du Studio.
export async function importGame(file: File): Promise<Game> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Fichier illisible : ${file.name} n'est pas un JSON valide`);
  }
  if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as Game).nodes)) {
    throw new Error(`Fichier invalide : ${file.name} ne contient pas un jeu GeoPlay (nodes[] manquant)`);
  }
  return parsed as Game;
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

// --- Progression MCP operations (tache 5.1) ---
export function setDiscovery(game: Game, nodeId: string, discovery: Discovery): Game {
  return {
    ...game,
    nodes: game.nodes.map((n) => (n.id === nodeId ? { ...n, discovery } : n))
  };
}

export function setEffects(game: Game, nodeId: string, effects: Effect[]): Game {
  return {
    ...game,
    nodes: game.nodes.map((n) => (n.id === nodeId ? { ...n, effects } : n))
  };
}

export function setInventoryRef(game: Game, nodeId: string, inventoryRef: string[]): Game {
  return {
    ...game,
    nodes: game.nodes.map((n) => (n.id === nodeId ? { ...n, inventoryRef } : n))
  };
}

// --- Navigation MCP operations (tache 5.2) ---
export function setNavigationModel(game: Game, model: NavigationModel): Game {
  const global = { ...(game.global ?? {}), navigationModel: model };
  return { ...game, global };
}

export function setPresentation(game: Game, presentations: string[]): Game {
  const global = { ...(game.global ?? {}), presentation: presentations };
  return { ...game, global };
}

export function setExperienceStyle(game: Game, style: ExperienceStyle): Game {
  const global = { ...(game.global ?? {}), experienceStyle: style };
  return { ...game, global };
}

export function setBranding(game: Game, branding: Branding): Game {
  return { ...game, branding };
}

export function setGameMode(game: Game, mode: GameMode): Game {
  const global = { ...(game.global ?? {}), gameMode: mode };
  return { ...game, global };
}

export function setDifficulty(game: Game, difficulty: Difficulty): Game {
  const global = { ...(game.global ?? {}), difficulty };
  return { ...game, global };
}

// --- Objects MCP operations (tache 5.2) ---
export function addObject(game: Game, obj: GameObject): Game {
  return { ...game, objects: [...(game.objects ?? []), obj] };
}

export function setObjects(game: Game, objects: GameObject[]): Game {
  return { ...game, objects };
}

// --- Updated validateGame wrapper (tache 5.5) ---
export interface ValidationResult {
  ok: boolean;
  layers: { layer: number; errors: string[] }[];
  extraErrors?: string[];
}

export function validateGameFull(game: Game): ValidationResult {
  const v = validateGame(game);
  const extraErrors: string[] = [];

  // Check object references in discovery and activation
  const itemIds = new Set(game.objects.map((o) => o.id));
  const clueIds = new Set<string>();
  for (const n of game.nodes) {
    if (n.discovery?.mode === "ON_CLUE" && n.discovery.clueId) clueIds.add(n.discovery.clueId);
    for (const c of n.activation.requires) {
      if (c.type === "CLUE_RESOLVED" && c.clueId) clueIds.add(c.clueId);
    }
  }

  for (const n of game.nodes) {
    if (n.discovery?.mode === "ON_ITEM" && n.discovery.itemId && !itemIds.has(n.discovery.itemId)) {
      extraErrors.push(`Objet discovery ${n.discovery.itemId} inexistant dans le noeud ${n.id}`);
    }
    if (n.discovery?.mode === "ON_CLUE" && n.discovery.clueId && !clueIds.has(n.discovery.clueId)) {
      extraErrors.push(`Indice discovery ${n.discovery.clueId} inexistant dans le noeud ${n.id}`);
    }
    for (const c of n.activation.requires) {
      if (c.type === "ITEM_REQUIRED" && c.itemId && !itemIds.has(c.itemId)) {
        extraErrors.push(`Item ITEM_REQUIRED ${c.itemId} inexistant dans le noeud ${n.id}`);
      }
      if (c.type === "CLUE_RESOLVED" && c.clueId && !clueIds.has(c.clueId)) {
        extraErrors.push(`Clue CLUE_RESOLVED ${c.clueId} inexistante dans le noeud ${n.id}`);
      }
    }
    if (n.inventoryRef) {
      for (const ref of n.inventoryRef) {
        if (!itemIds.has(ref)) extraErrors.push(`inventoryRef ${ref} inexistant dans le noeud ${n.id}`);
      }
    }
  }

  // Consumable consistency
  if (game.objects) {
    for (const o of game.objects) {
      if (o.consumable) {
        const used = game.nodes.some((n) =>
          n.activation.requires.some((c) => c.type === "ITEM_USED" && c.itemId === o.id)
        );
        if (!used) extraErrors.push(`Objet ${o.id} est consumable mais jamais utilise par ITEM_USED`);
      }
    }
  }

  return {
    ok: v.ok && extraErrors.length === 0,
    layers: v.layers,
    extraErrors: extraErrors.length > 0 ? extraErrors : undefined
  };
}

// Updated exportPack wrapper (tache 5.6)
export async function exportPackFull(
  game: Game,
  meta: StudioMeta,
  manifest: ManifestFile[],
  animatorMode: boolean,
): Promise<ExportResult> {
  const result = validateGameFull(game);
  const errors = result.layers.flatMap((l) => l.errors).concat(result.extraErrors ?? []);
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
