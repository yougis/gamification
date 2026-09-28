// Outils MCP du Studio (spike) : meme schema des deux cotes, rien ne sort sans validation.
import { validateGame } from "./validate";
import { Collecteur, messagesBloquants, type Diagnostic } from "./diagnostics";
import { sha256Hex, compterTuiles, detecterTuilesHorsBbox, type ManifestFile } from "./pack";
import type { Game, GameNode, ReviewStatus, StudioMeta, HoldMode, HoldExit, NavigationModel, Discovery, Effect, GameObject, ExperienceStyle, Branding, GameMode, Difficulty, NodePosition, ScreenDefinition, ZoneContent, ZoneId, Widget, WidgetStyles, MinigameDefaults, TileStrategy, TilePackMeta } from "./types";

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

// Corrections proposées du validateur (change studio-validation-actionnable) :
// opérations pures nommées, annulables via l'historique (editGame), jamais
// silencieuses (l'entrée d'historique nomme l'opération).
export function migrerPreset(game: Game): Game {
  const g = { ...(game.global ?? {}) } as Record<string, unknown>;
  const preset = g.preset;
  const exp = (g.experienceStyle ?? {}) as Record<string, unknown>;
  delete g.preset;
  return {
    ...game,
    global: {
      ...g,
      ...(typeof preset === "string" && exp.preset == null ? { experienceStyle: { ...exp, preset } } : {}),
    },
  };
}

export function retirerOperator(game: Game, nodeId: string): Game {
  return {
    ...game,
    nodes: game.nodes.map((n) =>
      n.id === nodeId ? { ...n, activation: { ...n.activation, operator: undefined } } : n,
    ),
  };
}

export function setOperator(game: Game, nodeId: string, operator: "AND" | "OR"): Game {
  return {
    ...game,
    nodes: game.nodes.map((n) =>
      n.id === nodeId ? { ...n, activation: { ...n.activation, operator } } : n,
    ),
  };
}

export function setMaxReentries(game: Game, nodeId: string, n: number): Game {
  return {
    ...game,
    nodes: game.nodes.map((x) => (x.id === nodeId ? { ...x, maxReentries: n } : x)),
  };
}

export function clampDrawCount(game: Game, nodeId: string): Game {
  return {
    ...game,
    nodes: game.nodes.map((n) => {
      if (n.id !== nodeId || !n.randomPool) return n;
      return { ...n, randomPool: { ...n.randomPool, drawCount: n.randomPool.candidates.length } };
    }),
  };
}

export function retirerDoublonPool(game: Game, nodeId: string): Game {
  const premiers = new Map<string, string>();
  for (const n of game.nodes) {
    if (!n.randomPool) continue;
    for (const c of n.randomPool.candidates) {
      if (!premiers.has(c)) premiers.set(c, n.id);
    }
  }
  return {
    ...game,
    nodes: game.nodes.map((n) => {
      if (n.id !== nodeId || !n.randomPool) return n;
      const gardes = n.randomPool.candidates.filter((c) => premiers.get(c) === n.id);
      return { ...n, randomPool: { ...n.randomPool, candidates: gardes } };
    }),
  };
}

export function fixEnumDefaut(game: Game, kind: "gameMode" | "difficulty" | "experienceStyle.preset"): Game {
  if (kind === "gameMode") return { ...game, gameMode: "NORMAL" as Game["gameMode"] };
  if (kind === "difficulty") return { ...game, difficulty: "FAMILLE" as Game["difficulty"] };
  const exp = ((game.global ?? {}) as Record<string, unknown>).experienceStyle as Record<string, unknown> | undefined;
  return {
    ...game,
    global: { ...(game.global ?? {}), experienceStyle: { ...(exp ?? {}), preset: "BASIC" } },
  };
}

// Le correctif est-il applicable (change studio-validation-actionnable) ?
// Évite les boutons qui ne changeraient rien (ex. supprimer l'unique
// condition) : l'UI masque « Corriger » quand c'est faux (reste « Voir »).
export function correctifApplicable(game: Game, correctifId: string, noeud?: string): boolean {
  const n = game.nodes.find((x) => x.id === noeud);
  const byId = new Set(game.nodes.map((x) => x.id));
  const items = new Set((game.objects ?? []).map((o) => o.id));
  switch (correctifId) {
    case "migrer-preset":
      return ((game.global ?? {}) as Record<string, unknown>).preset !== undefined;
    case "retirer-operator":
      return !!n && (n.activation.requires.length <= 1) && n.activation.operator != null;
    case "fix-operator":
      return !!n && n.activation.requires.length >= 2 && n.activation.operator == null;
    case "fix-maxreentries":
      return !!n && n.onReentry === "replay" && n.maxReentries == null;
    case "fix-drawcount":
      return !!n?.randomPool && n.randomPool.drawCount > n.randomPool.candidates.length;
    case "fix-double-pool": {
      if (!n?.randomPool) return false;
      const vus = new Set<string>();
      const doublonLocal = n.randomPool.candidates.some((c) => vus.size === vus.add(c).size);
      const ailleurs = n.randomPool.candidates.some((c) =>
        game.nodes.some((m) => m.id !== n.id && m.randomPool?.candidates.includes(c)),
      );
      return doublonLocal || ailleurs;
    }
    case "fix-enum-defaut":
      return true;
    case "supprimer-reference": {
      if (!n) return false;
      if (n.activation.requires.length > 1) return true;
      if ((n.inventoryRef ?? []).some((r) => !items.has(r))) return true;
      const hints = (n.module.data as { inventoryHints?: { itemId?: unknown }[] } | undefined)?.inventoryHints;
      if (Array.isArray(hints) && hints.some((h) => typeof h?.itemId === "string" && h.itemId && !items.has(h.itemId))) return true;
      if (n.discovery?.mode === "ON_ITEM" && n.discovery.itemId && !items.has(n.discovery.itemId)) return true;
      if (n.discovery?.sourceNode && !byId.has(n.discovery.sourceNode)) return true;
      if (n.randomPool && n.randomPool.candidates.some((c) => !byId.has(c))) return true;
      return false;
    }
    default:
      return false;
  }
}

// Supprime les références orphelines d'un nœud : conditions d'activation
// (en gardant au moins une condition et un operator cohérent), candidats de
// tirage inconnus, champs discovery orphelins (réinitialisés), inventoryRef
// et inventoryHints orphelins. Ne touche jamais aux autres nœuds.
export function nettoyerReferencesOrphelines(game: Game, nodeId: string): Game {
  const byId = new Set(game.nodes.map((n) => n.id));
  const items = new Set((game.objects ?? []).map((o) => o.id));
  const clues = new Set<string>();
  for (const m of game.nodes) {
    if (m.discovery?.mode === "ON_CLUE" && m.discovery.clueId) clues.add(m.discovery.clueId);
    for (const c of m.activation.requires) {
      if (c.type === "CLUE_RESOLVED" && c.clueId) clues.add(c.clueId);
    }
  }
  return {
    ...game,
    nodes: game.nodes.map((n) => {
      if (n.id !== nodeId) return n;
      let requires = n.activation.requires.filter((c) => {
        if (c.type === "NODE_COMPLETED") return !!(c.nodeId && byId.has(c.nodeId));
        if (c.type === "POOL_DRAWN") return !!(c.poolNodeId && game.nodes.some((m) => m.id === c.poolNodeId && m.randomPool));
        if (c.type === "TIMER" && c.anchor === "NODE_COMPLETION") return !!(c.anchorNodeId && byId.has(c.anchorNodeId));
        if ((c.type === "ITEM_REQUIRED" || c.type === "ITEM_USED") && c.itemId) return items.has(c.itemId);
        if (c.type === "CLUE_RESOLVED") return true;
        return true;
      });
      if (requires.length === 0) requires = n.activation.requires;
      const operator = requires.length > 1 ? n.activation.operator : undefined;
      const discovery = n.discovery && (
        (n.discovery.mode === "ON_ITEM" && n.discovery.itemId && !items.has(n.discovery.itemId)) ||
        (n.discovery.mode === "ON_CLUE" && n.discovery.clueId && !clues.has(n.discovery.clueId)) ||
        (n.discovery.mode === "ON_COMPLETED" && n.discovery.sourceNode && !byId.has(n.discovery.sourceNode)) ||
        (n.discovery.mode === "ON_PUZZLE" && n.discovery.sourceNode && !byId.has(n.discovery.sourceNode)) ||
        (n.discovery.mode === "ON_PROXIMITY" && n.discovery.sourceNode && !byId.has(n.discovery.sourceNode))
      ) ? undefined : n.discovery;
      const inventoryRef = n.inventoryRef?.filter((r) => items.has(r));
      const hints = (n.module.data as { inventoryHints?: { itemId?: unknown }[] } | undefined)?.inventoryHints;
      const module =
        Array.isArray(hints)
          ? { ...n.module, data: { ...(n.module.data as object), inventoryHints: hints.filter((h) => typeof h?.itemId !== "string" || !h.itemId || items.has(h.itemId)) } }
          : n.module;
      const randomPool = n.randomPool
        ? { ...n.randomPool, candidates: n.randomPool.candidates.filter((c) => byId.has(c)) }
        : undefined;
      return { ...n, activation: { ...n.activation, requires, operator }, discovery, inventoryRef, module, randomPool };
    }),
  };
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
    // Cas HOME-seul (change player-home-solo) : le vide est valide sous
    // HOME, on le conserve tel quel (ni nœud imposé, ni écran imposé).
    if (((game.global ?? {}) as { presentation?: string[] }).presentation?.includes("HOME")) {
      return game;
    }
    return {
      ...game,
      nodes: [
        {
          id: "start",
          module: { type: "INFO", data: { schemaVersion: "1.0.0", steps: [{ text: "Bienvenue. Modifiez ce texte pour raconter le début de votre jeu." }] } },
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
  /** Constats structurés des refus (change studio-validation-actionnable). */
  diagnostics: Diagnostic[];
}

/**
 * Règle centrale "export possible" (spec studio-onepage-spec, décision 1.1) :
 * C1 ∧ C2 (validation complète objets/indices incluse) ∧ aucun brouillon hors
 * mode animateur. Consommée par la barre globale, Relire et Exporter.
 */
export function canExport(game: Game, meta: StudioMeta, animatorMode: boolean): { ok: boolean; raisons: string[] } {
  const v = validateGameFull(game);
  // Seules les erreurs bloquent (change studio-validation-actionnable) :
  // avertissements/info n'empêchent jamais l'export (confirmation à part).
  const raisons = messagesBloquants(v.diagnostics);
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
  return { ok: true, errors: [], gameJson, manifest: { files: withGame }, diagnostics: [] };
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
  // Refus si c'est le seul isEnding — sauf cas HOME-seul (change
  // player-home-solo) : sous HOME, vider le jeu est autorisé (le vide
  // n'est valide que sous HOME, le validateur arbitrant à l'export).
  const homeVide =
    (game.global?.presentation ?? []).includes("HOME") && game.nodes.length <= 1;
  if (target.isEnding) {
    const endings = game.nodes.filter((n) => n.isEnding);
    if (endings.length <= 1 && !homeVide) {
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

// --- Screen MCP operations (change studio-screen-wysiwyg) ---
// Toute ecriture materialise node.screen a la demande : editer = le noeud
// possede son ecran, resolveScreen() fusionne toujours le global pour le reste.

export function setNodeScreen(game: Game, nodeId: string, screen: ScreenDefinition): Game {
  return { ...game, nodes: game.nodes.map((n) => (n.id === nodeId ? { ...n, screen } : n)) };
}

export function setScreenBackground(game: Game, nodeId: string, background: ScreenDefinition["background"]): Game {
  return {
    ...game,
    nodes: game.nodes.map((n) => (n.id === nodeId ? { ...n, screen: { ...(n.screen ?? {}), background } } : n)),
  };
}

export function patchScreenZone(game: Game, nodeId: string, zoneId: ZoneId, patch: Partial<ZoneContent>): Game {
  return {
    ...game,
    nodes: game.nodes.map((n) => {
      if (n.id !== nodeId) return n;
      const zones = { ...(n.screen?.zones ?? {}), [zoneId]: { ...(n.screen?.zones?.[zoneId] ?? {}), ...patch } };
      return { ...n, screen: { ...(n.screen ?? {}), zones } };
    }),
  };
}

// Suppression d'une zone (change studio-apercu-arbre-paysage) : `content` est
// la base insuppressible (le fantome n'existe pas pour elle), les autres
// zones retombent sur leur fantome de creation. Retourne le jeu inchange si
// la zone est absente ou si c'est `content`.
export function removeScreenZone(game: Game, nodeId: string, zoneId: ZoneId): Game {
  if (zoneId === "content") return game;
  return {
    ...game,
    nodes: game.nodes.map((n) => {
      if (n.id !== nodeId || !n.screen?.zones?.[zoneId]) return n;
      const zones = { ...(n.screen.zones ?? {}) };
      delete zones[zoneId];
      return { ...n, screen: { ...(n.screen ?? {}), zones } };
    }),
  };
}

function withScreenWidgets(game: Game, nodeId: string, zoneId: ZoneId, fn: (widgets: Widget[]) => Widget[]): Game {
  return {
    ...game,
    nodes: game.nodes.map((n) => {
      if (n.id !== nodeId) return n;
      const zone = n.screen?.zones?.[zoneId] ?? {};
      const zones = { ...(n.screen?.zones ?? {}), [zoneId]: { ...zone, widgets: fn(zone.widgets ?? []) } };
      return { ...n, screen: { ...(n.screen ?? {}), zones } };
    }),
  };
}

export function addScreenWidget(game: Game, nodeId: string, zoneId: ZoneId, widget: Widget): Game {
  return withScreenWidgets(game, nodeId, zoneId, (ws) => [...ws, widget]);
}

export function setScreenWidget(game: Game, nodeId: string, zoneId: ZoneId, index: number, widget: Widget): Game {
  return withScreenWidgets(game, nodeId, zoneId, (ws) => ws.map((w, i) => (i === index ? widget : w)));
}

export function removeScreenWidget(game: Game, nodeId: string, zoneId: ZoneId, index: number): Game {
  return withScreenWidgets(game, nodeId, zoneId, (ws) => ws.filter((_, i) => i !== index));
}

export function moveScreenWidget(game: Game, nodeId: string, zoneId: ZoneId, index: number, dir: -1 | 1): Game {
  return withScreenWidgets(game, nodeId, zoneId, (ws) => {
    const j = index + dir;
    if (index < 0 || index >= ws.length || j < 0 || j >= ws.length) return ws;
    const next = [...ws];
    [next[index], next[j]] = [next[j], next[index]];
    return next;
  });
}

// Deplacement inter-zones en une seule operation (change studio-screen-editor,
// design D2) : un seul pas d'undo, contrairement a remove + add separes.
// `toIndex` = position d'insertion (defaut : fin de la zone cible).
export function moveScreenWidgetAcross(  game: Game,
  nodeId: string,
  fromZone: ZoneId,
  fromIndex: number,
  toZone: ZoneId,
  toIndex?: number | "end",
): Game {
  return {
    ...game,
    nodes: game.nodes.map((n) => {
      if (n.id !== nodeId) return n;
      const from = [...(n.screen?.zones?.[fromZone]?.widgets ?? [])];
      if (fromIndex < 0 || fromIndex >= from.length) return n;
      const [deplace] = from.splice(fromIndex, 1);
      if (fromZone === toZone) {
        const at = toIndex === "end" || toIndex === undefined ? from.length : toIndex;
        from.splice(Math.max(0, Math.min(at, from.length)), 0, deplace);
        const zones = { ...(n.screen?.zones ?? {}), [fromZone]: { ...(n.screen?.zones?.[fromZone] ?? {}), widgets: from } };
        return { ...n, screen: { ...(n.screen ?? {}), zones } };
      }
      const to = [...(n.screen?.zones?.[toZone]?.widgets ?? [])];
      const at = toIndex === "end" || toIndex === undefined ? to.length : toIndex;
      to.splice(Math.max(0, Math.min(at, to.length)), 0, deplace);
      const zones = {
        ...(n.screen?.zones ?? {}),
        [fromZone]: { ...(n.screen?.zones?.[fromZone] ?? {}), widgets: from },
        [toZone]: { ...(n.screen?.zones?.[toZone] ?? {}), widgets: to },
      };
      return { ...n, screen: { ...(n.screen ?? {}), zones } };
    }),
  };
}

// --- Écran global (change studio-home-wysiwyg) ---
// Variantes des ops d'écran ci-dessus appliquées à `global.screen` au lieu
// d'un nœud. Les ops nœud restent inchangées ; la sémantique est calquée
// (mêmes cas limites : `content` insuppressible, index bornés, patches
// fusionnés). Chaque op = un pas d'undo via `editGame`.
type GlobalScreen = ScreenDefinition;

function lireEcranGlobal(game: Game): GlobalScreen {
  return ((game.global ?? {}) as { screen?: ScreenDefinition }).screen ?? {};
}

export function setGlobalScreen(game: Game, screen: ScreenDefinition): Game {
  return { ...game, global: { ...(game.global ?? {}), screen } };
}

export function setGlobalBackground(game: Game, background: ScreenDefinition["background"]): Game {
  return setGlobalScreen(game, { ...lireEcranGlobal(game), background });
}

export function patchGlobalZone(game: Game, zoneId: ZoneId, patch: Partial<ZoneContent>): Game {
  const s = lireEcranGlobal(game);
  const zones = { ...(s.zones ?? {}), [zoneId]: { ...(s.zones?.[zoneId] ?? {}), ...patch } };
  return setGlobalScreen(game, { ...s, zones });
}

export function removeGlobalZone(game: Game, zoneId: ZoneId): Game {
  if (zoneId === "content") return game;
  const s = lireEcranGlobal(game);
  if (!s.zones?.[zoneId]) return game;
  const zones = { ...(s.zones ?? {}) };
  delete zones[zoneId];
  return setGlobalScreen(game, { ...s, zones });
}

function mapGlobalWidgets(game: Game, zoneId: ZoneId, fn: (widgets: Widget[]) => Widget[]): Game {
  const s = lireEcranGlobal(game);
  const zone = s.zones?.[zoneId] ?? {};
  const zones = { ...(s.zones ?? {}), [zoneId]: { ...zone, widgets: fn(zone.widgets ?? []) } };
  return setGlobalScreen(game, { ...s, zones });
}

export function addGlobalWidget(game: Game, zoneId: ZoneId, widget: Widget): Game {
  return mapGlobalWidgets(game, zoneId, (ws) => [...ws, widget]);
}

export function setGlobalWidget(game: Game, zoneId: ZoneId, index: number, widget: Widget): Game {
  return mapGlobalWidgets(game, zoneId, (ws) => ws.map((w, i) => (i === index ? widget : w)));
}

export function removeGlobalWidget(game: Game, zoneId: ZoneId, index: number): Game {
  return mapGlobalWidgets(game, zoneId, (ws) => ws.filter((_, i) => i !== index));
}

export function moveGlobalWidget(game: Game, zoneId: ZoneId, index: number, dir: -1 | 1): Game {
  return mapGlobalWidgets(game, zoneId, (ws) => {
    const j = index + dir;
    if (index < 0 || index >= ws.length || j < 0 || j >= ws.length) return ws;
    const next = [...ws];
    [next[index], next[j]] = [next[j], next[index]];
    return next;
  });
}

export function moveGlobalWidgetAcross(
  game: Game,
  fromZone: ZoneId,
  fromIndex: number,
  toZone: ZoneId,
  toIndex?: number | "end",
): Game {
  const s = lireEcranGlobal(game);
  const from = [...(s.zones?.[fromZone]?.widgets ?? [])];
  if (fromIndex < 0 || fromIndex >= from.length) return game;
  const [deplace] = from.splice(fromIndex, 1);
  let zones: NonNullable<ScreenDefinition["zones"]>;
  if (fromZone === toZone) {
    const at = toIndex === "end" || toIndex === undefined ? from.length : toIndex;
    from.splice(Math.max(0, Math.min(at, from.length)), 0, deplace);
    zones = { ...(s.zones ?? {}), [fromZone]: { ...(s.zones?.[fromZone] ?? {}), widgets: from } };
  } else {
    const to = [...(s.zones?.[toZone]?.widgets ?? [])];
    const at = toIndex === "end" || toIndex === undefined ? to.length : toIndex;
    to.splice(Math.max(0, Math.min(at, to.length)), 0, deplace);
    zones = {
      ...(s.zones ?? {}),
      [fromZone]: { ...(s.zones?.[fromZone] ?? {}), widgets: from },
      [toZone]: { ...(s.zones?.[toZone] ?? {}), widgets: to },
    };
  }
  return setGlobalScreen(game, { ...s, zones });
}

// Surcharge des styles de l'ecran courant (fusion, change studio-screen-editor).
export function setScreenStyles(game: Game, nodeId: string, styles: WidgetStyles): Game {
  return {
    ...game,
    nodes: game.nodes.map((n) =>
      n.id !== nodeId ? n : { ...n, screen: { ...(n.screen ?? {}), styles: { ...(n.screen?.styles ?? {}), ...styles } } },
    ),
  };
}

// Styles globaux du jeu (fusion, change studio-screen-editor).
export function setGlobalScreenStyles(game: Game, styles: WidgetStyles): Game {
  const global = { ...(game.global ?? {}), screen: { ...((game.global as { screen?: ScreenDefinition } | undefined)?.screen ?? {}), styles: { ...(((game.global as { screen?: ScreenDefinition } | undefined)?.screen?.styles) ?? {}), ...styles } } };
  return { ...game, global };
}

// Defauts globaux des mini-jeux (fusion, change studio-screen-editor).
export function setMinigameDefaults(game: Game, patch: MinigameDefaults): Game {
  const global = { ...(game.global ?? {}), minigameDefaults: { ...((game.global as { minigameDefaults?: MinigameDefaults } | undefined)?.minigameDefaults ?? {}), ...patch } };
  return { ...game, global };
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

// Duplication d'objet (change studio-inventory-menu) : clone avec nouvel id
// `id-copie` (suffixe incrémenté si pris), inséré après la source.
export function duplicateObject(game: Game, id: string): Game {
  const objs = game.objects ?? [];
  const at = objs.findIndex((o) => o.id === id);
  if (at < 0) throw new Error(`Objet inexistant : ${id}`);
  let newId = `${id}-copie`;
  let counter = 2;
  while (objs.some((o) => o.id === newId)) {
    newId = `${id}-copie-${counter}`;
    counter++;
  }
  const clone: GameObject = { ...JSON.parse(JSON.stringify(objs[at])), id: newId };
  return { ...game, objects: [...objs.slice(0, at + 1), clone, ...objs.slice(at + 1)] };
}

// --- Updated validateGame wrapper (tache 5.5) ---
export interface ValidationResult {
  ok: boolean;
  layers: { layer: number; errors: string[]; diagnostics: Diagnostic[] }[];
  extraErrors?: string[];
  diagnostics: Diagnostic[];
}

export function validateGameFull(game: Game): ValidationResult {
  const v = validateGame(game);
  const sig = new Collecteur(2);
  const extraErrors = sig.errors;

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
      sig.signaler("DISCOVERY_ITEM_ORPHELIN", `Objet discovery ${n.discovery.itemId} inexistant dans le noeud ${n.id}`, { noeud: n.id, champ: "discovery.itemId" });
    }
    if (n.discovery?.mode === "ON_CLUE" && n.discovery.clueId && !clueIds.has(n.discovery.clueId)) {
      sig.signaler("DISCOVERY_CLUE_ORPHELIN", `Indice discovery ${n.discovery.clueId} inexistant dans le noeud ${n.id}`, { noeud: n.id, champ: "discovery.clueId" });
    }
    for (const c of n.activation.requires) {
      if (c.type === "ITEM_REQUIRED" && c.itemId && !itemIds.has(c.itemId)) {
        sig.signaler("ITEM_REQUIRED_ORPHELIN", `Item ITEM_REQUIRED ${c.itemId} inexistant dans le noeud ${n.id}`, { noeud: n.id, champ: "itemId" });
      }
      if (c.type === "CLUE_RESOLVED" && c.clueId && !clueIds.has(c.clueId)) {
        sig.signaler("CLUE_ORPHELINE", `Clue CLUE_RESOLVED ${c.clueId} inexistante dans le noeud ${n.id}`, { noeud: n.id, champ: "clueId" });
      }
    }
    if (n.inventoryRef) {
      for (const ref of n.inventoryRef) {
        if (!itemIds.has(ref)) sig.signaler("INVENTORYREF_ORPHELIN", `inventoryRef ${ref} inexistant dans le noeud ${n.id}`, { noeud: n.id, champ: "inventoryRef" });
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
        if (!used) sig.signaler("CONSUMABLE_INUTILISE", `Objet ${o.id} est consumable mais jamais utilise par ITEM_USED`, { noeud: o.id, champ: "consumable" });
      }
    }
  }

  const diagnostics = [...v.layers.flatMap((l) => l.diagnostics), ...sig.diagnostics];
  return {
    ok: v.ok && extraErrors.length === 0,
    layers: v.layers,
    extraErrors: extraErrors.length > 0 ? extraErrors : undefined,
    diagnostics,
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
  const errors = messagesBloquants(result.diagnostics);
  const sig = new Collecteur(2);
  const pushRefus = (code: string, message: string, extra?: { noeud?: string; champ?: string }) =>
    sig.signaler(code, message, extra);
  if (!animatorMode) {
    for (const n of game.nodes) {
      if ((meta.status[n.id]?.state ?? "draft") === "draft") {
        const message = `export refuse : noeud ${n.id} en draft (hors mode animateur)`;
        errors.push(message);
        pushRefus("DRAFT_BLOQUE", message, { noeud: n.id });
      }
    }
  }
  // Médias INFO 100 % pack (change module-info-story) : ni URL réseau ni
  // chemin absent du manifest — refus nommé. Scopé INFO : le comportement
  // des autres médias existants est inchangé.
  for (const n of game.nodes) {
    if (n.module.type !== "INFO") continue;
    const steps = (n.module.data as { steps?: unknown }).steps;
    if (!Array.isArray(steps)) continue;
    for (const s of steps) {
      if (typeof s !== "object" || s === null) continue;
      for (const champ of ["image", "video", "audio"] as const) {
        const v = (s as Record<string, unknown>)[champ];
        if (typeof v !== "string" || v === "") continue;
        if (/^https?:\/\//i.test(v)) {
          const message = `export refuse : média INFO hors-pack (URL réseau) ${n.id} : ${v}`;
          errors.push(message);
          pushRefus("MEDIA_HORS_PACK", message, { noeud: n.id, champ: v });
        } else if (!manifest.some((m) => m.path === v)) {
          const message = `export refuse : média INFO absent du manifest ${n.id} : ${v}`;
          errors.push(message);
          pushRefus("MEDIA_ABSENT_MANIFEST", message, { noeud: n.id, champ: v });
        }
      }
    }
  }
  const diagnostics = [...result.diagnostics, ...sig.diagnostics];
  // Tuiles hors zone (change smart-tile-caching) : avertissement non
  // bloquant — le pack reste exportable après confirmation explicite.
  try {
    const bboxExport = computeBboxFromStrategy(game);
    if (bboxExport) {
      const hors = detecterTuilesHorsBbox(bboxExport, manifest.map((m) => m.path));
      if (hors.length > 0) {
        const avant = sig.diagnostics.length;
        sig.signaler(
          "TUILES_HORS_BBOX",
          `C2 ${hors.length} tuile(s) hors de la zone du jeu : ${hors.slice(0, 5).join(", ")}${hors.length > 5 ? "…" : ""}`,
          { champ: "manifest", attendu: "tuiles dans la bbox calculée" },
        );
        diagnostics.push(...sig.diagnostics.slice(avant));
      }
    }
  } catch {
    /* estimation indicative : jamais bloquante */
  }
  if (errors.length) return { ok: false, errors, diagnostics };
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

// --- Tuiles offline (change smart-tile-caching) ---
// Toute valeur lue depuis le JSON du jeu, jamais en dur. La stratégie vit
// dans `global` (même niveau que le schéma Draft-07 existant) ; `fixed`
// relit `global.map.bbox`, `none` ne télécharge rien.

export type Bbox = { minLat: number; minLng: number; maxLat: number; maxLng: number };

/** Bbox couvrant tous les POI GEOFENCE avec un buffer en mètres. */
export function computeBboxFromPoi(game: Game, radiusMeters: number): Bbox | null {
  const rayon = radiusMeters > 0 ? radiusMeters : 0;
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
    minLat: minLat - metersToLatDeg(rayon),
    minLng: minLng - metersToLngDeg(rayon, centerLat),
    maxLat: maxLat + metersToLatDeg(rayon),
    maxLng: maxLng + metersToLngDeg(rayon, centerLat),
  };
}

/** Bbox selon la stratégie du jeu (`global.tileStrategy`, défaut `fixed`). */
export function computeBboxFromStrategy(game: Game): Bbox | null {
  const g = game.global ?? {};
  const strategy = (g.tileStrategy ?? "fixed") as TileStrategy;
  if (strategy === "none") return null;
  if (strategy === "radius") {
    const rayon = typeof g.tileRadiusMeters === "number" ? g.tileRadiusMeters : 200;
    return computeBboxFromPoi(game, rayon);
  }
  if (strategy === "viewport") return computeBbox(game);
  const bbox = (g.map as { bbox?: Bbox } | undefined)?.bbox;
  if (bbox && [bbox.minLat, bbox.minLng, bbox.maxLat, bbox.maxLng].every((v) => typeof v === "number")) {
    return { ...bbox };
  }
  return computeBbox(game);
}

/** Pose la stratégie tuiles (+ rayon si `radius`) via un pas d'undo. */
export function setTileStrategy(game: Game, strategy: TileStrategy, radius?: number): Game {
  const global = { ...(game.global ?? {}), tileStrategy: strategy };
  if (strategy === "radius" && typeof radius === "number") {
    (global as Record<string, unknown>).tileRadiusMeters = radius;
  }
  if (strategy !== "radius" && radius === undefined) {
    // Conserve le rayon existant : il resservira si l'auteur revient en radius.
  }
  return { ...game, global };
}

/** Bbox optimale + stratégie + estimation tuiles (menu Packs de carte). */
export function computeOptimalBbox(game: Game): { bbox: Bbox | null; strategy: TileStrategy; tileCount: number } {
  const g = game.global ?? {};
  const strategy = (g.tileStrategy ?? "fixed") as TileStrategy;
  const bbox = computeBboxFromStrategy(game);
  const map = (g.map as { minZoom?: number; maxZoom?: number } | undefined) ?? {};
  const tileCount = bbox ? compterTuiles(bbox, map.minZoom ?? 10, map.maxZoom ?? 16) : 0;
  return { bbox, strategy, tileCount };
}

/**
 * Désigne l'unique pack de tuiles actif du projet (`global.tilePackId`,
 * `null` = aucun). L'export embarque les tuiles du pack actif ; sans actif,
 * la carte replie sur fond uni. Un pas d'undo via `editGame`.
 */
export function setActiveTilePack(game: Game, packId: string | null): Game {
  const global = { ...(game.global ?? {}) } as Record<string, unknown>;
  if (packId === null) delete global.tilePackId;
  else global.tilePackId = packId;
  return { ...game, global };
}

/** Pack actif résolu depuis un cache (jamais d'exception : id inconnu = absent). */
export function packActif(packs: TilePackMeta[], game: Game): TilePackMeta | null {
  const id = game.global?.tilePackId;
  if (typeof id !== "string" || !id) return null;
  return packs.find((p) => p.id === id) ?? null;
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
