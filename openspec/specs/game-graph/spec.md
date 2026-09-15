## Purpose
Extension du graphe de jeu pour supporter les nouvelles couches de progression, discovery, effects et inventaire sans casser les jeux existants.

## Requirements

### Requirement: Objet Noeud complet

Chaque Nœud SHALL porter les champs existants (id, module, activation, latch, onReentry, maxReentries, scoreOnReplay, isEnding, randomPool) AINSI QUE les champs optionnels suivants pour la nouvelle couche fonctionnelle :

- `discovery` (optionnel) : `{mode, sourceNode?, clueId?, lat?, lng?, radiusMeters?}` définissant comment l'étape devient connue
- `effects` (optionnel) : tableau d'effets produits à la complétion
- `inventoryRef` (optionnel) : référence aux objets liés à ce nœud (donnés, requis)

Les champs `discovery`, `effects` et `inventoryRef` sont optionnels et n'affectent pas les jeux existants qui ne les utilisent pas.

#### Scenario: Nœud BASIC existant inchangé
- **GIVEN** un nœud sans `discovery`, `effects`, `inventoryRef`
- **WHEN** le moteur charge le jeu
- **THEN** le nœud fonctionne comme avant (VISIBLE_NOW par défaut, aucun effet, pas d'inventaire)

#### Scenario: Nœud avec discovery et effects
- **GIVEN** un nœud avec `discovery: {mode: ON_COMPLETED, sourceNode: "a"}` et `effects: [{type: GIVE_ITEM, itemId: "clé"}]`
- **WHEN** le nœud "a" est COMPLETED
- **THEN** le nœud courant devient visible, et la clé est donnée au joueur

### Requirement: Operateur strict en if/then

`operator` SHALL être requis si `requires` a >=2 éléments et interdit si <=1, exprimé en `if/then` Draft-07 pur. `operator` SHALL valoir `AND|OR`.

#### Scenario: Double prérequis sans operateur
- **GIVEN** un Nœud à 2 conditions et aucun `operator`
- **WHEN** le validateur controle le Jeu
- **THEN** le Jeu est rejeté avec une erreur operateur manquant

#### Scenario: Fan-in OU débloque sur une branche
- **GIVEN** un Noeud `FIN` avec `operator: OR` sur `A COMPLETED` et `B COMPLETED`
- **WHEN** `A` passe `COMPLETED` seul
- **THEN** `FIN` devient `UNLOCKED`

### Requirement: Machine a etats avec latch et file ACTIVE

Le système SHALL implementer `LOCKED -> UNLOCKED -> ACTIVE -> COMPLETED`. `UNLOCKED` signifie eligible, `ACTIVE` signifie presente au joueur, avec une seule modale `ACTIVE` a la fois et une file d'attente.

#### Scenario: Latch conserve l'eligibilite hors zone
- **GIVEN** un POI `latch:true` devenu `UNLOCKED` en geofence
- **WHEN** le joueur sort du rayon avant d'ouvrir la modale
- **THEN** le Noeud reste `UNLOCKED` et presentable

#### Scenario: Suivi desactive hors zone
- **GIVEN** un POI `latch:false` devenu `UNLOCKED` en geofence
- **WHEN** le joueur sort du rayon avec hysteresis depassee
- **THEN** le Noeud retourne `LOCKED` et sort de la file d'attente

#### Scenario: Modale ouverte survit a la sortie
- **GIVEN** un Quiz `ACTIVE` (modale ouverte)
- **WHEN** le joueur recule de 3 m et sort du rayon
- **THEN** la modale reste ouverte jusqu'a abandon ou completion

#### Scenario: Concurrence sans empilement
- **GIVEN** un Quiz `ACTIVE` et un second geofence qui devient vrai
- **WHEN** le moteur evalue les activations
- **THEN** le second Noeud reste en file `UNLOCKED` sans ouvrir de seconde modale

### Requirement: Cycles bornes et rejeu anti-farming

`allowCycle` est une propriete d'arete (condition a `nodeId`), defaut `false`, verifiee a la construction. `onReentry` est une propriete de noeud (`ignore` defaut | `replay`), verifiee a chaque execution. `replay` SHALL exiger `maxReentries` (nombre de rejeux apres la 1ere completion) et `scoreOnReplay` (defaut false : seule la 1ere completion score). Une fois `maxReentries` epuise, tout retrigger retombe en `ignore`.

Le graphe de progression SHALL pouvoir représenter des relations de progression au-delà des simples dépendances d'activation. Les arêtes de progression peuvent être conditionnelles (dépendant d'objets, de variables, de découverte).

#### Scenario: Cycle logique non autorise rejete
- **GIVEN** `A requires B` et `B requires A`, tous deux `allowCycle:false`
- **WHEN** le validateur construit le graphe de dependances
- **THEN** le build est refuse (aucun des deux ne pourrait demarrer)

#### Scenario: Boucle gamebook bornee type Salle du Sage
- **GIVEN** `sage onReentry:replay maxReentries:3 scoreOnReplay:false` et une arete retour `enigme -> sage allowCycle:true`
- **WHEN** le joueur echoue 4 fois et revient une 4e fois
- **THEN** les 3 premiers retours rejouent sans scorer et le 4e est ignore

#### Scenario: Rejeu physique pur sans allowCycle
- **GIVEN** un POI `GEOFENCE` seul sans `nodeId` reference, `onReentry:ignore`
- **WHEN** le joueur quitte puis re-rentre apres `COMPLETED`
- **THEN** la modale ne se rouvre jamais

#### Scenario: Progression conditionnelle par objet
- **GIVEN** un nœud "C" dépendant de l'obtention de la clé via progression
- **WHEN** le joueur obtient la clé
- **THEN** le nœud "C" devient accessible dans la progression

### Requirement: Terminaison explicite avec isEnding

Le Jeu SHALL contenir au moins un Noeud `isEnding:true` et est termine exactement quand un `isEnding` passe `COMPLETED`, jamais par absence de noeuds activables. Le validateur SHALL verifier l'atteignabilite d'au moins un `isEnding` depuis le depart sous hypothese explicite d'environnement favorable. `RANDOM_POOL` et `operator:OR` comptent comme chemins alternatifs. Chaque candidat de pool SHALL individuellement atteindre un `isEnding`.

La terminaison peut désormais être déclenchée par des effets (révélation d'un nœud isEnding) en plus de l'achèvement de tous les candidats.

#### Scenario: Reference 5 POI valide
- **GIVEN** START -> POOL (1/5 parmi A|B|C|D|E, GEOFENCE si tire) -> FIN `isEnding`
- **WHEN** le validateur controle chaque candidat A..E vers FIN
- **THEN** le Jeu est accepte car les 5 chemins existent

#### Scenario: AND sur branches exclusives direct rejete
- **GIVEN** `FIN operator:AND` sur `A COMPLETED` et `B COMPLETED`, A et B candidats distincts d'un meme pool `drawCount:1`
- **WHEN** le validateur controle la terminaison
- **THEN** le Jeu est rejete comme structurellement inatteignable (cas direct)

#### Scenario: Fin révélée par effet
- **GIVEN** un escape game où la complétion de "énigme finale" produit `REVEAL_NODE {nodeId: "fin"}`
- **WHEN** l'énigme est résolue
- **THEN** le nœud "fin" est révélé et devient accessible

### Requirement: Découverte par défaut

Si un nœud ne définit pas de `discovery`, le moteur SHALL appliquer `discovery: {mode: VISIBLE_NOW}` par défaut pour maintenir la compatibilité avec les jeux existants.

#### Scenario: Découverte par défaut pour jeu existant
- **GIVEN** un jeu existant sans configuration `discovery` sur les nœuds
- **WHEN** le moteur charge le jeu
- **THEN** tous les nœuds ont `discovery: {mode: VISIBLE_NOW}` par défaut

### Requirement: Propriétés de progression optionnelles

Un nœud SHALL pouvoir définir `progression` pour déclarer explicitement ses relations de progression au-delà de l'activation :
- `nextNodes` : liste des nœuds directement accessibles après complétion
- `conditions` : conditions de déblocage de ces nœuds suivants

Si `progression` est absent, le moteur déduit la progression de l'activation existante (NODE_COMPLETED).

Le moteur SHALL évaluer les conditions de progression avant de débloquer les nœuds suivants.

#### Scenario: Progression explicite avec conditions
- **GIVEN** un nœud avec `progression: {nextNodes: ["B"], conditions: [{type: ITEM_REQUIRED, itemId: "clé"}]}`
- **WHEN** le joueur possède la clé
- **THEN** le nœud B est débloqué dans la progression
