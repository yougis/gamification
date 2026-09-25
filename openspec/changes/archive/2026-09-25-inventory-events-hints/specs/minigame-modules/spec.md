## ADDED Requirements

### Requirement: Indices sur événements d'inventaire

Tout mini-jeu socle (QUIZ, DIFFERENCE_GAME, PUZZLE, AR_MARKER, BOUSSOLE, CODE_INPUT — via le registre, jamais de liste fermée en dur dans le moteur) MAY déclarer `inventoryHints: [{ event, itemId?, hint }]` dans son `module.data`, où `event` appartient au vocabulaire fermé des événements d'inventaire et `hint` est le texte d'indice à afficher. Quand un événement correspondant survient pendant que le Nœud est ACTIVE, le renderer SHALL afficher `hint` sans changer l'état du jeu (ni transition, ni effet, ni score). Les abonnements sans `itemId` réagissent à tout objet pour ce type d'événement.

#### Scenario: Indice sur sélection
- **GIVEN** un QUIZ avec `inventoryHints: [{event: "ITEM_SELECTED", itemId: "loupe", hint: "Regarde le coin supérieur droit."}]`, Nœud ACTIVE
- **WHEN** le joueur sélectionne `loupe` dans la boîte à outils
- **THEN** l'indice s'affiche dans le quiz, le Nœud reste ACTIVE, aucun event de progression n'est émis

#### Scenario: Abonnement large
- **GIVEN** un PUZZLE avec `inventoryHints: [{event: "ITEM_USED", hint: "Bien utilisé, continue."}]`
- **WHEN** le joueur utilise n'importe quel objet pendant le Nœud ACTIVE
- **THEN** l'indice s'affiche

#### Scenario: Référence orpheline rejetée
- **GIVEN** un `inventoryHints` avec `itemId: "objet_inexistant"` et aucun objet de cet `id` dans le jeu
- **WHEN** la validation applicative tourne
- **THEN** le jeu est rejeté avec l'objet fautif nommé
