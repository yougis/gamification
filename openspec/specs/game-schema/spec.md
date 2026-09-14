# game-schema Specification

## Purpose

Donne au framework son document JSON opposable : structure, champs, enums et exemple prouvant que le cas de référence s'exprime et se valide.

## Requirements

### Requirement: Racine Jeu versionnée

Le schéma SHALL définir la racine : `gameId` (string non vide), `schemaVersion`
(semver du schéma), `nodes[]` (>=1), `branding` (objet), `global` (carte, trace
GPX display, rayon GPS global, `holdMode` enum `"none"|"guidedAccess"|"screenPinning"|"lockTask"`,
`holdExit` objet avec `method`). `additionalProperties:false` à chaque niveau.
Le `schemaVersion` du Jeu SHALL être vérifié contre le `minEngineVersion` à
l'ouverture : moteur trop vieux = refus explicite, jamais lecture partielle.
`holdMode` et `holdExit` ne sont jamais une condition de graphe : ce sont des
meta-états du runtime. Si `holdMode` vaut `"none"` ou est absent, `holdExit` est
optionnel. Si `holdMode` vaut `"guidedAccess"`, `"screenPinning"` ou `"lockTask"`,
`holdExit` est requis avec `method` (Draft-07 `if/then`).

#### Scenario: Vieux moteur refuse nouveau Jeu

- **GIVEN** un Jeu `schemaVersion:1.2.0` ouvert par un moteur `max:1.0.0`
- **WHEN** le runtime charge le pack
- **THEN** il refuse avec message de mise à jour au lieu de jouer partiellement

#### Scenario: Ancien moteur accepte jeu sans holdMode

- **GIVEN** un Jeu `schemaVersion:1.0.0` sans `global.holdMode`
- **WHEN** le runtime charge le pack
- **THEN** il accepte (holdMode absent = `"none"`, pas de verrouillage)

#### Scenario: Jeu HOLD valide accepte

- **GIVEN** un Jeu `schemaVersion:1.1.0` avec `global.holdMode: "guidedAccess"`
  et `global.holdExit.method: "adminPin"`
- **WHEN** le runtime charge le pack
- **THEN** il accepte et active le verrouillage kiosque

### Requirement: Objet Noeud complet

Chaque Nœud SHALL porter : `id` (unique dans le Jeu), `module {type, data}`,
`activation {requires[] (>=1), operator}`, `latch` (booléen, défaut `true`),
`onReentry` (`ignore` défaut | `replay`), `maxReentries` (requis si `replay`),
`scoreOnReplay` (défaut `false`), `isEnding` (défaut `false`), `randomPool`
(si Nœud `RANDOM_POOL`). Types inconnus en `module.type` SHALL rester valides
en couche 1 (compatibilité traitée en applicatif).

#### Scenario: Replay sans borne rejeté en couche 1

- **GIVEN** un Nœud `onReentry:replay` sans `maxReentries`
- **WHEN** la validation Draft-07 tourne
- **THEN** elle rejette (requis conditionnel via `if/then`)

### Requirement: Operateur strict en if/then

`operator` SHALL être requis si `requires` a >=2 éléments et interdit si <=1,
exprimé en `if/then` Draft-07 pur. `operator` SHALL valoir `AND|OR`.

#### Scenario: Double prérequis sans opérateur

- **GIVEN** un Nœud à 2 conditions sans `operator`
- **WHEN** la validation Draft-07 tourne
- **THEN** elle rejette avant toute analyse de graphe

### Requirement: Enum des conditions avec PROXIMITY_MASTER

`condition.type` SHALL valoir `GEOFENCE|NODE_COMPLETED|TIMER|POOL_DRAWN|
PROXIMITY_MASTER|CONDITIONAL|WINDOW`. Chaque variante SHALL imposer ses champs
(`GEOFENCE`: lat/lng/radiusMeters/predicate ; `TIMER`: anchor+anchorNodeId si
`NODE_COMPLETION` ; `POOL_DRAWN`: poolNodeId ; `PROXIMITY_MASTER`: masterId,
transport `ble|wifi`) et interdire les autres (`additionalProperties:false` par
variante). `randomPool` SHALL exclure `withReplacement`.

#### Scenario: Variante contaminée rejetée

- **GIVEN** une condition `TIMER` contenant `radiusMeters`
- **WHEN** la validation Draft-07 tourne
- **THEN** elle rejette (champ étranger à la variante)

### Requirement: Montage registre en $ref

Les `data` de modules SHALL être montés par `$ref` + discriminant sur
`module.type`, chaque sous-schéma portant sa `schemaVersion`. Le schéma racine
ne SHALL jamais énumérer le contenu d'un module (détail au change 500).

#### Scenario: Nouveau type sans toucher la racine

- **GIVEN** un 6e type enregistré avec son sous-schéma
- **WHEN** le schéma racine est relu
- **THEN** aucun de ses objets n'a changé (seul le registre a gagné une entrée)

### Requirement: Exemple 5 POI valide fourni

Le change SHALL livrer `game-5poi.json` (START → POOL 1/5 → A|B|C|D|E → FIN
`isEnding`, chaque branche vers FIN) qui passe les deux couches. Toute
évolution du schéma SHALL revalider cet exemple (non-régression).

#### Scenario: Non-régression exemple

- **GIVEN** une révision du schéma
- **WHEN** `game-5poi.json` est revalidé couches 1+2
- **THEN** il reste accepté ou la révision est refusée
