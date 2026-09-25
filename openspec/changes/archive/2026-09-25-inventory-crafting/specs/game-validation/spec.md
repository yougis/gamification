## ADDED Requirements

### Requirement: Validation applicative des recettes

Le validateur applicatif SHALL vérifier chaque recette : tout `itemId` d'entrée et `output` SHALL exister dans `objects[]` ; `inputs` SHALL compter au moins 2 entrées ; `output` SHALL NE PAS figurer parmi les entrées (rejet anti-farming immédiat) ; une entrée avec `consume: true` SHALL référencer un objet `consumable: true` (même règle que `ITEM_USED`, symétrie assumée). La détection de cycles transitifs (A→B→A) SHALL être documentée comme limite volontaire sans solveur complet, comme pour la règle AND-sur-branches-exclusives du socle.

#### Scenario: Sortie auto-produite rejetée
- **GIVEN** une recette `cle + poudre → cle`
- **WHEN** le validateur applicatif tourne
- **THEN** le jeu est rejeté (sortie parmi les entrées), nœud et recette nommés

#### Scenario: Entrée consommée non consommable rejetée
- **GIVEN** une recette consommant `loupe` (`consumable: false`)
- **WHEN** le validateur tourne
- **THEN** le jeu est rejeté avec l'objet fautif nommé

#### Scenario: Référence orpheline rejetée
- **GIVEN** une recette référençant `objet_inexistant`
- **WHEN** le validateur tourne
- **THEN** le jeu est rejeté avec la référence fautive nommée
