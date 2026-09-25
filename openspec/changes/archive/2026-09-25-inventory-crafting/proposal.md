## Why

« Utiliser la poudre sur la lettre » ne peut se faire aujourd'hui qu'en contournant : un Nœud consommant l'objet via `ITEM_USED`, sans notion de combinaison ni de production. Les jeux escape/chasse ont besoin d'assembler des objets (avec destruction ou non) directement depuis la boîte à outils, sans Nœud intermédiaire artificiel.

## What Changes

- Recettes déclaratives au niveau du jeu : `recipes: [{ id, inputs: [{ itemId, consume }], output }]` — combiner les `inputs` possédés produit `output` ; chaque entrée est consommée (`consume: true`, objet retiré) ou conservée (`false`, ex. loupe). L'objet produit rejoint l'inventaire via le circuit `GIVE_ITEM` existant.
- La combinaison est proposée dans la boîte à outils quand les entrées sont réunies ; confirmation joueur, application atomique (tout ou rien), événement `ITEM_COMBINED` journalisé (bus du change 4).
- Validation : toute référence d'objet doit exister ; une recette dont la sortie figure parmi ses entrées est rejetée (anti-farming immédiat) ; la limite transitive est documentée comme au socle (pas de solveur complet).

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `game-inventory` : recettes de combinaison et règle d'application.
- `game-validation` : règles applicatives des recettes (références, anti-farming).

## Impact

- Moteur (natif + PWA, même code) : résolution des recettes + application atomique via effets existants ; UI toolbox : proposition + confirmation.
- Schéma graphe : tableau optionnel `recipes` au niveau jeu (rétrocompatible : absent = pas de craft).
- Studio : édition des recettes dans l'écran Inventaire (change 1) — suivi possible, spécifié ici comme contrat de données.
- Ne touche pas aux valeurs réservées CONDITIONAL/WINDOW, n'ajoute aucun module au registre.
- Aucune connexion réseau.
- Dépend des changes `studio-inventory-menu` (écran hôte d'édition) et `inventory-events-hints` (événement `ITEM_COMBINED`) non encore archivés ; implémentable après eux.
