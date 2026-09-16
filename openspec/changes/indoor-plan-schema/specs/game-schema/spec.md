## MODIFIED Requirements

### Requirement: Racine Jeu versionnée

Le schéma SHALL définir la racine : `gameId` (string non vide), `schemaVersion`
(semver du schéma), `nodes[]` (>=1), `branding` (objet typé : `name`, `primaryColor`,
`secondaryColor`, `fontFamily`, `logo` optionnel), `global` (carte, trace
GPX display, rayon GPS global, `holdMode` enum `"none"|"guidedAccess"|"screenPinning"|"lockTask"`,
`holdExit` objet avec `method`, `navigationModel`, `presentation`, `experienceStyle` (objet),
`gameMode`, `difficulty`, `indoorPlans` (tableau optionnel de plans indoor)).
`global.preset` est supprimé du schéma : un jeu le
contenant est rejeté en couche 1. `experienceStyle`, `gameMode`, `difficulty` et
`indoorPlans` sont optionnels : un jeu sans ces champs reste valide. `additionalProperties:false` à chaque niveau.
`indoorPlans` et `global.map` SHALL être mutuellement exclusifs (exclusion en couche 2 applicatif).
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

#### Scenario: Jeu avec nouveau schema valide

- **GIVEN** un jeu avec `branding: {name: "Test"}`, `global.experienceStyle: {preset: "BASIC"}`, `global.gameMode: "NORMAL"`, `global.difficulty: "FAMILLE"`
- **WHEN** la validation Draft-07 tourne
- **THEN** le jeu est accepté

#### Scenario: Ancien jeu sans nouveaux champs

- **GIVEN** un jeu `schemaVersion:1.0.0` sans `global.experienceStyle`, `global.gameMode`, `global.difficulty`
- **WHEN** la validation Draft-07 tourne
- **THEN** le jeu est accepté (champs optionnels, pas de rupture)

#### Scenario: Ancien jeu avec preset

- **GIVEN** un jeu avec `global.preset: "BASIC"`
- **WHEN** la validation Draft-07 tourne
- **THEN** le jeu est rejeté : `global.preset` est supprimé du schema

#### Scenario: Jeu indoor avec indoorPlans

- **GIVEN** un jeu avec `global.indoorPlans: [{id: "rdc", name: "RDC", floor: 0, image: "plan.png", origin: {lat: 48.8566, lng: 2.3522}, scale: 50, sizeMeters: {w: 40, h: 25}}]`
- **WHEN** la validation Draft-07 tourne
- **THEN** le jeu est accepté

### Requirement: Objet Noeud complet

Chaque Nœud SHALL porter : `id` (unique dans le Jeu), `module {type, data}`,
`activation {requires[] (>=1), operator}`, `latch` (booléen, défaut `true`),
`onReentry` (`ignore` défaut | `replay`), `maxReentries` (requis si `replay`),
`scoreOnReplay` (défaut `false`), `isEnding` (défaut `false`), `randomPool`
(si Nœud `RANDOM_POOL`), `position` (optionnel : `{planId, x, y}` pour nœuds indoor).
Types inconnus en `module.type` SHALL rester valides
en couche 1 (compatibilité traitée en applicatif).

#### Scenario: Replay sans borne rejeté en couche 1

- **GIVEN** un Nœud `onReentry:replay` sans `maxReentries`
- **WHEN** la validation Draft-07 tourne
- **THEN** elle rejette (requis conditionnel via `if/then`)

#### Scenario: Nœud avec position indoor

- **GIVEN** un Nœud avec `position: {planId: "rdc", x: 5.0, y: 3.0}`
- **WHEN** la validation Draft-07 tourne
- **THEN** le nœud est accepté (champ optionnel)

#### Scenario: Nœud avec position invalide

- **GIVEN** un Nœud avec `position: {planId: "rdc"}` (champs x et y manquants)
- **WHEN** la validation Draft-07 tourne
- **THEN** elle rejette (x et y requis si position présent)

### Requirement: Operateur strict en if/then

`operator` SHALL être requis si `requires` a >=2 éléments et interdit si <=1,
exprimé en `if/then` Draft-07 pur. `operator` SHALL valoir `AND|OR`.

#### Scenario: Double prérequis sans opérateur

- **GIVEN** un Nœud à 2 conditions sans `operator`
- **WHEN** la validation Draft-07 tourne
- **THEN** elle rejette avant toute analyse de graphe
