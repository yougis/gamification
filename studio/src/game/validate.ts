// Validation couches 1 (AJV Draft-07) + 2 (applicative, sous-ensemble POC).
// C1 exhaustive. C2 : cycles, atteignabilite isEnding (+ chaque candidat),
// AND-exclusif direct, topo pools ON_GAME_START + regle boot, drawCount<=len,
// unicite candidats, cohérence holdMode/holdExit/needsLock. Verdicts separes
// par couche, comme exige.
import Ajv from "ajv";
import schema from "./schema/game-schema.json";
import quiz from "./schema/quiz.json";
import differenceGame from "./schema/difference-game.json";
import puzzle from "./schema/puzzle.json";
import arMarker from "./schema/ar-marker.json";
import boussole from "./schema/boussole.json";
import codeInput from "./schema/code-input.json";
import info from "./schema/info.json";
import inventoryHints from "./schema/inventory-hints.json";
import type { Game, GameNode, Condition, ExperienceStyle, Branding, GameMode, Difficulty } from "./types";
import { MODULE_REGISTRY } from "./modules";

type LayerReport = { layer: number; errors: string[] };

// Collect all item IDs and clue IDs from the game
function collectItems(game: Game): Set<string> {
  const items = new Set<string>();
  if (game.objects) for (const o of game.objects) items.add(o.id);
  return items;
}
function collectClues(game: Game): Set<string> {
  const clues = new Set<string>();
  for (const n of game.nodes) {
    const d = n.discovery;
    if (d?.mode === "ON_CLUE" && d.clueId) clues.add(d.clueId);
    const act = n.activation;
    for (const c of act.requires) {
      if (c.type === "CLUE_RESOLVED" && c.clueId) clues.add(c.clueId);
    }
  }
  return clues;
}
function nodeRefs(n: GameNode): string[] {
  const out: string[] = [];
  for (const c of n.activation.requires) {
    if ((c.type === "NODE_COMPLETED" || c.type === "POOL_DRAWN") && typeof (c.nodeId ?? c.poolNodeId) === "string") {
      if (c.allowCycle !== true) out.push(String(c.nodeId ?? c.poolNodeId));
    }
    if (c.type === "TIMER" && c.anchor === "NODE_COMPLETION" && c.anchorNodeId) out.push(c.anchorNodeId);
    // Note : les refs d'inventaire (ITEM_REQUIRED/ITEM_USED/CLUE_RESOLVED)
    // ne sont PAS des arêtes de graphe : leur existence est vérifiée
    // séparément, elles ne participent ni aux cycles ni à l'atteignabilité.
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

  // ExperienceStyle validation.
  const exStyle = game.experienceStyle;
  if (exStyle?.preset && !["BASIC", "GUIDED", "TREASURE_HUNT", "ESCAPE_GAME", "OPEN_EXPLORATION"].includes(exStyle.preset)) {
    errors.push(`C2 experienceStyle.preset invalide: ${exStyle.preset}`);
  }
  if (exStyle?.identity?.name && exStyle.identity.name.length === 0) {
    errors.push(`C2 experienceStyle.identity.name ne peut pas etre vide`);
  }

  // GameMode et Difficulty validation.
  if (game.gameMode && !["NORMAL", "ANIMATEUR", "SOIREE", "HARDCORE"].includes(game.gameMode)) {
    errors.push(`C2 gameMode invalide: ${game.gameMode}`);
  }
  if (game.difficulty && !["ENFANT", "FAMILLE", "EXPERT"].includes(game.difficulty)) {
    errors.push(`C2 difficulty invalide: ${game.difficulty}`);
  }

  // Branding validation.
  if (game.branding) {
    if (game.branding.primaryColor && !/^#[0-9a-fA-F]{6}$/.test(game.branding.primaryColor)) {
      errors.push(`C2 branding.primaryColor invalide: ${game.branding.primaryColor}`);
    }
    if (game.branding.secondaryColor && !/^#[0-9a-fA-F]{6}$/.test(game.branding.secondaryColor)) {
      errors.push(`C2 branding.secondaryColor invalide: ${game.branding.secondaryColor}`);
    }
  }

  // HOLD validation: coherence holdMode/holdExit/needsLock.
  const holdMode = (game.global as Record<string, unknown>)?.holdMode as string | undefined;
  const holdExit = (game.global as Record<string, unknown>)?.holdExit as Record<string, unknown> | undefined;
  if (holdMode && holdMode !== "none") {
    if (!holdExit || !holdExit.method) {
      errors.push(`C2 holdExit requis quand holdMode=${holdMode}`);
    }
    // Check modules with needsLock require holdMode != none.
    for (const n of game.nodes) {
      const needsLock = (n.module.data as Record<string, unknown>)?.needsLock === true;
      if (needsLock && holdMode === "none") {
        errors.push(`C2 Module ${n.id} (needsLock) nécessite holdMode != none`);
      }
    }
  }

  // Task 4.1: global.preset obsolète.
  const gAny = game.global as Record<string, unknown> | undefined;
  if (gAny?.preset !== undefined) {
    errors.push(`C2 global.preset est obsolète, utilisez global.experienceStyle.preset`);
  }

  // Task 4.2: Exclusion mutuelle map ↔ indoorPlans.
  const hasMap = gAny?.map && typeof gAny.map === "object" && Object.keys(gAny.map).length > 0;
  const hasIndoor = Array.isArray(gAny?.indoorPlans) && gAny.indoorPlans.length > 0;
  if (hasMap && hasIndoor) {
    errors.push(`C2 global.map et global.indoorPlans sont mutuellement exclusifs`);
  }

  // Task 4.3: planId validation — tout position.planId doit exister dans indoorPlans.
  const planIds = new Set<string>(
    Array.isArray(gAny?.indoorPlans) ? (gAny.indoorPlans as Array<{id: string}>).map((p) => p.id) : [],
  );
  for (const n of game.nodes) {
    if (n.position?.planId && !planIds.has(n.position.planId)) {
      errors.push(`C2 ${n.id} : position.planId "${n.position.planId}" inexistant dans indoorPlans`);
    }
  }

  // Task 4.5: Warning nœud indoor + GEOFENCE.
  for (const n of game.nodes) {
    if (n.position) {
      const hasGEOFENCE = n.activation.requires.some((c) => c.type === "GEOFENCE");
      if (hasGEOFENCE) {
        errors.push(`C2 ${n.id} : nœud indoor avec condition GEOFENCE (incohérent, GPS indisponible en intérieur)`);
      }
    }
  }

  // Task 4.7: Warning tileStrategy:none avec global.map présent.
  if (gAny?.tileStrategy === "none" && hasMap) {
    errors.push(`C2 global.tileStrategy "none" avec global.map configuré (pas de tuiles affichées)`);
  }

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

  // Nouvelles regles applicatives (tache 1.7).
  const items = collectItems(game);
  const clues = collectClues(game);
  const allIds = new Set([...items, ...clues]);

  for (const n of game.nodes) {
    for (const c of n.activation.requires) {
      if (c.type === "ITEM_REQUIRED" && c.itemId && !items.has(c.itemId)) {
        errors.push(`C2 ${n.id} : ITEM_REQUIRED itemId=${c.itemId} inexistant`);
      }
      if (c.type === "ITEM_USED" && c.itemId && !items.has(c.itemId)) {
        errors.push(`C2 ${n.id} : ITEM_USED itemId=${c.itemId} inexistant`);
      }
      if (c.type === "CODE_INPUT" && !c.code) {
        errors.push(`C2 ${n.id} : CODE_INPUT requiert un code`);
      }
      if (c.type === "CLUE_RESOLVED" && c.clueId && !clues.has(c.clueId)) {
        errors.push(`C2 ${n.id} : CLUE_RESOLVED clueId=${c.clueId} inexistant`);
      }
      if (c.type === "TIMER" && c.anchor === "NODE_COMPLETION" && c.anchorNodeId && !byId.has(c.anchorNodeId)) {
        errors.push(`C2 ${n.id} : TIMER anchorNodeId=${c.anchorNodeId} inexistant`);
      }
    }
    // Module CODE_INPUT : code attendu requis (symetrique de la condition).
    if (n.module.type === "CODE_INPUT") {
      const code = (n.module.data as { code?: unknown } | undefined)?.code;
      if (typeof code !== "string" || code.length === 0) {
        errors.push(`C2 ${n.id} : module CODE_INPUT requiert un code attendu (module.data.code)`);
      }
    }
    // Indices sur événements d'inventaire : tout itemId écouté doit exister.
    const hints = (n.module.data as { inventoryHints?: { itemId?: unknown }[] } | undefined)?.inventoryHints;
    if (Array.isArray(hints)) {
      for (const h of hints) {
        if (typeof h?.itemId === "string" && h.itemId && !items.has(h.itemId)) {
          errors.push(`C2 ${n.id} : inventoryHints itemId=${h.itemId} inexistant`);
        }
      }
    }
    if (n.discovery) {
      if (n.discovery.mode === "ON_ITEM" && n.discovery.itemId && !items.has(n.discovery.itemId)) {
        errors.push(`C2 ${n.id} : discovery ON_ITEM itemId=${n.discovery.itemId} inexistant`);
      }
      if (n.discovery.mode === "ON_CLUE" && n.discovery.clueId && !clues.has(n.discovery.clueId)) {
        errors.push(`C2 ${n.id} : discovery ON_CLUE clueId=${n.discovery.clueId} inexistant`);
      }
      if (n.discovery.mode === "ON_COMPLETED" && n.discovery.sourceNode && !byId.has(n.discovery.sourceNode)) {
        errors.push(`C2 ${n.id} : discovery ON_COMPLETED sourceNode=${n.discovery.sourceNode} inexistant`);
      }
      if (n.discovery.mode === "ON_PUZZLE" && n.discovery.sourceNode && !byId.has(n.discovery.sourceNode)) {
        errors.push(`C2 ${n.id} : discovery ON_PUZZLE sourceNode=${n.discovery.sourceNode} inexistant`);
      }
      if (n.discovery.mode === "ON_PROXIMITY" && n.discovery.sourceNode && !byId.has(n.discovery.sourceNode)) {
        errors.push(`C2 ${n.id} : discovery ON_PROXIMITY sourceNode=${n.discovery.sourceNode} inexistant`);
      }
    }
    if (n.inventoryRef) {
      for (const ref of n.inventoryRef) {
        if (!items.has(ref)) errors.push(`C2 ${n.id} : inventoryRef itemId=${ref} inexistant`);
      }
    }
  }

  // Recettes de combinaison (change inventory-crafting) : références
  // existantes, sortie jamais auto-produite, consume cohérent avec
  // consumable (même règle que ITEM_USED, défaut consume=true).
  const recipes = Array.isArray(game.recipes) ? game.recipes : [];
  const byObjId = new Map((game.objects ?? []).map((o) => [o.id, o]));
  for (const r of recipes) {
    const rid = typeof r?.id === "string" && r.id ? r.id : "?";
    const inputs = Array.isArray(r?.inputs) ? r.inputs : [];
    for (const inp of inputs) {
      const iid = typeof inp?.itemId === "string" ? inp.itemId : "";
      if (!iid || !items.has(iid)) {
        errors.push(`C2 recette ${rid} : entrée itemId=${iid || "?"} inexistante`);
        continue;
      }
      const consume = inp?.consume ?? true;
      if (consume && byObjId.get(iid)?.consumable !== true) {
        errors.push(`C2 recette ${rid} : entrée ${iid} consommée mais objet non consumable`);
      }
    }
    if (typeof r?.output === "string" && r.output) {
      if (!items.has(r.output)) {
        errors.push(`C2 recette ${rid} : sortie output=${r.output} inexistante`);
      }
      if (inputs.some((inp) => inp?.itemId === r.output)) {
        errors.push(`C2 recette ${rid} : sortie ${r.output} parmi les entrées (auto-production)`);
      }
    }
  }

  // Consumable consistency: un objet consommable doit etre reference par au moins un ITEM_USED
  // ou consommé par une recette (consume vrai, défaut true).
  if (game.objects) {
    for (const o of game.objects) {
      if (o.consumable) {
        let used = false;
        for (const n of game.nodes) {
          for (const c of n.activation.requires) {
            if (c.type === "ITEM_USED" && c.itemId === o.id) used = true;
          }
        }
        if (!used) {
          for (const r of recipes) {
            for (const inp of (Array.isArray(r?.inputs) ? r.inputs : [])) {
              if (inp?.itemId === o.id && (inp?.consume ?? true)) used = true;
            }
          }
        }
        if (!used) errors.push(`C2 Objet ${o.id} est consumable mais jamais utilise par ITEM_USED`);
      }
    }
  }

  return { layer: 2, errors };
}

const ajv = new Ajv({allErrors: true, strict: false});
ajv.addSchema(quiz, "modules/quiz.json");
ajv.addSchema(differenceGame, "modules/difference-game.json");
ajv.addSchema(puzzle, "modules/puzzle.json");
ajv.addSchema(arMarker, "modules/ar-marker.json");
ajv.addSchema(boussole, "modules/boussole.json");
ajv.addSchema(codeInput, "modules/code-input.json");
ajv.addSchema(info, "modules/info.json");
ajv.addSchema(inventoryHints, "modules/inventory-hints.json");
const validateSchema = ajv.compile(schema);

function validateLayer1(game: unknown): LayerReport {
  const errors: string[] = [];
  const valid = validateSchema(game);
  const g = game as { nodes?: { id?: string; activation?: { requires?: unknown[]; operator?: string } }[] };
  if (!valid && validateSchema.errors) {
    for (const e of validateSchema.errors) {
      const loc = e.instancePath ? e.instancePath.replace(/^\//, "") : "";
      let msg = e.message ?? "erreur de validation";
      // Résout nodes/<index>/… vers l'id du nœud pour des messages actionnables.
      const m = /^nodes\/(\d+)(?=\/|$)/.exec(loc);
      const node = m ? g.nodes?.[Number(m[1])] : undefined;
      const locId = node?.id ? `${node.id} (${loc})` : loc;
      // Règle operator (if/then) : AJV ne dit que « must match "then" schema » /
      // « must NOT be valid » — précise le sens avec les données du nœud.
      if (node && /\/activation$/.test(loc) && (msg.includes('must match "then" schema') || msg.includes("must NOT be valid"))) {
        const k = node.activation?.requires?.length ?? 0;
        const hasOp = node.activation?.operator != null;
        if (k >= 2 && !hasOp) msg = "operator manquant (2 déclencheurs ou plus exigent AND/OR)";
        else if (k <= 1 && hasOp) msg = "operator interdit (un seul déclencheur : retire operator)";
      }
      // Type d'événement hors vocabulaire : nomme la valeur reçue.
      if (node && /\/inventoryHints\/\d+\/event$/.test(loc) && e.keyword === "enum") {
        const m2 = /\/inventoryHints\/(\d+)\/event$/.exec(loc);
        const data = (node as { module?: { data?: { inventoryHints?: { event?: unknown }[] } } }).module?.data;
        const recu = m2 ? data?.inventoryHints?.[Number(m2[1])]?.event : undefined;
        msg = `type d'événement hors vocabulaire (reçu : ${JSON.stringify(recu)})`;
      }
      errors.push(`C1 ${locId ? locId + " : " : ""}${msg}`);
    }
  }
  return { layer: 1, errors };
}

export function validateGame(game: unknown): { ok: boolean; layers: LayerReport[] } {
  const l1 = validateLayer1(game);
  const layers: LayerReport[] = [l1];
  if (l1.errors.length === 0) layers.push(validateLayer2(game as Game));
  return { ok: layers.every((l) => l.errors.length === 0), layers };
}
