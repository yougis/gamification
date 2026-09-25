package com.geoplay.shared.game

import com.geoplay.shared.model.Recipe

// Combinaisons d'atelier (change inventory-crafting) : une seule primitive
// déclarative, application atomique via les effets existants (REMOVE_ITEM
// puis GIVE_ITEM), journal ITEM_COMBINED via le bus d'inventaire.
// Contrat proposer/confirmer : availableRecipes = ce que la boîte à outils
// liste (entrées réunies), l'appel explicite à applyRecipe = la
// confirmation du joueur. Natif + PWA partagent ce même code.

// Recettes dont toutes les entrées sont possédées (quantité ≥ 1).
fun availableRecipes(recipes: List<Recipe>, items: Map<String, Int>): List<Recipe> =
    recipes.filter { r -> r.inputs.all { (items[it.itemId] ?: 0) >= 1 } }

// Applique une recette de façon atomique : si une entrée manque au moment
// de confirmer, retourne null et RIEN ne change (tout ou rien, pas d'état
// intermédiaire). Sinon : retrait des entrées consommées (1 unité), ajout
// de la sortie via le circuit GIVE_ITEM. Les recettes consomment 1 unité
// par entrée (quantités > 1 : documenté, extensible plus tard).
fun applyRecipe(recipe: Recipe, inventory: InventoryState): InventoryState? {
    if (recipe.inputs.any { (inventory.items[it.itemId] ?: 0) < 1 }) return null
    var items = inventory.items
    for (input in recipe.inputs) {
        if (!input.consume) continue
        val left = (items[input.itemId] ?: 0) - 1
        items = if (left > 0) items + (input.itemId to left) else items - input.itemId
    }
    items = items + (recipe.output to ((items[recipe.output] ?: 0) + 1))
    return inventory.copy(items = items)
}
