// Preuves headless des changes inventory-events-hints (2.1) puis
// inventory-crafting : résolution d'indices (dernier gagne, pur) et
// recettes (proposer + appliquer atomiquement).
import { strict as assert } from "node:assert";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { availableRecipes, applyRecipe, resolveInventoryHint, toolboxIconVisible, timerRemainingMs } from "./src/game/inventory.ts";
import { evaluate } from "./src/game/evaluate.ts";
import { createInventoryEvent, present, INVENTORY_EVENT_TYPES } from "./src/game/runtime.ts";
import { validateGame } from "./src/game/validate.ts";
import type { Game, GameNode } from "./src/game/types.ts";

const PRECISES = [
  { event: "ITEM_SELECTED", hint: "Un objet a été sélectionné." },
  { event: "ITEM_SELECTED", itemId: "loupe", hint: "Regarde le coin supérieur droit." },
  { event: "ITEM_USED", hint: "Bien utilisé, continue." },
] as never;

// 2.1 : abonnement précis (itemId) et large (sans itemId).
{
  assert.equal(
    resolveInventoryHint(PRECISES, "ITEM_SELECTED", "loupe"),
    "Regarde le coin supérieur droit.",
  );
  assert.equal(
    resolveInventoryHint(PRECISES, "ITEM_SELECTED", "cle"),
    "Un objet a été sélectionné.",
  );
  assert.equal(resolveInventoryHint(PRECISES, "ITEM_USED", "nimporte-quoi"), "Bien utilisé, continue.");
  assert.equal(resolveInventoryHint(PRECISES, "ITEM_GIVEN", "loupe"), null);
  console.log("hints 2.1 : OK (précis, large, sans match → null)");
}

// 2.1 : dernier événement gagne ; pur (entrée gelée, aucun état modifié).
{
  const doubles = [
    { event: "ITEM_SELECTED", itemId: "loupe", hint: "Premier." },
    { event: "ITEM_SELECTED", itemId: "loupe", hint: "Dernier." },
  ] as never;
  Object.freeze(doubles);
  assert.equal(resolveInventoryHint(doubles, "ITEM_SELECTED", "loupe"), "Dernier.");
  console.log("hints 2.1 : OK (dernier gagne, entrée intacte)");
}

// 2.1 : l'indice ne change ni état, ni score, ni effet — evaluate() est
// identique avec et sans inventoryHints (le moteur ne lit jamais ce champ).
{
  const noeudQuiz = (hints: unknown) => ({
    id: "q",
    module: { type: "QUIZ", data: { schemaVersion: "1.0.0", questions: [{ q: "?" }], ...(hints ? { inventoryHints: hints } : {}) } },
    activation: { requires: [{ type: "TIMER", anchor: "GAME_START", delaySeconds: 0 }] },
  });
  const jeu = (avecHints: boolean) => ({
    gameId: "pur",
    schemaVersion: "1.0.0",
    nodes: [noeudQuiz(avecHints ? [{ event: "ITEM_SELECTED", itemId: "loupe", hint: "Regarde." }] : null),
      { id: "fin", isEnding: true, module: { type: "INFO", data: { schemaVersion: "1.0.0", steps: [{ text: "x" }] } }, activation: { requires: [{ type: "NODE_COMPLETED", nodeId: "q" }] } }],
  }) as unknown as Game;
  const sim = { present: new Set<string>(), dwellOk: new Set<string>(), throughOk: new Set<string>(), nowMs: 60_000, completedAt: new Map(), accuracyM: 5 };
  const sans = evaluate(jeu(false), sim as never, {}, new Map(), new Map(), new Set());
  const avec = evaluate(jeu(true), sim as never, {}, new Map(), new Map(), new Set());
  assert.deepEqual(avec, sans);
  assert.deepEqual(avec.unlocked, ["q"]);
  console.log("hints 2.1 : OK (evaluate identique avec/sans indices)");
}

// 2.2 : QUIZ bout en bout — journal → événement → indice du renderer,
// Nœud resté ACTIVE, aucune progression émise.
{
  const quizData = {
    schemaVersion: "1.0.0",
    questions: [{ q: "Où est le trésor ?", options: ["Ici", "Là"], correctIndex: 0 }],
    inventoryHints: [
      { event: "ITEM_SELECTED", hint: "Un objet a été sélectionné." },
      { event: "ITEM_SELECTED", itemId: "loupe", hint: "Regarde le coin supérieur droit." },
    ],
  };
  const jeu = {
    gameId: "quiz-hints",
    schemaVersion: "1.0.0",
    minEngineVersion: "1.0.0",
    objects: [{ id: "loupe", name: "Loupe" }, { id: "cle", name: "Clé" }],
    nodes: [
      { id: "q", module: { type: "QUIZ", data: quizData }, activation: { requires: [{ type: "TIMER", anchor: "GAME_START", delaySeconds: 0 }] } },
      { id: "fin", isEnding: true, module: { type: "INFO", data: { schemaVersion: "1.0.0", steps: [{ text: "x" }] } }, activation: { requires: [{ type: "NODE_COMPLETED", nodeId: "q" }] } },
    ],
  } as unknown as Game;
  assert.deepEqual(validateGame(jeu).layers.flatMap((l) => l.errors), []);
  // Le Nœud est ACTIVE (modale unique).
  const p0 = present(["q"], [], null);
  assert.equal(p0.activeId, "q");
  // Journal : la loupe est sélectionnée pendant le quiz.
  const evt = createInventoryEvent("ITEM_SELECTED", "s1", "loupe");
  // Le renderer résout l'indice précis…
  assert.equal(resolveInventoryHint(quizData.inventoryHints as never, evt.type, evt.itemId), "Regarde le coin supérieur droit.");
  // …puis un objet quelconque → abonnement large…
  const evt2 = createInventoryEvent("ITEM_SELECTED", "s1", "cle");
  assert.equal(resolveInventoryHint(quizData.inventoryHints as never, evt2.type, evt2.itemId), "Un objet a été sélectionné.");
  // …et le Nœud reste ACTIVE, sans progression émise.
  const p1 = present(["q"], p0.queue, p0.activeId);
  assert.equal(p1.activeId, "q");
  console.log("hints 2.2 : OK (QUIZ précis + large, ACTIVE inchangé)");
}

// 2.2 : PUZZLE bout en bout — même boucle sur le second module.
{
  const puzzleData = {
    schemaVersion: "1.0.0",
    image: "assets/chateau.jpg",
    tileRows: 3,
    tileCols: 3,
    inventoryHints: [{ event: "ITEM_USED", hint: "Bien utilisé, continue." }],
  };
  const jeu = {
    gameId: "puzzle-hints",
    schemaVersion: "1.0.0",
    minEngineVersion: "1.0.0",
    objects: [{ id: "colle", name: "Colle", consumable: true }],
    nodes: [
      { id: "p", module: { type: "PUZZLE", data: puzzleData }, activation: { requires: [{ type: "TIMER", anchor: "GAME_START", delaySeconds: 0 }] } },
      { id: "fin", isEnding: true, module: { type: "INFO", data: { schemaVersion: "1.0.0", steps: [{ text: "x" }] } }, activation: { requires: [{ type: "NODE_COMPLETED", nodeId: "p" }] } },
    ],
  } as unknown as Game;
  const erreurs = validateGame(jeu).layers.flatMap((l) => l.errors);
  assert.deepEqual(erreurs.filter((m) => m.includes("inventoryHints") || m.includes("événement")), []);
  const p0 = present(["p"], [], null);
  assert.equal(p0.activeId, "p");
  const evt = createInventoryEvent("ITEM_USED", "s1", "colle");
  assert.equal(resolveInventoryHint(puzzleData.inventoryHints as never, evt.type, evt.itemId), "Bien utilisé, continue.");
  const p1 = present(["p"], p0.queue, p0.activeId);
  assert.equal(p1.activeId, "p");
  console.log("hints 2.2 : OK (PUZZLE large, ACTIVE inchangé)");
}

// 3.1 (events-hints) : partie Sherlock — 0 régression C1+C2, journal
// enrichi (un ITEM_GIVEN par effet GIVE_ITEM, comme GameRepository.addItem).
{
  const root = new URL(".", import.meta.url).pathname;
  const sherlock = JSON.parse(readFileSync(`${root}src/game/game-sherlock-holmes.json`, "utf8")) as Game;
  assert.deepEqual(validateGame(sherlock).layers.flatMap((l) => l.errors), []);
  const gives = sherlock.nodes.flatMap((n) => (n.effects ?? []).filter((e) => e.type === "GIVE_ITEM" && e.itemId));
  assert.ok(gives.length > 0, "Sherlock donne des objets");
  const journal = gives.map((e) => createInventoryEvent("ITEM_GIVEN", "sherlock-replay", e.itemId));
  assert.equal(journal.length, gives.length);
  assert.ok(journal.every((j) => (INVENTORY_EVENT_TYPES as readonly string[]).includes(j.type)));
  assert.ok(journal.every((j) => j.sessionId === "sherlock-replay" && typeof j.timestamp === "number"));
  // Aucun indice : Sherlock ne déclare pas d'inventoryHints (0 changement).
  assert.equal(
    sherlock.nodes.flatMap((n) => ((n.module.data as { inventoryHints?: unknown[] } | undefined)?.inventoryHints ?? [])).length,
    0,
  );
  console.log(`sherlock 3.1 : OK (C1+C2 0 erreur, journal ${journal.length} ITEM_GIVEN, 0 hints)`);
}

// 1.1 (crafting) : recipes C1 (forme, absent, minItems) + C2 (références,
// auto-production, consume/consumable) avec fautifs nommés.
{
  const jeuCraft = (objects: unknown, recipes: unknown) => ({
    gameId: "craft",
    schemaVersion: "1.0.0",
    minEngineVersion: "1.0.0",
    objects,
    recipes,
    nodes: [
      { id: "a", module: { type: "INFO", data: { schemaVersion: "1.0.0", steps: [{ text: "x" }] } }, activation: { requires: [{ type: "TIMER", anchor: "GAME_START", delaySeconds: 0 }] } },
      { id: "fin", isEnding: true, module: { type: "INFO", data: { schemaVersion: "1.0.0", steps: [{ text: "x" }] } }, activation: { requires: [{ type: "NODE_COMPLETED", nodeId: "a" }] } },
    ],
  }) as unknown as Game;
  const OBJETS = [
    { id: "poudre", name: "Poudre", consumable: true },
    { id: "lettre", name: "Lettre", consumable: true },
    { id: "message", name: "Message" },
    { id: "loupe", name: "Loupe" },
  ];
  const RECETTE = [{ id: "reveler", inputs: [{ itemId: "poudre", consume: true }, { itemId: "lettre", consume: true }], output: "message" }];
  // Absent = pas de craft, accepté (objets non consumables : rien à réconcilier).
  const OBJETS_SIMPLES = [
    { id: "poudre", name: "Poudre" },
    { id: "lettre", name: "Lettre" },
    { id: "message", name: "Message" },
  ];
  assert.deepEqual(validateGame(jeuCraft(OBJETS_SIMPLES, undefined)).layers.flatMap((l) => l.errors), []);
  // Forme valide acceptée C1+C2.
  assert.deepEqual(validateGame(jeuCraft(OBJETS, RECETTE)).layers.flatMap((l) => l.errors), []);
  // Une seule entrée : rejet C1 (minItems 2).
  const une = validateGame(jeuCraft(OBJETS, [{ id: "r", inputs: [{ itemId: "poudre" }], output: "message" }]));
  assert.ok(une.layers[0].errors.length > 0, JSON.stringify(une.layers[0].errors));
  // Entrée orpheline nommée.
  const orph = validateGame(jeuCraft(OBJETS, [{ id: "r", inputs: [{ itemId: "poudre" }, { itemId: "fantome" }], output: "message" }]));
  assert.deepEqual(orph.layers[0].errors, []);
  assert.ok(orph.layers[1].errors.some((m) => m.includes("recette r") && m.includes("fantome")), JSON.stringify(orph.layers[1].errors));
  // Sortie auto-produite nommée.
  const auto = validateGame(jeuCraft(OBJETS, [{ id: "r", inputs: [{ itemId: "poudre" }, { itemId: "message" }], output: "message" }]));
  assert.ok(auto.layers[1].errors.some((m) => m.includes("recette r") && m.includes("auto-production")), JSON.stringify(auto.layers[1].errors));
  // Entrée consommée mais objet non consumable : nommée.
  const cons = validateGame(jeuCraft(OBJETS, [{ id: "r", inputs: [{ itemId: "loupe", consume: true }, { itemId: "lettre" }], output: "message" }]));
  assert.ok(cons.layers[1].errors.some((m) => m.includes("recette r") && m.includes("loupe")), JSON.stringify(cons.layers[1].errors));
  console.log("craft 1.1 : OK (C1 forme/absent/minItems, C2 refs/auto/consume nommés)");
}

// 2.1 (crafting) : proposer (entrées réunies) + appliquer atomiquement
// (REMOVE+GIVE), tout-ou-rien, miroir exact du shared Kotlin.
{
  const REVELER = { id: "reveler", inputs: [{ itemId: "poudre", consume: true }, { itemId: "lettre", consume: true }], output: "message" };
  const ANNOTER = { id: "annoter", inputs: [{ itemId: "loupe", consume: false }, { itemId: "carte" }], output: "carte-annotee" };
  const RECETTES = [REVELER, ANNOTER];
  assert.deepEqual(availableRecipes(RECETTES as never, { poudre: 1, lettre: 1 }).map((r) => r.id), ["reveler"]);
  assert.deepEqual(availableRecipes(RECETTES as never, { loupe: 1, carte: 1 }).map((r) => r.id), ["annoter"]);
  assert.deepEqual(availableRecipes(RECETTES as never, { loupe: 1 }), []);
  assert.deepEqual(applyRecipe(REVELER as never, { poudre: 1, lettre: 1 }), { message: 1 });
  assert.deepEqual(applyRecipe(ANNOTER as never, { loupe: 1, carte: 1 }), { loupe: 1, "carte-annotee": 1 });
  const avant = { loupe: 1 };
  assert.equal(applyRecipe(ANNOTER as never, avant), null);
  assert.deepEqual(avant, { loupe: 1 });
  const evt = createInventoryEvent("ITEM_COMBINED", "s1", "message");
  assert.equal(evt.type, "ITEM_COMBINED");
  assert.equal(evt.itemId, "message");
  console.log("craft 2.1 : OK (proposer, atomique, tout-ou-rien, ITEM_COMBINED)");
}

// 2.2 (crafting) : poudre + lettre → message (destruction) et loupe +
// carte → carte-annotée (outil conservé), inventaires exacts + journal.
{
  const jeu = {
    gameId: "atelier",
    schemaVersion: "1.0.0",
    minEngineVersion: "1.0.0",
    objects: [
      { id: "poudre", name: "Poudre", consumable: true },
      { id: "lettre", name: "Lettre", consumable: true },
      { id: "message", name: "Message" },
      { id: "loupe", name: "Loupe" },
      { id: "carte", name: "Carte", consumable: true },
      { id: "carte-annotee", name: "Carte annotée" },
    ],
    recipes: [
      { id: "reveler", inputs: [{ itemId: "poudre", consume: true }, { itemId: "lettre", consume: true }], output: "message" },
      { id: "annoter", inputs: [{ itemId: "loupe", consume: false }, { itemId: "carte", consume: true }], output: "carte-annotee" },
    ],
    nodes: [
      { id: "a", module: { type: "INFO", data: { schemaVersion: "1.0.0", steps: [{ text: "x" }] } }, activation: { requires: [{ type: "TIMER", anchor: "GAME_START", delaySeconds: 0 }] } },
      { id: "fin", isEnding: true, module: { type: "INFO", data: { schemaVersion: "1.0.0", steps: [{ text: "x" }] } }, activation: { requires: [{ type: "NODE_COMPLETED", nodeId: "a" }] } },
    ],
  } as unknown as Game;
  assert.deepEqual(validateGame(jeu).layers.flatMap((l) => l.errors), []);
  const [reveler, annoter] = jeu.recipes!;
  // Poudre + lettre → message : les deux entrées disparaissent.
  let inv = { poudre: 1, lettre: 1, loupe: 1, carte: 1 };
  assert.deepEqual(availableRecipes(jeu.recipes!, inv).map((r) => r.id).sort(), ["annoter", "reveler"]);
  const journal: { type: string; itemId?: string }[] = [];
  const apres1 = applyRecipe(reveler, inv)!;
  journal.push(createInventoryEvent("ITEM_COMBINED", "atelier", reveler.output));
  assert.deepEqual(apres1, { loupe: 1, carte: 1, message: 1 });
  // Loupe + carte → carte-annotée : la loupe reste, la carte disparaît.
  const apres2 = applyRecipe(annoter, apres1)!;
  journal.push(createInventoryEvent("ITEM_COMBINED", "atelier", annoter.output));
  assert.deepEqual(apres2, { loupe: 1, message: 1, "carte-annotee": 1 });
  assert.deepEqual(journal.map((j) => [j.type, j.itemId]), [["ITEM_COMBINED", "message"], ["ITEM_COMBINED", "carte-annotee"]]);
  // Plus rien à combiner ensuite.
  assert.deepEqual(availableRecipes(jeu.recipes!, apres2), []);
  console.log("craft 2.2 : OK (destruction + outil conservé, inventaires exacts, journal)");
}

// 2.1 (toolbox) : Sherlock (objets + TOOLBOX → icône) vs BASIC (pas de
// TOOLBOX → aucune icône), et inventoryAccess: false masque sur le nœud.
{
  const root = new URL(".", import.meta.url).pathname;
  const sherlock = JSON.parse(readFileSync(`${root}src/game/game-sherlock-holmes.json`, "utf8")) as Game;
  const poi = JSON.parse(readFileSync(`${root}src/game/game-5poi.json`, "utf8")) as Game;
  // Sherlock : 6 objets + TOOLBOX → icône sur chaque écran par défaut.
  assert(toolboxIconVisible(sherlock, null), "sherlock icône globale");
  assert(sherlock.nodes.every((n) => toolboxIconVisible(sherlock, n.id)), "sherlock icône partout");
  // Épreuve isolée : un nœud masqué ne montre rien tant qu'il est ACTIVE.
  const isole = { ...sherlock, nodes: sherlock.nodes.map((n, i) => (i === 0 ? { ...n, inventoryAccess: false } : n)) };
  assert(!toolboxIconVisible(isole, sherlock.nodes[0].id), "nœud isolé masqué");
  assert(toolboxIconVisible(isole, sherlock.nodes[1].id), "autres nœuds intacts");
  // BASIC : objets déclarés mais pas de TOOLBOX → aucune icône.
  assert(!toolboxIconVisible(poi, null), "5poi sans TOOLBOX");
  // BASIC sans objet du tout → aucune icône.
  assert(!toolboxIconVisible({ ...poi, objects: [] }, null), "BASIC sans objet");
  console.log("toolbox 2.1 : OK (Sherlock icône, 5poi aucune, isolé masqué)");
}

// 1.2 (home-dashboard) : temps restant par POI depuis les TIMER.
{
  const t = (anchor: "GAME_START" | "NODE_COMPLETION", delaySeconds: number, anchorNodeId?: string) =>
    ({ type: "TIMER", anchor, delaySeconds, ...(anchorNodeId ? { anchorNodeId } : {}) });
  const noeud = (conds: unknown[]) =>
    ({ id: "q", module: { type: "INFO" }, activation: { requires: conds } }) as unknown as GameNode;
  assert(timerRemainingMs(noeud([t("GAME_START", 600)]), new Map(), 240_000) === 360_000, "600s − 240s → 360s");
  assert(timerRemainingMs(noeud([t("GAME_START", 60)]), new Map(), 61_000) === null, "délai passé → null");
  assert(timerRemainingMs(noeud([t("NODE_COMPLETION", 60, "a")]), new Map(), 0) === null, "ancre absente → null");
  assert(timerRemainingMs(noeud([t("NODE_COMPLETION", 60, "a")]), new Map([["a", 100_000]]), 130_000) === 30_000, "ancre complétée → rebours");
  assert(timerRemainingMs(noeud([t("GAME_START", 10), t("GAME_START", 600)]), new Map(), 10_000) === 590_000, "multi-TIMER → premier non satisfait");
  console.log("home 1.2 : OK (rebours par POI, ancre absente → null)");
}

// 2.1 (home-dashboard) : Sherlock + HOME → POI avec états, sans rebours
// fictif ; jeu à TIMER → rebours affiché ; limites d'épreuve hors tableau.
{
  const root = new URL(".", import.meta.url).pathname;
  const sherlock = JSON.parse(readFileSync(`${root}src/game/game-sherlock-holmes.json`, "utf8")) as Game;
  const avecHome = { ...sherlock, global: { ...sherlock.global, presentation: [...(sherlock.global?.presentation ?? []), "HOME"] } };
  const sim0 = { present: new Set<string>(), dwellOk: new Set<string>(), throughOk: new Set<string>(), nowMs: 0, completedAt: new Map(), accuracyM: 5 };
  const ev0 = evaluate(avecHome, sim0 as never, {}, new Map(), new Map(), new Set());
  assert(ev0.unlocked.includes("start"), "start éligible à t=0");
  // Aucun TIMER à délai dans Sherlock → aucun rebours (pas de fictif).
  const reboursSherlock = avecHome.nodes.map((n) => timerRemainingMs(n, new Map(), 0));
  assert(reboursSherlock.every((r) => r === null), "Sherlock : 0 rebours sans TIMER");
  // Jeu à TIMER : le rebours du POI est exposé au tableau.
  const jeuTimer = {
    gameId: "attente",
    schemaVersion: "1.0.0",
    minEngineVersion: "1.0.0",
    global: { presentation: ["HOME"] },
    nodes: [
      { id: "sas", module: { type: "INFO", data: { schemaVersion: "1.0.0", steps: [{ text: "x" }] } }, activation: { requires: [{ type: "TIMER", anchor: "GAME_START", delaySeconds: 600 }] } },
      { id: "fin", isEnding: true, module: { type: "INFO", data: { schemaVersion: "1.0.0", steps: [{ text: "x" }] } }, activation: { requires: [{ type: "NODE_COMPLETED", nodeId: "sas" }] } },
    ],
  } as unknown as Game;
  assert.deepEqual(validateGame(jeuTimer).layers.flatMap((l) => l.errors), []);
  const sas = jeuTimer.nodes[0];
  assert(timerRemainingMs(sas, new Map(), 240_000) === 360_000, "sas affiche dans 06:00 à 240s");
  console.log("home 2.1 : OK (Sherlock états sans fictif, TIMER → rebours)");
}

// 1.2 (lot-correctifs) : garde-fou — aucune couleur de texte codée en dur
// dans les renderers d'écran (les couleurs auteur viennent des données).
{
  const root = new URL(".", import.meta.url).pathname;
  const fichiers: string[] = [];
  const ramasser = (dir: string) => {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) ramasser(p);
      else if (p.endsWith(".tsx")) fichiers.push(p);
    }
  };
  ramasser(join(root, "src/components/wysiwyg"));
  const fautifs = fichiers.filter((f) => {
    const code = readFileSync(f, "utf8").split("\n").filter((l) => !l.trim().startsWith("//"));
    return code.some((l) => /text-white|text-black|color:\s*["']#/.test(l));
  });
  assert.deepEqual(fautifs, []);
  console.log(`écrans 1.2 : OK (0 couleur texte codée en dur sur ${fichiers.length} renderers)`);
}

console.log("INVENTORY SMOKE OK");
