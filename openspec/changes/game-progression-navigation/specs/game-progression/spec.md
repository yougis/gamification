## Purpose

Permet de définir comment le joueur progresse dans le jeu, comment les étapes deviennent connues (discovery), quelles conditions d'activation s'appliquent, et quels effets produisent les actions du joueur. Cette séparation des responsabilités est fondamentale pour supporter différents modèles de navigation sans imposer de paradigme unique.

## ADDED Requirements

### Requirement: Progression fonctionnelle

Le moteur SHALL supporter des relations de progression entre les étapes du jeu. La progression décrit comment les étapes sont reliées et comment leur réalisation permet de poursuivre le jeu.

Le graphe de progression doit pouvoir représenter :
- une séquence linéaire (A → B → C) ;
- des branches (un nœud menant à plusieurs choix) ;
- des étapes disponibles simultanément (fan-out) ;
- des dépendances entre étapes ;
- des parcours optionnels ;
- des étapes finales (`isEnding`) ;
- des étapes non directement accessibles au départ.

#### Scenario: Progression linéaire
- **GIVEN** un jeu avec les nœuds A, B, C en séquence linéaire
- **WHEN** A est COMPLETED
- **THEN** B devient UNLOCKED

#### Scenario: Progression branchée
- **GIVEN** un jeu avec A menant à B et C simultanément
- **WHEN** A est COMPLETED
- **THEN** B et C deviennent UNLOCKED simultanément

#### Scenario: Progression libre
- **GIVEN** un jeu en mode OPEN EXPLORATION avec 4 POI
- **WHEN** le joueur lance la session
- **THEN** les 4 POI sont UNLOCKED simultanément (sauf verrous conditionnels)

### Requirement: Discovery indépendante de l'activation

La découverte décrit comment le joueur apprend qu'une étape existe et/ou devient accessible dans son interface. Elle SHALL être indépendante de l'activation.

Une étape peut passer par les états :
```
non visible → découverte → visible → activable
```

Le système SHALL supporter au minimum ces modes de discovery :
- `VISIBLE_NOW` : l'étape est visible dès le début
- `MAP` : l'étape est affichée sur la carte
- `ON_COMPLETED` : l'étape est révélée après la complétion d'une autre étape
- `ON_CLUE` : l'étape est révélée par un indice
- `ON_ITEM` : l'étape est révélée par l'obtention d'un objet
- `ON_PUZZLE` : l'étape est révélée après résolution d'une énigme
- `ON_PROXIMITY` : l'étape est révélée par proximite physique
- `ON_TIME` : l'étape est révélée à une date ou heure donnée

#### Scenario: Discovery par complétion
- **GIVEN** une étape B avec `discovery: {mode: ON_COMPLETED, sourceNode: A}`
- **WHEN** A est COMPLETED
- **THEN** B devient découverte (visible) pour le joueur

#### Scenario: Discovery par indice
- **GIVEN** une étape C avec `discovery: {mode: ON_CLUE, clueId: "indice_1"}`
- **WHEN** le joueur obtient l'indice "indice_1"
- **THEN** C devient visible dans l'interface

#### Scenario: Discovery par proximité physique
- **GIVEN** une étape D avec `discovery: {mode: ON_PROXIMITY, lat, lng, radiusMeters}`
- **WHEN** le joueur s'approche à moins de radiusMeters
- **THEN** D devient visible sur la carte

### Requirement: Activation conditionnelle étendue

Le moteur SHALL supporter des conditions d'activation au-delà des conditions géographiques existantes. Les conditions existantes (GEOFENCE, NODE_COMPLETED, TIMER, POOL_DRAWN, PROXIMITY_MASTER, CONDITIONAL, WINDOW) restent utilisables.

De nouveaux types de conditions fonctionnelles SHALL être supportés :
- `ITEM_REQUIRED` : un objet spécifique doit être dans l'inventaire du joueur
- `ITEM_USED` : un objet spécifique doit avoir été utilisé
- `CODE_INPUT` : un code doit avoir été saisi par le joueur
- `CLUE_RESOLVED` : une énigme ou indice doit avoir été résolu

Les conditions SHALL pouvoir être combinées avec les opérateurs `AND` / `OR` existants.

#### Scenario: Condition combinée GPS + objet
- **GIVEN** un nœud avec `activation: {requires: [{type: GEOFENCE, lat, lng, radiusMeters}, {type: ITEM_REQUIRED, itemId: "cle"}], operator: AND}`
- **WHEN** le joueur est dans le rayon géofence ET possède la clé
- **THEN** le nœud devient UNLOCKED

#### Scenario: Condition ITEM_REQUIRED seule
- **GIVEN** un nœud avec `activation: {requires: [{type: ITEM_REQUIRED, itemId: "code"}]}`
- **WHEN** le joueur possède le code dans son inventaire
- **THEN** le nœud devient UNLOCKED (sans nécessité de GPS)

### Requirement: Effects sur la complétion d'une étape

Le moteur SHALL permettre à une étape de produire des changements dans l'état du jeu lorsqu'elle est complétée ou lorsqu'une action particulière est réalisée.

Les effets SHALL inclure :
- `GIVE_ITEM` : donner un objet à l'inventaire du joueur
- `REMOVE_ITEM` : retirer un objet de l'inventaire du joueur
- `REVEAL_NODE` : rendre une étape découverte/visible
- `HIDE_NODE` : masquer une étape
- `UNLOCK_NODE` : débloquer une étape (passer de LOCKED à UNLOCKED)
- `MODIFY_VARIABLE` : modifier une variable du jeu
- `MODIFY_SCORE` : modifier le score du joueur
- `TRIGGER_EVENT` : déclencher un événement
- `MODIFY_STATE` : modifier un état du jeu

Les effets peuvent être chaînés : un effet peut en déclencher d'autres.

#### Scenario: Effet chaîne — coffre
- **GIVEN** l'étape "ouvrir le coffre" avec effects : `[{type: REMOVE_ITEM, itemId: "cle"}, {type: GIVE_ITEM, itemId: "lampe UV"}, {type: REVEAL_NODE, nodeId: "message_secret"}]`
- **WHEN** le joueur complete l'étape "ouvrir le coffre"
- **THEN** la clé est retirée, la lampe UV est donnée, et le nœud "message_secret" est révélé

#### Scenario: Effet modification de variable
- **GIVEN** l'étape "trouver le journal" avec effects : `[{type: MODIFY_VARIABLE, variableId: "hasJournal", value: true}]`
- **WHEN** le joueur complete l'étape
- **THEN** la variable `hasJournal` passe à true

### Requirement: Inventaire / boîte à outils

Le moteur SHALL fournir un système d'inventaire pour les objets, outils, indices ou ressources du joueur.

Un objet SHALL avoir au minimum :
- `id` (identifiant unique dans le jeu)
- `name` (nom affiché)
- `icon` (optionnel, représentation visuelle)
- `description` (optionnel)
- `consumable` (booléen, défaut `false`)

Un objet peut :
- être obtenu (via un effet GIVE_ITEM)
- être affiché dans l'interface
- être utilisé (via une condition ITEM_USED)
- être consommé (si consumable = true, retiré après utilisation)
- être conservé (si consumable = false, reste dans l'inventaire)
- être requis pour activer une étape (condition ITEM_REQUIRED)

L'inventaire est optionnel : les jeux BASIC ne doivent pas être obligés de l'utiliser.

#### Scenario: Objet obtenu et affiché
- **GIVEN** un jeu où l'étape "trouver la clé" produit l'effet `GIVE_ITEM {id: "cle", name: "Clé", consumable: false}`
- **WHEN** le joueur complète l'étape
- **THEN** la clé apparaît dans la boîte à outils du joueur

#### Scenario: Objet consommé
- **GIVEN** un jeu où le joueur utilise la clé pour ouvrir un coffre (consumable: true)
- **WHEN** le joueur active l'étape "coffre" avec ITEM_REQUIRED("cle")
- **THEN** la clé est consommée et retirée de l'inventaire

### Requirement: État du jeu (Game State)

Le moteur SHALL maintenir un état du jeu persistant incluant :
- la progression actuelle (nœuds visités, en cours, complétés)
- l'inventaire du joueur
- les variables du jeu
- les découvertes effectuées
- la session en cours

Cet état SHALL persister en SQLite avec écriture immédiate pour permettre la reprise.

#### Scenario: Reprise après kill avec inventaire
- **GIVEN** une partie avec 2 objets dans l'inventaire et 3 nœuds complétés
- **WHEN** l'application est tuée puis relancée avec le même `sessionId`
- **THEN** l'inventaire et la progression sont restaurés, aucun re-tirage

### Requirement: Séparation des responsabilités

La découverte, l'activation, la progression et la présentation SHALL être conceptuellement indépendantes.

- Une étape visible n'est pas nécessairement activable
- Une étape activable n'est pas nécessairement active
- La manière dont une étape est affichée ne SHALL pas déterminer la logique fonctionnelle de son activation
- La navigation ne SHALL pas imposer un nouveau cycle d'état spécifique à chaque modèle de jeu

Le cycle fonctionnel de référence reste `LOCKED → UNLOCKED → ACTIVE → COMPLETED`.

#### Scenario: Game narratif — activation automatique
- **GIVEN** un jeu narratif où UNLOCKED → ACTIVE est automatique
- **WHEN** le joueur complète l'étape précédente
- **THEN** la prochaine étape devient ACTIVE sans action physique du joueur

#### Scenario: Escape game — activation par objet
- **GIVEN** un escape game où UNLOCKED → ACTIVE nécessite ITEM_USED
- **WHEN** le joueur utilise le bon objet sur le nœud
- **THEN** le nœud devient ACTIVE

### Requirement: Compatibilité avec les jeux existants

Un jeu BASIC existant basé sur `TIMER → POOL_DRAWN → GEOFENCE → NODE_COMPLETED` SHALL continuer à fonctionner sans modification fonctionnelle. Les nouvelles propriétés (discovery, effects, inventory) sont optionnelles et n'affectent pas les jeux qui ne les utilisent pas.

#### Scenario: Jeu BASIC existant inchangé
- **GIVEN** le fichier `game-5poi.json` existant sans propriétés discovery/effects/inventory
- **WHEN** le moteur charge le jeu
- **THEN** tous les nœuds fonctionnent comme avant (GEOFENCE → ACTIVE → COMPLETED)

#### Scenario: Jeu existant avec discovery par défaut
- **GIVEN** un jeu existant sans configuration `discovery` sur les nœuds
- **WHEN** le moteur charge le jeu
- **THEN** tous les nœuds ont `discovery: {mode: VISIBLE_NOW}` par défaut
