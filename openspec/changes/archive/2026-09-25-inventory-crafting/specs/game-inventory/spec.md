## ADDED Requirements

### Requirement: Recettes de combinaison productives

Le jeu MAY définir `recipes: [{ id, inputs: [{ itemId, consume }], output }]` où `inputs` liste les objets requis (n >= 2 pour une combinaison ; une entrée seule relève de `ITEM_USED`, jamais d'une recette), `consume` indique si l'entrée est retirée (`true`) ou conservée (`false`), et `output` est l'objet produit. Quand le joueur réunit les entrées et confirme, le moteur SHALL appliquer atomiquement : retrait des entrées consommées, ajout de la sortie via le circuit `GIVE_ITEM`, journalisation de `ITEM_COMBINED`. Si une entrée manque au moment de confirmer, rien SHALL se produire (tout ou rien, pas d'état intermédiaire).

#### Scenario: Combinaison avec destruction
- **GIVEN** la recette `poudre + lettre → message` (`consume: true` pour les deux) et un inventaire `{poudre, lettre}`
- **WHEN** le joueur confirme la combinaison
- **THEN** poudre et lettre sont retirées, `message` est ajouté, `ITEM_COMBINED` est journalisé

#### Scenario: Combinaison avec outil conservé
- **GIVEN** la recette `loupe + carte → carte-annotée` (`consume: false` pour `loupe`) et un inventaire `{loupe, carte}`
- **WHEN** le joueur confirme
- **THEN** `loupe` reste, `carte` est retirée, `carte-annotée` est ajoutée

#### Scenario: Entrée manquante
- **GIVEN** la même recette et un inventaire `{loupe}` seul
- **WHEN** le joueur tente de combiner
- **THEN** la recette n'est pas proposée et aucun état ne change
