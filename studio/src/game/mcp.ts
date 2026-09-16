// Outils MCP du Studio (spike) : meme schema des deux cotes, rien ne sort sans validation.
import { validateGame } from "./validate";
import { sha256Hex, type ManifestFile } from "./pack";
import type { Game, GameNode, ReviewStatus, StudioMeta, HoldMode, HoldExit, NavigationModel, Discovery, Effect, GameObject, ExperienceStyle, Branding, GameMode, Difficulty, NodePosition } from "./types";

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
  const game = parsed as Game;
  if (game.nodes.length === 0) {
    return {
      ...game,
      nodes: [
        {
          id: "start",
          module: { type: "INFO", data: {} },
          activation: { requires: [] },
          discovery: { mode: "VISIBLE_NOW" },
        },
      ],
    };
  }
  return game;
}

export interface ExportResult {
  ok: boolean;
  errors: string[];
  gameJson?: string;
  manifest?: { files: ManifestFile[] };
}

/**
 * Règle centrale "export possible" (spec studio-onepage-spec, décision 1.1) :
 * C1 ∧ C2 (validation complète objets/indices incluse) ∧ aucun brouillon hors
 * mode animateur. Consommée par la barre globale, Relire et Exporter.
 */
export function canExport(game: Game, meta: StudioMeta, animatorMode: boolean): { ok: boolean; raisons: string[] } {
  const v = validateGameFull(game);
  const raisons = v.layers.flatMap((l) => l.errors).concat(v.extraErrors ?? []);
  if (!animatorMode) {
    for (const n of game.nodes) {
      if ((meta.status[n.id]?.state ?? "draft") === "draft") {
        raisons.push(`export refuse : noeud ${n.id} en draft (hors mode animateur)`);
      }
    }
  }
  return { ok: raisons.length === 0, raisons };
}

/**
 * @deprecated Porte historique : validation couches 1+2 SANS les contrôles
 * objets/indices. Conservée pour compatibilité, masquée de l'UI par défaut
 * (décision 1.1 : `exportPackFull` est la voie unique visible).
 */
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

// --- Node CRUD MCP operations (change studio-node-crud) ---

/** Supprime un noeud et nettoie toutes les references qui pointaient vers lui. */
export function removeNode(game: Game, nodeId: string): Game {
  const target = game.nodes.find((n) => n.id === nodeId);
  if (!target) return game;
  // Refus si c'est le seul isEnding
  if (target.isEnding) {
    const endings = game.nodes.filter((n) => n.isEnding);
    if (endings.length <= 1) {
      throw new Error("Impossible de supprimer le seul noeud de fin du jeu");
    }
  }
  const nodeIds = new Set(game.nodes.map((n) => n.id));
  const remaining = game.nodes.filter((n) => n.id !== nodeId);
  // Nettoyage des references dans les autres noeuds
  const cleaned = remaining.map((n) => {
    // Conditions
    const requires = n.activation.requires
      .filter((c) => {
        if (c.type === "NODE_COMPLETED" && c.nodeId === nodeId) return false;
        if (c.type === "POOL_DRAWN" && c.poolNodeId === nodeId) return false;
        if (c.type === "TIMER" && c.anchorNodeId === nodeId) return false;
        return true;
      });
    // Effects
    const effects = (n.effects ?? []).filter((e) => {
      if ((e.type === "REVEAL_NODE" || e.type === "UNLOCK_NODE") && e.nodeId === nodeId) return false;
      return true;
    });
    // Discovery sourceNode
    const discovery = n.discovery?.sourceNode === nodeId
      ? { ...n.discovery, sourceNode: undefined as string | undefined }
      : n.discovery;
    return {
      ...n,
      activation: { ...n.activation, requires },
      effects: effects.length > 0 ? effects : n.effects,
      discovery,
    };
  });
  return { ...game, nodes: cleaned };
}

/** Renomme un noeud et propage le changement dans toutes les references. */
export function renameNode(game: Game, oldId: string, newId: string): Game {
  if (!newId || !newId.trim()) throw new Error("L'ID ne peut pas etre vide");
  if (oldId === newId) return game;
  if (game.nodes.some((n) => n.id === newId)) {
    throw new Error(`Cet ID est deja utilise : ${newId}`);
  }
  if (!game.nodes.some((n) => n.id === oldId)) {
    throw new Error(`Noeud inexistant : ${oldId}`);
  }
  const nodes = game.nodes.map((n) => {
    // Le noeud cible : changer son id
    if (n.id === oldId) return { ...n, id: newId };
    // Les autres noeuds : propager la reference
    const requires = n.activation.requires.map((c) => {
      if (c.type === "NODE_COMPLETED" && c.nodeId === oldId) return { ...c, nodeId: newId };
      if (c.type === "POOL_DRAWN" && c.poolNodeId === oldId) return { ...c, poolNodeId: newId };
      if (c.type === "TIMER" && c.anchorNodeId === oldId) return { ...c, anchorNodeId: newId };
      return c;
    });
    const effects = (n.effects ?? []).map((e) => {
      if ((e.type === "REVEAL_NODE" || e.type === "UNLOCK_NODE") && e.nodeId === oldId) return { ...e, nodeId: newId };
      return e;
    });
    const discovery = n.discovery?.sourceNode === oldId
      ? { ...n.discovery, sourceNode: newId }
      : n.discovery;
    const randomPool = n.randomPool
      ? { ...n.randomPool, candidates: n.randomPool.candidates.map((c) => c === oldId ? newId : c) }
      : n.randomPool;
    return {
      ...n,
      activation: { ...n.activation, requires },
      effects: effects.length > 0 ? effects : n.effects,
      discovery,
      randomPool,
    };
  });
  return { ...game, nodes };
}

/** Duplique un noeud (sans ses aretes) avec un ID genere. */
export function duplicateNode(game: Game, nodeId: string): Game {
  const source = game.nodes.find((n) => n.id === nodeId);
  if (!source) throw new Error(`Noeud inexistant : ${nodeId}`);
  // Generer un ID unique
  let newId = `${nodeId}-copy`;
  let counter = 2;
  while (game.nodes.some((n) => n.id === newId)) {
    newId = `${nodeId}-copy-${counter}`;
    counter++;
  }
  const clone: GameNode = {
    ...JSON.parse(JSON.stringify(source)),
    id: newId,
  };
  return { ...game, nodes: [...game.nodes, clone] };
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
  const itemIds = new Set((game.objects ?? []).map((o) => o.id));
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

// --- Map/Indoor MCP operations (change studio-map-view) ---

/** Extract lat/lng from a GEOFENCE condition. */
function extractLatLng(c: Game["nodes"][0]["activation"]["requires"][number]): { lat: number; lng: number } | null {
  if (c.type === "GEOFENCE" && typeof c.lat === "number" && typeof c.lng === "number") {
    return { lat: c.lat, lng: c.lng };
  }
  return null;
}

/** Haversine distance in meters between two lat/lng points. */
function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Convert meters of latitude to degrees. */
function metersToLatDeg(m: number): number {
  return m / 111_320;
}

/** Convert meters of longitude to degrees at a given latitude. */
function metersToLngDeg(m: number, atLat: number): number {
  return m / (111_320 * Math.cos((atLat * Math.PI) / 180));
}

/** Compute bounding box from all GEOFENCE positions + 200m buffer. */
export function computeBbox(game: Game): { minLat: number; minLng: number; maxLat: number; maxLng: number } | null {
  const bufferM = 200;
  const points: { lat: number; lng: number }[] = [];
  for (const node of game.nodes) {
    for (const c of node.activation.requires) {
      const ll = extractLatLng(c);
      if (ll) points.push(ll);
    }
  }
  if (points.length === 0) return null;
  let minLat = Infinity, minLng = Infinity, maxLat = -Infinity, maxLng = -Infinity;
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  const centerLat = (minLat + maxLat) / 2;
  return {
    minLat: minLat - metersToLatDeg(bufferM),
    minLng: minLng - metersToLngDeg(bufferM, centerLat),
    maxLat: maxLat + metersToLatDeg(bufferM),
    maxLng: maxLng + metersToLngDeg(bufferM, centerLat),
  };
}

/** Set node position (indoor plan coordinates). */
export function setNodePosition(game: Game, nodeId: string, position: NodePosition): Game {
  return {
    ...game,
    nodes: game.nodes.map((n) => (n.id === nodeId ? { ...n, position } : n)),
  };
}

/** Detect pairs of geofences that overlap (distance < sum of radii). */
export function detectGeofenceOverlaps(game: Game): Array<{ a: string; b: string }> {
  const geos: { id: string; lat: number; lng: number; r: number }[] = [];
  for (const node of game.nodes) {
    for (const c of node.activation.requires) {
      if (c.type === "GEOFENCE" && typeof c.lat === "number" && typeof c.lng === "number" && typeof c.radiusMeters === "number") {
        geos.push({ id: node.id, lat: c.lat, lng: c.lng, r: c.radiusMeters });
      }
    }
  }
  const overlaps: Array<{ a: string; b: string }> = [];
  for (let i = 0; i < geos.length; i++) {
    for (let j = i + 1; j < geos.length; j++) {
      const dist = haversine(geos[i], geos[j]);
      if (dist < geos[i].r + geos[j].r) {
        overlaps.push({ a: geos[i].id, b: geos[j].id });
      }
    }
  }
  return overlaps;
}
