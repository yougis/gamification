## ADDED Requirements

### Requirement: Case d'accès inventaire par nœud

La famille 8 « Inventaire » de l'Inspecteur de nœud SHALL exposer une case à cocher « Accès inventaire sur cet écran », cochée quand `node.inventoryAccess` est absent ou `true`, décochée quand il vaut `false`. Changer la case SHALL poser ou retirer le champ via l'opération nommée existante (un pas d'undo). Quand le jeu n'a aucun objet ou que `presentation` n'inclut pas `TOOLBOX`, la famille SHALL afficher un rappel non bloquant (« sans effet : jeu sans inventaire ») sans empêcher l'édition — seul l'écran Valider bloque.

#### Scenario: Masquer l'inventaire sur une épreuve
- **GIVEN** un nœud avec `inventoryAccess` absent, famille Inventaire ouverte
- **WHEN** l'auteur décoche la case
- **THEN** le JSON porte `inventoryAccess: false`, undo le retire, et le rappel de la règle triple reste visible

#### Scenario: Rappel sans inventaire
- **GIVEN** un jeu BASIC sans objet
- **WHEN** l'auteur ouvre la famille Inventaire d'un nœud
- **THEN** le rappel « sans effet : jeu sans inventaire » s'affiche et la case reste éditable
