## Purpose
Extension des conditions d'activation du moteur GeoPlay pour supporter de nouveaux types fonctionnels liés à l'inventaire et aux énigmes.

## Requirements

### Requirement: Enum des conditions avec PROXIMITY_MASTER

`condition.type` SHALL valoir `GEOFENCE|NODE_COMPLETED|TIMER|POOL_DRAWN|PROXIMITY_MASTER|CONDITIONAL|WINDOW` comme actuellement, AINSI QUE les nouveaux types fonctionnels suivants :

- `ITEM_REQUIRED` : un objet spécifique doit être dans l'inventaire du joueur
- `ITEM_USED` : un objet spécifique doit avoir été utilisé (peut le consommer)
- `CODE_INPUT` : un code doit avoir été saisi par le joueur
- `CLUE_RESOLVED` : une énigme ou indice doit avoir été résolu

Chaque nouvelle variante SHALL imposer ses champs (`ITEM_REQUIRED`: itemId ; `ITEM_USED`: itemId, consumed ; `CODE_INPUT`: code ; `CLUE_RESOLVED`: clueId) et interdire les autres (`additionalProperties:false` par variante). `randomPool` SHALL exclure `withReplacement`.

#### Scenario: Variante contaminée rejetée
- **GIVEN** une condition `TIMER` contenant `radiusMeters`
- **WHEN** la validation Draft-07 tourne
- **THEN** elle rejette (champ étranger à la variante)

#### Scenario: ITEM_REQUIRED avec itemId valide
- **GIVEN** une condition `ITEM_REQUIRED {itemId: "cle"}`
- **WHEN** le joueur possède "cle" dans son inventaire
- **THEN** la condition est vraie

#### Scenario: ITEM_REQUIRED sans objet
- **GIVEN** une condition `ITEM_REQUIRED {itemId: "cle"}`
- **WHEN** le joueur n'a pas la clé
- **THEN** la condition est fausse

#### Scenario: CODE_INPUT avec code correct
- **GIVEN** une condition `CODE_INPUT {code: "ABC123"}`
- **WHEN** le joueur saisit "ABC123"
- **THEN** la condition est vraie

#### Scenario: CLUE_RESOLVED
- **GIVEN** une condition `CLUE_RESOLVED {clueId: "indice_1"}`
- **WHEN** le joueur a résolu l'indice "indice_1"
- **THEN** la condition est vraie

### Requirement: Fenêtre temporelle relative WINDOW

Le type réservé `WINDOW` SHALL être défini comme fenêtre sur le temps écoulé depuis
`GAME_START` (jamais d'horloge murale : offline-cohérent) : `{ apresSecondes?, avantSecondes? }`
(numbers ≥ 0, au moins un des deux requis via `anyOf`), `additionalProperties: false`.
La condition SHALL être vraie quand `elapsed >= apresSecondes` (si posé) ET `elapsed < avantSecondes`
(si posé). Comme `GEOFENCE`, `WINDOW` est révocable : à l'échéance (`elapsed >= avantSecondes`),
le nœud SHALL retomber `LOCKED` même si `latch: true`, sortir de la file d'attente, et ne peut plus
redevenir éligible par cette condition. Une modale déjà ACTIVE à l'échéance SHALL se terminer
normalement, puis le nœud retombe `LOCKED` (pas d'expulsion, pas de ré-entrée).
`WINDOW` SHALL se combiner avec les autres conditions via `operator` (`AND`/`OR`) existant.

#### Scenario: Déverrouillage à 120s

- **GIVEN** un nœud avec `activation: {requires: [{type: WINDOW, apresSecondes: 120}]}`
- **WHEN** le temps écoulé passe 120s
- **THEN** la condition devient vraie (puis le reste)

#### Scenario: Verrouillage après 600s

- **GIVEN** un nœud `latch: true` avec `activation: {requires: [{type: WINDOW, avantSecondes: 600}]}`, joueur éligible à 500s
- **WHEN** le temps écoulé passe 600s
- **THEN** le nœud retombe `LOCKED` et sort de la file

#### Scenario: Fenêtre sans borne rejetée en couche 1

- **GIVEN** une condition `WINDOW {}` sans `apresSecondes` ni `avantSecondes`
- **WHEN** la validation Draft-07 tourne
- **THEN** elle rejette (au moins une borne requise via `anyOf`)

#### Scenario: Combinaison TIMER et WINDOW

- **GIVEN** un nœud avec `activation: {requires: [{type: TIMER, anchor: GAME_START, delaySeconds: 120}, {type: WINDOW, avantSecondes: 600}], operator: AND}`
- **WHEN** le temps écoulé vaut 300s
- **THEN** les deux conditions sont vraies et le nœud est éligible

### Requirement: Operateur strict en if/then

`operator` SHALL être requis si `requires` a >=2 éléments et interdit si <=1, exprimé en `if/then` Draft-07 pur. `operator` SHALL valoir `AND|OR`.

#### Scenario: Double prérequis sans operateur
- **GIVEN** un Nœud à 2 conditions et aucun `operator`
- **WHEN** le validateur controle le Jeu
- **THEN** le Jeu est rejeté avec une erreur operateur manquant

### Requirement: Montage registre en $ref

Les `data` de modules SHALL être montés par `$ref` + discriminant sur `module.type`, chaque sous-schéma portant sa `schemaVersion`. Le schéma racine ne SHALL jamais énumérer le contenu d'un module (détail au change 500).

#### Scenario: Nouveau type sans toucher la racine
- **GIVEN** un 6e type enregistré avec son sous-schéma
- **WHEN** le schéma racine est relu
- **THEN** aucun de ses objets n'a changé (seul le registre a gagné une entrée)

### Requirement: Nouvelles conditions combinables

Les nouvelles conditions SHALL pouvoir être combinées avec les opérateurs `AND` / `OR` existants et avec les conditions existantes (GEOFENCE, NODE_COMPLETED, etc.).

#### Scenario: GEOFENCE + ITEM_REQUIRED
- **GIVEN** un nœud avec `activation: {requires: [{type: GEOFENCE, lat, lng, radiusMeters}, {type: ITEM_REQUIRED, itemId: "code"}], operator: AND}`
- **WHEN** les deux conditions sont vraies
- **THEN** le nœud devient UNLOCKED

### Requirement: Validation applicative des objets référencés

Le validateur applicatif SHALL vérifier que tout `ITEM_REQUIRED`, `ITEM_USED`, `CODE_INPUT` ou `CLUE_RESOLVED` fait référence à une entité (objet, code, indice) définie dans le JSON du jeu. Toute référence à une entité inconnue SHALL être rejetée.

#### Scenario: Référence à un objet inexistant
- **GIVEN** un jeu avec `ITEM_REQUIRED {itemId: "objet_inexistant"}` et aucun objet "objet_inexistant" dans le JSON
- **WHEN** le validateur applicatif controle
- **THEN** le jeu est rejeté avec erreur : "objet 'objet_inexistant' non défini dans le jeu"

### Requirement: Consistance consumable

Le validateur applicatif SHALL vérifier que `ITEM_USED` avec `consumed: true` fait référence à un objet défini comme `consumable: true` dans le JSON. Si un objet `consumable: false` est utilisé avec `consumed: true`, le validateur SHALL rejeter le jeu.

#### Scenario: Objet non-consommable marqué consommable
- **GIVEN** un objet `loupe` avec `consumable: false` et une condition `ITEM_USED {itemId: "loupe", consumed: true}`
- **WHEN** le validateur controle
- **THEN** le jeu est rejeté avec erreur
