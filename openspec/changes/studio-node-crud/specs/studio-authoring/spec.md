## ADDED Requirements

### Requirement: Suppression de noeud

Le Studio SHALL fournir un bouton de suppression dans l'Inspecteur et la NodeList pour chaque noeud. La suppression SHALL retirer le noeud du JSON et toutes les aretes (conditions `NODE_COMPLETED`, `POOL_DRAWN`, effects `REVEAL_NODE`/`UNLOCK_NODE`) qui le referencent en tant que source ou cible.

Si le noeud est reference par d'autres noeuds (conditions, effects, progression), une confirmation SHALL lister les noeuds impactes avant toute suppression.

Un noeud ne peut pas etre supprime s'il est le seul noeud `isEnding:true` du jeu (le validateur rejetterait le jeu).

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

### Requirement: Renommage de noeud

Le Studio SHALL fournir un champ ID editable dans l'Inspecteur pour chaque noeud. Le renommage SHALL mettre a jour toutes les references au noeud dans le jeu : conditions `NODE_COMPLETED`, `POOL_DRAWN`, `anchorNodeId` de TIMER, effects `REVEAL_NODE`/`UNLOCK_NODE`, `sourceNode` de discovery, et tout autre champ referencant le nodeId.

Le validateur SHALL rejeter un ID duplique (unicite preservee). L'ID ne peut pas etre vide.

#### Scenario: Renommage avec propagation

- **GIVEN** un noeud `etape-1` reference par une condition `NODE_COMPLETED` dans `etape-2`
- **WHEN** l'auteur renomme `etape-1` en `chateau-louis-xiv`
- **THEN** la condition dans `etape-2` pointe desormais vers `chateau-louis-xiv`, le JSON est coherent

#### Scenario: Renommage vers ID existant

- **GIVEN** un noeud `etape-1` et un noeud `etape-2`
- **WHEN** l'auteur tente de renommer `etape-1` en `etape-2`
- **THEN** le renommage est refuse avec le message "Cet ID est deja utilise"

### Requirement: Duplication de noeud

Le Studio SHALL fournir un bouton de duplication dans l'Inspecteur et la NodeList. La duplication SHALL creer une copie du noeud avec un ID genere (suffixe `-copy` ou increment numerique), en conservant toutes ses proprietes (module, activation, latch, discovery, effects, inventoryRef).

Le noeud duplique SHALL etre place a cote du noeud source sur le canvas (position legèrement decalée). Seules les aretes entrantes/sortantes du noeud source ne sont PAS dupliquees (le noeud copie est isolé par defaut).

#### Scenario: Duplication d'un noeud

- **GIVEN** un noeud `chateau-1` avec un module QUIZ et 2 conditions
- **WHEN** l'auteur clique sur dupliquer
- **THEN** un nouveau noeud `chateau-1-copy` est cree avec le meme module et les memes conditions, positionne a cote sur le canvas

### Requirement: Noeud START par defaut dans un jeu nouveau

Un jeu cree via `jeuVide()` (nouveau jeu vierge) SHALL contenir par defaut un noeud `start` de type `INFO` avec `isEnding: false` et une activation vide. Ce noeud sert de point de depart pour l'auteur et garantit que le canvas n'est jamais vide a l'ouverture.

Le noeud `start` ne peut pas etre supprime tant qu'il est le seul noeud du jeu (meme logique que `isEnding` : un jeu sans noeud est inutilisable).

#### Scenario: Nouveau jeu avec noeud start

- **GIVEN** un auteur qui cree un nouveau jeu
- **WHEN** le jeu est initialise
- **THEN** le canvas contient un noeud `start` (type INFO) positionne au centre, et l'auteur peut commencer a le configurer

#### Scenario: Jeu importe sans noeud start

- **GIVEN** un fichier JSON importe sans aucun noeud
- **WHEN** l'import est charge dans le Studio
- **THEN** un noeud `start` est ajoute automatiquement (comportement identique a `jeuVide()`)

### Requirement: Detection de references orphelines

Le validateur applicatif (couche 2) SHALL detecter les references a des nodeId inexistants dans le jeu : conditions `NODE_COMPLETED`, `POOL_DRAWN`, `anchorNodeId` de TIMER, effects `REVEAL_NODE`/`UNLOCK_NODE`, `sourceNode` de discovery, `candidates` de RANDOM_POOL, et tout autre champ referencant un nodeId absent de `game.nodes`.

Chaque reference orpheline SHALL produire une erreur C2 dans la categorie "references", avec le nodeId source et le champ fautif identifies.

#### Scenario: Reference orpheline apres suppression

- **GIVEN** un jeu ou le noeud `etape-2` a ete supprime mais `etape-1` contient encore une condition `NODE_COMPLETED` vers `etape-2`
- **WHEN** le validateur tourne
- **THEN** le jeu est rejete avec l'erreur C2 : "Reference orpheline : etape-1.condition[0] pointe vers etape-2 (inexistant)"
