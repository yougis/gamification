// Validation couches 1 (AJV Draft-07) + 2 (applicative, sous-ensemble POC).
// C1 exhaustive. C2 : cycles, atteignabilite isEnding (+ chaque candidat),
// AND-exclusif direct, topo pools ON_GAME_START + regle boot, drawCount<=len,
// unicite candidats, cohérence holdMode/holdExit/needsLock. Verdicts separes
// par couche, comme exige.
import Ajv from "ajv";
import { Collecteur, type Diagnostic } from "./diagnostics";
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

type LayerReport = { layer: number; errors: string[]; diagnostics: Diagnostic[] };

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
  const sig = new Collecteur(2);
  const errors = sig.errors;
  const byId = new Map(game.nodes.map((n) => [n.id, n]));

  // ExperienceStyle validation.
  const exStyle = game.experienceStyle;
  if (exStyle?.preset && !["BASIC", "GUIDED", "TREASURE_HUNT", "ESCAPE_GAME", "OPEN_EXPLORATION"].includes(exStyle.preset)) {
    sig.signaler("PRESET_EXPERIENCE_INVALIDE", `C2 experienceStyle.preset invalide: ${exStyle.preset}`, { champ: "experienceStyle.preset", attendu: "BASIC, GUIDED, TREASURE_HUNT, ESCAPE_GAME, OPEN_EXPLORATION" });
  }
  if (exStyle?.identity?.name && exStyle.identity.name.length === 0) {
    sig.signaler("IDENTITY_NAME_VIDE", `C2 experienceStyle.identity.name ne peut pas etre vide`, { champ: "experienceStyle.identity.name" });
  }

  // GameMode et Difficulty validation.
  if (game.gameMode && !["NORMAL", "ANIMATEUR", "SOIREE", "HARDCORE"].includes(game.gameMode)) {
    sig.signaler("GAMEMODE_INVALIDE", `C2 gameMode invalide: ${game.gameMode}`, { champ: "gameMode", attendu: "NORMAL, ANIMATEUR, SOIREE, HARDCORE" });
  }
  if (game.difficulty && !["ENFANT", "FAMILLE", "EXPERT"].includes(game.difficulty)) {
    sig.signaler("DIFFICULTY_INVALIDE", `C2 difficulty invalide: ${game.difficulty}`, { champ: "difficulty", attendu: "ENFANT, FAMILLE, EXPERT" });
  }

  // Branding validation.
  if (game.branding) {
    if (game.branding.primaryColor && !/^#[0-9a-fA-F]{6}$/.test(game.branding.primaryColor)) {
      sig.signaler("BRANDING_PRIMARY_INVALIDE", `C2 branding.primaryColor invalide: ${game.branding.primaryColor}`, { champ: "branding.primaryColor", attendu: "#RRGGBB" });
    }
    if (game.branding.secondaryColor && !/^#[0-9a-fA-F]{6}$/.test(game.branding.secondaryColor)) {
      sig.signaler("BRANDING_SECONDARY_INVALIDE", `C2 branding.secondaryColor invalide: ${game.branding.secondaryColor}`, { champ: "branding.secondaryColor", attendu: "#RRGGBB" });
    }
  }

  // HOLD validation: coherence holdMode/holdExit/needsLock.
  const holdMode = (game.global as Record<string, unknown>)?.holdMode as string | undefined;
  const holdExit = (game.global as Record<string, unknown>)?.holdExit as Record<string, unknown> | undefined;
  if (holdMode && holdMode !== "none") {
    if (!holdExit || !holdExit.method) {
      sig.signaler("HOLD_EXIT_MANQUANT", `C2 holdExit requis quand holdMode=${holdMode}`, { champ: "global.holdExit.method" });
    }
    // Check modules with needsLock require holdMode != none.
    for (const n of game.nodes) {
      const needsLock = (n.module.data as Record<string, unknown>)?.needsLock === true;
      if (needsLock && holdMode === "none") {
        sig.signaler("NEEDSLOCK_SANS_HOLD", `C2 Module ${n.id} (needsLock) nécessite holdMode != none`, { noeud: n.id, champ: "global.holdMode" });
      }
    }
  }

  // Task 4.1: global.preset obsolète.
  const gAny = game.global as Record<string, unknown> | undefined;
  if (gAny?.preset !== undefined) {
    sig.signaler("PRESET_OBSOLETE", `C2 global.preset est obsolète, utilisez global.experienceStyle.preset`, { champ: "global.preset", attendu: "global.experienceStyle.preset" });
  }

  // Task 4.2: Exclusion mutuelle map ↔ indoorPlans.
  const hasMap = gAny?.map && typeof gAny.map === "object" && Object.keys(gAny.map).length > 0;
  const hasIndoor = Array.isArray(gAny?.indoorPlans) && gAny.indoorPlans.length > 0;
  if (hasMap && hasIndoor) {
    sig.signaler("MAP_INDOOR_EXCLUSIFS", `C2 global.map et global.indoorPlans sont mutuellement exclusifs`, { champ: "global.map / global.indoorPlans" });
  }

  // Temps global et fenêtres (change game-temps-global-fenetres) : fenêtre
  // non vide (apres < avant quand les deux posés), condition fautive nommée.
  // La faisabilité temporelle complète reste hors socle (pas de solveur
  // temporel) : l'hypothèse d'environnement favorable couvre les
  // déverrouillages, jamais le respect des échéances par le joueur.
  for (const n of game.nodes) {
    for (const c of n.activation.requires) {
      if (c.type !== "WINDOW") continue;
      const apres = (c as { apresSecondes?: unknown }).apresSecondes;
      const avant = (c as { avantSecondes?: unknown }).avantSecondes;
      if (typeof apres === "number" && typeof avant === "number" && !(apres < avant)) {
        sig.signaler("FENETRE_VIDE", `C2 ${n.id} : fenêtre WINDOW vide (apresSecondes=${apres} >= avantSecondes=${avant})`, { noeud: n.id, champ: "apresSecondes / avantSecondes", attendu: "apres < avant" });
      }
    }
  }

  // Task 4.3: planId validation — tout position.planId doit exister dans indoorPlans.
  const planIds = new Set<string>(
    Array.isArray(gAny?.indoorPlans) ? (gAny.indoorPlans as Array<{id: string}>).map((p) => p.id) : [],
  );
  for (const n of game.nodes) {
    if (n.position?.planId && !planIds.has(n.position.planId)) {
      sig.signaler("PLANID_INCONNU", `C2 ${n.id} : position.planId "${n.position.planId}" inexistant dans indoorPlans`, { noeud: n.id, champ: "position.planId" });
    }
  }

  // Task 4.5: Warning nœud indoor + GEOFENCE.
  for (const n of game.nodes) {
    if (n.position) {
      const hasGEOFENCE = n.activation.requires.some((c) => c.type === "GEOFENCE");
      if (hasGEOFENCE) {
        sig.signaler("INDOOR_GEOFENCE", `C2 ${n.id} : nœud indoor avec condition GEOFENCE (incohérent, GPS indisponible en intérieur)`, { noeud: n.id });
      }
    }
  }

  // Task 4.7: Warning tileStrategy:none avec global.map présent.
  if (gAny?.tileStrategy === "none" && hasMap) {
    sig.signaler("TILESTRATEGY_NONE_MAP", `C2 global.tileStrategy "none" avec global.map configuré (pas de tuiles affichées)`, { champ: "global.tileStrategy" });
  }

  // Widget cartographie (change widget-cartographie) : collecte des widgets
  // map des écrans (nœuds + global) pour les règles de cohérence source.
  const ecrans: { proprietaire: string; def: unknown }[] = [];
  for (const n of game.nodes) {
    if (n.screen) ecrans.push({ proprietaire: n.id, def: n.screen });
  }
  const ecranGlobal = (game.global as { screen?: unknown } | undefined)?.screen;
  if (ecranGlobal) ecrans.push({ proprietaire: "global", def: ecranGlobal });
  const widgetsCarte: { proprietaire: string; widget: Record<string, unknown> }[] = [];
  const collecter = (prop: string, valeur: unknown) => {
    if (Array.isArray(valeur)) {
      for (const w of valeur) {
        if (w && typeof w === "object" && (w as { type?: unknown }).type === "map") {
          widgetsCarte.push({ proprietaire: prop, widget: w as Record<string, unknown> });
        }
      }
      return;
    }
    if (valeur && typeof valeur === "object") {
      for (const v of Object.values(valeur as Record<string, unknown>)) collecter(prop, v);
    }
  };
  for (const e of ecrans) collecter(e.proprietaire, e.def);

  // 2.1 : filter "all" + discovery non-VISIBLE_NOW = avertissement (éventement).
  const aDecouverteMasquee = game.nodes.some(
    (n) => n.discovery && n.discovery.mode !== "VISIBLE_NOW",
  );
  if (aDecouverteMasquee) {
    for (const { proprietaire, widget } of widgetsCarte) {
      const source = widget.source as { filter?: unknown } | undefined;
      if (source?.filter === "all") {
        sig.signaler("CARTE_ALL_EVENTE", `C2 ${proprietaire} : widget carte en filter "all" éventant des étapes à découverte masquée`, { noeud: proprietaire === "global" ? undefined : proprietaire, champ: "source.filter", attendu: "discovered" });
      }
    }
  }

  // 2.2 : source steps sur jeu sans nœud (HOME-seul) = avertissement, sans rejet.
  if (game.nodes.length === 0 && widgetsCarte.length > 0) {
    sig.signaler("CARTE_SANS_ETAPE", `C2 widget carte sans aucune étape dans le jeu (carte vide)`, { champ: "source" });
  }

  // Cycles (aretes allowCycle:true ignorees).
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  const visit = (id: string, stack: string[]): boolean => {
    color.set(id, GRAY);
    for (const dep of nodeRefs(byId.get(id)!)) {
      if (!byId.has(dep)) {
        sig.signaler("REF_INCONNUE", `C2 ${id} : reference inconnue ${dep}`, { noeud: id, champ: "activation", attendu: "identifiant d'étape existante" });
        continue;
      }
      const c = color.get(dep) ?? WHITE;
      if (c === GRAY) {
        sig.signaler("CYCLE", `C2 cycle : ${[...stack, id, dep].join(" -> ")}`, { noeud: id });
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
      sig.signaler("DRAWCOUNT_TROP_GRAND", `C2 ${n.id} : drawCount > candidates.length`, { noeud: n.id, champ: "randomPool.drawCount", attendu: `≤ ${n.randomPool.candidates.length}` });
    }
    for (const c of n.randomPool.candidates) {
      if (inPool.has(c)) sig.signaler("CANDIDAT_DOUBLE_POOL", `C2 ${c} : candidat de deux pools (${inPool.get(c)}, ${n.id})`, { noeud: n.id, champ: "randomPool.candidates", attendu: "chaque étape dans un seul tirage" });
      else inPool.set(c, n.id);
      if (!byId.has(c)) sig.signaler("CANDIDAT_INCONNU", `C2 ${n.id} : candidat inconnu ${c}`, { noeud: n.id, champ: "randomPool.candidates" });
    }
  }
  const boot = (id: string, seen: string[]): boolean => {
    if (seen.includes(id)) {
      sig.signaler("CYCLE_INTERPOOLS", `C2 cycle inter-pools : ${[...seen, id].join(" -> ")}`, { noeud: id });
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
          sig.signaler("POOL_BOOT_DEPENDANCE", `C2 ${id} : pool ON_GAME_START depend du candidat ${c.nodeId} d'un pool ON_POOL_ACTIVATION`, { noeud: id });
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
  // Exemption HOME-seul (change player-home-solo) : jeu vide avec HOME =
  // session sans fin assumée (sortie par Quitter, mention au journal) ;
  // seuls les contrôles isEnding/atteignabilité sont sautés, tout le reste
  // reste applicable (y compris aux jeux non vides avec HOME).
  const homeSoloVide =
    (game.global?.presentation ?? []).includes("HOME") && game.nodes.length === 0;
  if (!homeSoloVide && endings.length === 0) sig.signaler("AUCUN_ISENDING", "C2 : aucun noeud isEnding", { attendu: "désigner une étape Fin du jeu" });
  else if (!homeSoloVide) {
    if (!endings.some((e) => activable(e, new Set(), new Set()))) {
      sig.signaler("ISENDING_INATTEIGNABLE", "C2 : aucun isEnding atteignable depuis le depart", {});
    }
    for (const [pid, p] of poolOf) {
      for (const c of p.randomPool!.candidates) {
        const done = new Set([c]);
        if (!endings.some((e) => activable(e, done, new Set()))) {
          sig.signaler("CANDIDAT_SANS_FIN", `C2 : candidat ${c} du pool ${pid} sans chemin vers FIN`, { noeud: c, attendu: "relier à une fin" });
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
            sig.signaler("AND_EXCLUSIF", `C2 ${m.id} : AND sur candidats exclusifs du pool ${a}`, { noeud: m.id, attendu: "OR ou candidats compatibles" });
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
        sig.signaler("ITEM_REQUIRED_ORPHELIN", `C2 ${n.id} : ITEM_REQUIRED itemId=${c.itemId} inexistant`, { noeud: n.id, champ: "itemId", attendu: "objet existant" });
      }
      if (c.type === "ITEM_USED" && c.itemId && !items.has(c.itemId)) {
        sig.signaler("ITEM_USED_ORPHELIN", `C2 ${n.id} : ITEM_USED itemId=${c.itemId} inexistant`, { noeud: n.id, champ: "itemId", attendu: "objet existant" });
      }
      if (c.type === "CODE_INPUT" && !c.code) {
        sig.signaler("CONDITION_CODE_MANQUANT", `C2 ${n.id} : CODE_INPUT requiert un code`, { noeud: n.id, champ: "code" });
      }
      if (c.type === "CLUE_RESOLVED" && c.clueId && !clues.has(c.clueId)) {
        sig.signaler("CLUE_ORPHELINE", `C2 ${n.id} : CLUE_RESOLVED clueId=${c.clueId} inexistant`, { noeud: n.id, champ: "clueId", attendu: "indice existant" });
      }
      if (c.type === "TIMER" && c.anchor === "NODE_COMPLETION" && c.anchorNodeId && !byId.has(c.anchorNodeId)) {
        sig.signaler("TIMER_ANCRE_ORPHELINE", `C2 ${n.id} : TIMER anchorNodeId=${c.anchorNodeId} inexistant`, { noeud: n.id, champ: "anchorNodeId" });
      }
    }
    // Module CODE_INPUT : code attendu requis (symetrique de la condition).
    if (n.module.type === "CODE_INPUT") {
      const code = (n.module.data as { code?: unknown } | undefined)?.code;
      if (typeof code !== "string" || code.length === 0) {
        sig.signaler("MODULE_CODE_MANQUANT", `C2 ${n.id} : module CODE_INPUT requiert un code attendu (module.data.code)`, { noeud: n.id, champ: "module.data.code" });
      }
    }
    // Indices sur événements d'inventaire : tout itemId écouté doit exister.
    const hints = (n.module.data as { inventoryHints?: { itemId?: unknown }[] } | undefined)?.inventoryHints;
    if (Array.isArray(hints)) {
      for (const h of hints) {
        if (typeof h?.itemId === "string" && h.itemId && !items.has(h.itemId)) {
          sig.signaler("HINT_ITEM_ORPHELIN", `C2 ${n.id} : inventoryHints itemId=${h.itemId} inexistant`, { noeud: n.id, champ: "inventoryHints.itemId" });
        }
      }
    }
    if (n.discovery) {
      if (n.discovery.mode === "ON_ITEM" && n.discovery.itemId && !items.has(n.discovery.itemId)) {
        sig.signaler("DISCOVERY_ITEM_ORPHELIN", `C2 ${n.id} : discovery ON_ITEM itemId=${n.discovery.itemId} inexistant`, { noeud: n.id, champ: "discovery.itemId" });
      }
      if (n.discovery.mode === "ON_CLUE" && n.discovery.clueId && !clues.has(n.discovery.clueId)) {
        sig.signaler("DISCOVERY_CLUE_ORPHELIN", `C2 ${n.id} : discovery ON_CLUE clueId=${n.discovery.clueId} inexistant`, { noeud: n.id, champ: "discovery.clueId" });
      }
      if (n.discovery.mode === "ON_COMPLETED" && n.discovery.sourceNode && !byId.has(n.discovery.sourceNode)) {
        sig.signaler("DISCOVERY_SOURCE_ORPHELINE", `C2 ${n.id} : discovery ON_COMPLETED sourceNode=${n.discovery.sourceNode} inexistant`, { noeud: n.id, champ: "discovery.sourceNode" });
      }
      if (n.discovery.mode === "ON_PUZZLE" && n.discovery.sourceNode && !byId.has(n.discovery.sourceNode)) {
        sig.signaler("DISCOVERY_PUZZLE_ORPHELINE", `C2 ${n.id} : discovery ON_PUZZLE sourceNode=${n.discovery.sourceNode} inexistant`, { noeud: n.id, champ: "discovery.sourceNode" });
      }
      if (n.discovery.mode === "ON_PROXIMITY" && n.discovery.sourceNode && !byId.has(n.discovery.sourceNode)) {
        sig.signaler("DISCOVERY_PROXIMITY_ORPHELINE", `C2 ${n.id} : discovery ON_PROXIMITY sourceNode=${n.discovery.sourceNode} inexistant`, { noeud: n.id, champ: "discovery.sourceNode" });
      }
    }
    if (n.inventoryRef) {
      for (const ref of n.inventoryRef) {
        if (!items.has(ref)) sig.signaler("INVENTORYREF_ORPHELIN", `C2 ${n.id} : inventoryRef itemId=${ref} inexistant`, { noeud: n.id, champ: "inventoryRef" });
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
        sig.signaler("RECETTE_ENTREE_ORPHELINE", `C2 recette ${rid} : entrée itemId=${iid || "?"} inexistante`, { noeud: rid, champ: "inputs[].itemId" });
        continue;
      }
      const consume = inp?.consume ?? true;
      if (consume && byObjId.get(iid)?.consumable !== true) {
        sig.signaler("RECETTE_CONSOMMABLE", `C2 recette ${rid} : entrée ${iid} consommée mais objet non consumable`, { noeud: rid, champ: "inputs[].consume" });
      }
    }
    if (typeof r?.output === "string" && r.output) {
      if (!items.has(r.output)) {
        sig.signaler("RECETTE_SORTIE_ORPHELINE", `C2 recette ${rid} : sortie output=${r.output} inexistante`, { noeud: rid, champ: "output" });
      }
      if (inputs.some((inp) => inp?.itemId === r.output)) {
        sig.signaler("RECETTE_AUTOPRODUCTION", `C2 recette ${rid} : sortie ${r.output} parmi les entrées (auto-production)`, { noeud: rid });
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
        if (!used) sig.signaler("CONSUMABLE_INUTILISE", `C2 Objet ${o.id} est consumable mais jamais utilise par ITEM_USED`, { noeud: o.id, champ: "consumable" });
      }
    }
  }

  return { layer: 2, errors, diagnostics: sig.diagnostics };
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
  const sig = new Collecteur(1);
  const errors = sig.errors;
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
      const champ = loc.split("/").pop() || undefined;
      let code = "C1_FORME_INVALIDE";
      if (e.keyword === "required") code = "C1_CHAMP_REQUIS";
      else if (e.keyword === "additionalProperties") code = "C1_CHAMP_INCONNU";
      else if (e.keyword === "enum") code = "C1_ENUM_INVALIDE";
      // Règle operator (if/then) : AJV ne dit que « must match "then" schema » /
      // « must NOT be valid » — précise le sens avec les données du nœud.
      if (node && /\/activation$/.test(loc) && (msg.includes('must match "then" schema') || msg.includes("must NOT be valid"))) {
        const k = node.activation?.requires?.length ?? 0;
        const hasOp = node.activation?.operator != null;
        if (k >= 2 && !hasOp) { msg = "operator manquant (2 déclencheurs ou plus exigent AND/OR)"; code = "OPERATOR_MANQUANT"; }
        else if (k <= 1 && hasOp) { msg = "operator interdit (un seul déclencheur : retire operator)"; code = "OPERATOR_INTERDIT"; }
      }
      if (/maxReentries.*required|required.*maxReentries/.test(msg) || (e.keyword === "required" && (e.params as { missingProperty?: string })?.missingProperty === "maxReentries")) {
        code = "C1_MAXREENTRIES";
      }
      // Type d'événement hors vocabulaire : nomme la valeur reçue.
      if (node && /\/inventoryHints\/\d+\/event$/.test(loc) && e.keyword === "enum") {
        const m2 = /\/inventoryHints\/(\d+)\/event$/.exec(loc);
        const data = (node as { module?: { data?: { inventoryHints?: { event?: unknown }[] } } }).module?.data;
        const recu = m2 ? data?.inventoryHints?.[Number(m2[1])]?.event : undefined;
        msg = `type d'événement hors vocabulaire (reçu : ${JSON.stringify(recu)})`;
        code = "C1_ENUM_INVALIDE";
      }
      sig.signaler(code, `C1 ${locId ? locId + " : " : ""}${msg}`, { noeud: node?.id, champ });
    }
  }
  return { layer: 1, errors, diagnostics: sig.diagnostics };
}

export function validateGame(game: unknown): { ok: boolean; layers: LayerReport[] } {
  const l1 = validateLayer1(game);
  const layers: LayerReport[] = [l1];
  if (l1.errors.length === 0) layers.push(validateLayer2(game as Game));
  return { ok: layers.every((l) => l.errors.length === 0), layers };
}
