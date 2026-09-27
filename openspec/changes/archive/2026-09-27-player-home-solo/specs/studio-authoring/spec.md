## MODIFIED Requirements

### Requirement: Suppression de noeud

Le Studio SHALL fournir un bouton de suppression dans l'Inspecteur et la NodeList pour chaque noeud. La suppression SHALL retirer le noeud du JSON et toutes les aretes (conditions `NODE_COMPLETED`, `POOL_DRAWN`, effects `REVEAL_NODE`/`UNLOCK_NODE`) qui le referencent en tant que source ou cible.

Si le noeud est reference par d'autres noeuds (conditions, effects, progression), une confirmation SHALL lister les noeuds impactes avant toute suppression.

Un noeud ne peut pas etre supprime s'il est le seul noeud `isEnding:true` du jeu (le validateur rejetterait le jeu) — sauf cas HOME-seul : quand `HOME` figure dans `global.presentation`, la suppression du dernier nœud est autorisée après confirmation rappelant que sans `HOME` le jeu vide serait invalide.

#### Scenario: Suppression simple
- **GIVEN** un jeu avec 3 noeuds dont un noeud `etape-2` sans reference depuis d'autres noeuds
- **WHEN** l'auteur clique sur supprimer `etape-2` et confirme
- **THEN** le noeud est retire du JSON, les 2 autres noeuds restent inchanges, le canvas se met a jour

#### Scenario: Suppression avec references
- **GIVEN** un jeu avec 3 noeuds dont `etape-1` reference par une condition `NODE_COMPLETED` du noeud `etape-2`
- **WHEN** l'auteur demande la suppression de `etape-1`
- **THEN** une confirmation affiche "Ce noeud est reference par etape-2 (condition NODE_COMPLETED). Supprimer ?" avant toute action

#### Scenario: Suppression du dernier isEnding
- **GIVEN** un jeu avec 2 noeuds dont un seul `isEnding: true` (noeud `fin`)
- **WHEN** l'auteur demande la suppression de `fin`
- **THEN** la suppression est refusee avec le message "Impossible de supprimer le seul noeud de fin du jeu"

#### Scenario: Suppression du dernier nœud sous HOME
- **GIVEN** un jeu avec `global.presentation: ["HOME"]` et un seul nœud restant
- **WHEN** l'auteur demande sa suppression et confirme le rappel
- **THEN** le nœud est retiré (`nodes: []` valide sous HOME), le canvas affiche le graphe vide avec l'aide à la création

### Requirement: Entrée MODE JEUX depuis le premier nœud

Lancer le terminal joueur (« ▶ Mode Jeux ») sans nœud actif SHALL ouvrir le premier nœud éligible du jeu (tête de file de la simulation) au lieu de la salle d'attente. Si aucun nœud n'est éligible, la salle d'attente existante SHALL s'afficher (comportement inchangé). L'enchaînement suivant (effectuer les modules, compléter, ouvrir le suivant) SHALL rester piloté par la file existante, sans transition d'état ajoutée. Quand `HOME` est présent, le lancement est possible même sans file ni actif : le terminal s'ouvre sur le tableau de bord.

#### Scenario: Lancement depuis le début

- **GIVEN** une simulation neuve dont la file propose `baker` en premier
- **WHEN** l'auteur lance « ▶ Mode Jeux » sans nœud actif
- **THEN** le terminal affiche directement l'écran de `baker`, prêt à jouer

#### Scenario: File vide inchangée

- **GIVEN** une simulation sans nœud éligible
- **WHEN** l'auteur lance « ▶ Mode Jeux »
- **THEN** la salle d'attente s'affiche comme aujourd'hui

#### Scenario: Lancement HOME sans file

- **GIVEN** un jeu avec `presentation: ["HOME"]`, sans nœud actif ni file
- **WHEN** l'auteur lance « ▶ Mode Jeux »
- **THEN** le terminal affiche le tableau de bord (pas la salle d'attente)
