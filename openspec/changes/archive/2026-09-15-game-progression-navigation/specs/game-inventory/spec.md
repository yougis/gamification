## Purpose

Définit le système d'inventaire pour les objets, outils et indices du joueur dans le moteur GeoPlay. L'inventaire est optionnel et permet aux jeux de type escape game, chasse au trésor ou tout jeu hybride de fonctionner avec des objets collectés, utilisés et consommés.

## ADDED Requirements

### Requirement: Objet du jeu

Chaque objet dans l'inventaire SHALL être défini dans le JSON du jeu avec les propriétés suivantes :
- `id` (string unique dans le jeu)
- `name` (string, nom affiché au joueur)
- `icon` (string optionnel, référence à un asset visuel)
- `description` (string optionnel)
- `consumable` (booléen, défaut `false`)
- `stackable` (booléen, défaut `true`)

La définition de l'objet SHALL être lue depuis le JSON du jeu, jamais codée en dur.

#### Scenario: Définition d'objet dans le JSON
- **GIVEN** un jeu avec un objet défini dans le JSON
- **WHEN** le moteur charge le jeu
- **THEN** l'objet est disponible dans le registre de l'inventaire

### Requirement: Inventaire du joueur

Le moteur SHALL maintenir un inventaire par joueur/session contenant les objets obtenus.

L'inventaire SHALL persister en SQLite avec écriture immédiate. Reprendre = même `sessionId` relit l'inventaire. Nouvelle partie = nouveau `sessionId` avec inventaire vide.

#### Scenario: Reprise après kill avec inventaire
- **GIVEN** une partie avec 3 objets dans l'inventaire
- **WHEN** l'application est tuée puis relancée avec le même `sessionId`
- **THEN** les 3 objets sont restaurés dans l'inventaire

### Requirement: Obtention d'objet (GIVE_ITEM)

Une étape SHALL pouvoir produire l'effet `GIVE_ITEM` pour ajouter un objet à l'inventaire du joueur.

Le moteur SHALL placer l'objet dans la boîte à outils du joueur et rendre l'objet disponible pour l'activation d'autres étapes.

#### Scenario: Obtention d'un objet
- **GIVEN** l'étape "trouver la clé" avec effect `GIVE_ITEM {id: "cle", name: "Clé"}`
- **WHEN** le joueur complète l'étape
- **THEN** la clé est ajoutée à l'inventaire du joueur

### Requirement: Utilisation d'objet (ITEM_USED)

Le moteur SHALL supporter la condition `ITEM_USED` pour activer une étape. L'utilisation d'un objet peut le consommer (si `consumable: true`) ou le conserver (si `consumable: false`).

#### Scenario: Objet consommé
- **GIVEN** un objet `cle` avec `consumable: true`
- **WHEN** le joueur utilise la clé pour déverrouiller un nœud
- **THEN** la clé est retirée de l'inventaire

#### Scenario: Objet conservé
- **GIVEN** un objet `loupe` avec `consumable: false`
- **WHEN** le joueur utilise la loupe pour un indice
- **THEN** la loupe reste dans l'inventaire

### Requirement: Condition d'activation ITEM_REQUIRED

Une étape MAY nécessiter la présence d'un objet dans l'inventaire via la condition `ITEM_REQUIRED`. Le moteur SHALL empêcher l'activation de l'étape si le joueur ne possède pas l'objet requis.

#### Scenario: Activation sans objet requise
- **GIVEN** un nœud avec `activation: {requires: [{type: ITEM_REQUIRED, itemId: "cle"}]}`
- **WHEN** le joueur n'a pas la clé
- **THEN** le nœud reste LOCKED, même si le joueur est au bon endroit GPS

#### Scenario: Activation avec objet requise
- **GIVEN** un nœud avec `activation: {requires: [{type: ITEM_REQUIRED, itemId: "cle"}]}`
- **WHEN** le joueur possède la clé ET est dans le rayon géofence
- **THEN** le nœud devient UNLOCKED

### Requirement: Boîte à outils (Toolbox) dans le Player

Le Player SHALL afficher une boîte à outils lorsque le jeu le requiert. La boîte à outils SHALL lister les objets obtenus avec leur icône et nom.

Le joueur SHALL pouvoir :
- voir les objets dans la boîte à outils
- sélectionner un objet pour l'utiliser
- voir les objets consommés (historique si nécessaire)

La boîte à outils peut être combinée avec d'autres présentations (MAP, CLUE, etc.).

#### Scenario: Boîte à outils affichée
- **GIVEN** un jeu ESCAPE_GAME avec `presentation: ["TOOLBOX", "CLUE"]`
- **WHEN** le joueur ouvre le jeu
- **THEN** la boîte à outils est affichée à côté des indices

### Requirement: Inventaire optionnel

Les jeux BASIC ne doivent pas être obligés d'utiliser un inventaire. Si aucun objet n'est défini dans le JSON du jeu, l'inventaire est inactif.

Le validateur applicatif SHALL vérifier que tout `ITEM_REQUIRED` ou `ITEM_USED` fait référence à un objet défini dans le JSON du jeu.

#### Scenario: Jeu BASIC sans inventaire
- **GIVEN** un jeu BASIC sans aucun objet défini
- **WHEN** le moteur charge le jeu
- **THEN** l'inventaire est vide et inactif, le jeu fonctionne normalement

### Requirement: Effets liés à l'inventaire

La complétion d'une étape SHALL pouvoir produire des effets liés à l'inventaire :
- `GIVE_ITEM` : ajouter un objet
- `REMOVE_ITEM` : retirer un objet
- `MODIFY_SCORE` : modifier le score

Le moteur SHALL appliquer ces effets indépendamment de l'interface utilisée par le joueur.

#### Scenario: Effet retrait d'objet
- **GIVEN** l'étape "utiliser la lampe" avec effect `REMOVE_ITEM {itemId: "lampe UV"}`
- **WHEN** le joueur complète l'étape
- **THEN** la lampe UV est retirée de l'inventaire

### Requirement: Objets combinés dans les conditions

Les conditions d'activation SHALL pouvoir combiner des vérifications d'inventaire avec d'autres conditions (GEOFENCE, NODE_COMPLETED, TIMER, etc.) via les opérateurs `AND` / `OR`.

Le moteur SHALL évaluer toutes les conditions simultanément.

#### Scenario: Condition combinée GPS + objet + étape précédente
- **GIVEN** un nœud avec `activation: {requires: [{type: GEOFENCE, lat, lng, radiusMeters}, {type: ITEM_REQUIRED, itemId: "code"}, {type: NODE_COMPLETED, nodeId: "préparatoire"}], operator: AND}`
- **WHEN** les trois conditions sont remplies
- **THEN** le nœud devient UNLOCKED

### Requirement: Persistance et reprise

L'inventaire SHALL persister en SQLite avec le reste de la progression. Le `sessionId` est la clé de reprise. Un nouveau `sessionId` démarre avec un inventaire vide.

L'inventaire ne SHALL jamais être recalculé. Il est lu depuis SQLite à la reprise.

#### Scenario: Reprise exacte de l'inventaire
- **GIVEN** une partie avec inventaire `{cle, lampe UV}` et `sessionId: "abc123"`
- **WHEN** l'application est relancée avec `sessionId: "abc123"`
- **THEN** l'inventaire `{cle, lampe UV}` est restauré

#### Scenario: Nouvelle partie = inventaire vide
- **GIVEN** une partie terminée avec `sessionId: "abc123"`
- **WHEN** le joueur commence une nouvelle partie avec `sessionId: "def456"`
- **THEN** l'inventaire est vide
