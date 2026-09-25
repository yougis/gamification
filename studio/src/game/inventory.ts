// Logique d'inventaire côté Studio (miroir du shared Kotlin, même règle).
// Change inventory-events-hints : écoute passive des événements.
// Change inventory-crafting : recettes (proposer + appliquer atomiquement).
// Change player-inventory-toolbox : règle d'affichage de l'icône.
// Change player-home-dashboard : compte à rebours par POI.
import type { Game, GameNode, InventoryEventType, InventoryHint, Recipe } from "./types";

// Dernier abonnement correspondant gagne : plusieurs abonnements sont
// cumulables, un seul emplacement d'affichage. `itemId` absent = écoute
// large (tout objet pour ce type d'événement). Pur : ni état, ni score,
// ni effet modifié — seul un texte est retourné.
export function resolveInventoryHint(
  hints: InventoryHint[],
  event: InventoryEventType,
  itemId?: string,
): string | null {
  let out: string | null = null;
  for (const h of hints) {
    if (h.event !== event) continue;
    if (h.itemId != null && h.itemId !== itemId) continue;
    out = h.hint;
  }
  return out;
}

// Recettes proposables : toutes les entrées possédées (quantité ≥ 1).
// C'est cette liste que la boîte à outils affiche ; l'appel explicite à
// applyRecipe vaut confirmation du joueur.
export function availableRecipes(recipes: Recipe[], items: Record<string, number>): Recipe[] {
  return recipes.filter((r) => r.inputs.every((i) => (items[i.itemId] ?? 0) >= 1));
}

// Application atomique : entrée manquante → null, RIEN ne change (tout ou
// rien). Sinon : retrait des entrées consommées (1 unité), ajout de la
// sortie (circuit GIVE_ITEM). Recettes = 1 unité par entrée.
export function applyRecipe(recipe: Recipe, items: Record<string, number>): Record<string, number> | null {
  if (recipe.inputs.some((i) => (items[i.itemId] ?? 0) < 1)) return null;
  const next: Record<string, number> = { ...items };
  for (const i of recipe.inputs) {
    if (i.consume === false) continue;
    const left = (next[i.itemId] ?? 0) - 1;
    if (left > 0) next[i.itemId] = left;
    else delete next[i.itemId];
  }
  next[recipe.output] = (next[recipe.output] ?? 0) + 1;
  return next;
}

// Icône d'inventaire persistante (change player-inventory-toolbox, miroir
// du shared Kotlin) : objets déclarés ET TOOLBOX en présentation ET nœud
// courant ne masquant pas. Le nœud ne peut que masquer, jamais forcer.
export function toolboxIconVisible(game: Game, activeNodeId?: string | null): boolean {
  if ((game.objects ?? []).length === 0) return false;
  if (!(game.global?.presentation ?? []).includes("TOOLBOX")) return false;
  if (activeNodeId == null) return true;
  return game.nodes.find((n) => n.id === activeNodeId)?.inventoryAccess !== false;
}

// Vue par défaut (change player-home-dashboard 2.2, miroir du shared
// Kotlin) : tableau quand HOME est présent et aucune modale ACTIVE.
export function showHomeDashboard(game: Game, activeNodeId?: string | null): boolean {
  return (game.global?.presentation ?? []).includes("HOME") && activeNodeId == null;
}

// Compte à rebours d'un POI (change player-home-dashboard, miroir du
// shared Kotlin) : première condition TIMER non satisfaite, `ancre +
// délai − nowMs` en ms (jamais négatif) ; ancre NODE_COMPLETION absente →
// null ; aucun TIMER ou tous satisfaits → null.
export function timerRemainingMs(
  node: GameNode,
  completedAt: Map<string, number>,
  nowMs: number,
): number | null {
  for (const c of node.activation.requires) {
    if (c.type !== "TIMER") continue;
    const anchor = c.anchor === "NODE_COMPLETION" ? (completedAt.get(c.anchorNodeId!) ?? null) : 0;
    if (anchor == null) return null;
    const dueAt = anchor + (c.delaySeconds ?? 0) * 1000;
    if (nowMs >= dueAt) continue;
    return dueAt - nowMs;
  }
  return null;
}
