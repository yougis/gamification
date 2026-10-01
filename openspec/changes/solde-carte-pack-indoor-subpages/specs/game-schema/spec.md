## MODIFIED Requirements

### Requirement: Racine Jeu versionnée

Le schéma SHALL définir la racine : `gameId` (string non vide), `schemaVersion`
(semver du schéma), `nodes[]` (>=1, sauf cas HOME-seul ci-dessous), `branding` (objet typé : `name`, `primaryColor`,
`secondaryColor`, `fontFamily`, `logo` optionnel), `global` (carte, trace
GPX display, rayon GPS global, `holdMode` enum `"none"|"guidedAccess"|"screenPinning"|"lockTask"`,
`holdExit` objet avec `method`, `navigationModel`, `presentation`, `experienceStyle` (objet),
`gameMode`, `difficulty`, `dureeTotale` (integer ≥ 0, secondes de partie, optionnel),
`finDeTemps` (enum `"terminer"|"continuer"`, requis si `dureeTotale` posée via `if/then`),
`indoorPlans` (tableau optionnel de plans indoor)).
`global.preset` est supprimé du schéma : un jeu le
contenant est rejeté en couche 1. `experienceStyle`, `gameMode`, `difficulty`,
`dureeTotale` et `indoorPlans` sont optionnels : un jeu sans ces champs reste valide (pas de limite
de temps). `additionalProperties:false` à chaque niveau.
`indoorPlans` et `global.map` SHALL être mutuellement exclusifs (exclusion en couche 2 applicatif).
Le `schemaVersion` du Jeu SHALL être vérifié contre le `minEngineVersion` à
l'ouverture : moteur trop vieux = refus explicite, jamais lecture partielle.
`holdMode` et `holdExit` ne sont jamais une condition de graphe : ce sont des
meta-états du runtime. Si `holdMode` vaut `"none"` ou est absent, `holdExit` est
optionnel. Si `holdMode` vaut `"guidedAccess"`, `"screenPinning"` ou `"lockTask"`,
`holdExit` est requis avec `method` (Draft-07 `if/then`).
Cas HOME-seul : `nodes: []` est accepté **si et seulement si** `HOME` figure dans
`global.presentation` (Draft-07 `if/then`) ; dans ce cas l'exigence d'un nœud
`isEnding` est levée. Sans `HOME`, `nodes[] >= 1` avec un `isEnding` reste exigé.

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

#### Scenario: Durée globale acceptée
- **GIVEN** un jeu avec `global.dureeTotale: 3600` et `global.finDeTemps: "terminer"`
- **WHEN** la validation Draft-07 tourne
- **THEN** le jeu est accepté

#### Scenario: Durée sans comportement rejetée
- **GIVEN** un jeu avec `global.dureeTotale: 3600` et sans `finDeTemps`
- **WHEN** la validation Draft-07 tourne
- **THEN** le jeu est rejeté (comportement d'échéance requis via `if/then`)

#### Scenario: Jeu sans durée inchangé
- **GIVEN** un jeu sans `global.dureeTotale`
- **WHEN** la validation Draft-07 tourne puis le moteur joue
- **THEN** le jeu est accepté et aucune limite de temps ne s'applique

#### Scenario: Jeu HOME-seul accepté sans nœud
- **GIVEN** un jeu avec `global.presentation: ["HOME"]` et `nodes: []`
- **WHEN** la validation Draft-07 tourne
- **THEN** le jeu est accepté (aucun `isEnding` exigé)

#### Scenario: Jeu vide sans HOME rejeté
- **GIVEN** un jeu avec `global.presentation: ["MAP"]` et `nodes: []`
- **WHEN** la validation Draft-07 tourne
- **THEN** le jeu est rejeté (`nodes >= 1` et `isEnding` requis)

#### Scenario: Jeu indoor avec indoorPlans
- **GIVEN** un jeu avec `global.indoorPlans: [{id: "rdc", name: "RDC", floor: 0, image: "plan.png", origin: {lat: 48.8566, lng: 2.3522}, scale: 50, sizeMeters: {w: 40, h: 25}}]`
- **WHEN** la validation Draft-07 tourne
- **THEN** le jeu est accepté

### Requirement: Objet Noeud complet

Chaque Nœud SHALL porter : `id` (unique dans le Jeu), `module {type, data}`,
`activation {requires[] (>=1), operator}`, `latch` (booléen, défaut `true`),
`onReentry` (`ignore` défaut | `replay`), `maxReentries` (requis si `replay`),
`scoreOnReplay` (défaut `false`), `isEnding` (défaut `false`), `randomPool`
(si Nœud `RANDOM_POOL`), `position` (optionnel : `{planId, x, y}` pour nœuds indoor),
`inventoryAccess` (booléen optionnel, défaut `true`).
Types inconnus en `module.type` SHALL rester valides
en couche 1 (compatibilité traitée en applicatif).

#### Scenario: Replay sans borne rejeté en couche 1
- **GIVEN** un Nœud `onReentry:replay` sans `maxReentries`
- **WHEN** la validation Draft-07 tourne
- **THEN** elle rejette (requis conditionnel via `if/then`)

#### Scenario: Accès inventaire masqué sur une épreuve
- **GIVEN** un Nœud avec `inventoryAccess: false`
- **WHEN** la validation Draft-07 tourne
- **THEN** elle accepte (champ optionnel déclaré)

#### Scenario: Nœud avec position indoor
- **GIVEN** un Nœud avec `position: {planId: "rdc", x: 5.0, y: 3.0}`
- **WHEN** la validation Draft-07 tourne
- **THEN** le nœud est accepté (champ optionnel)

#### Scenario: Nœud avec position invalide
- **GIVEN** un Nœud avec `position: {planId: "rdc"}` (champs x et y manquants)
- **WHEN** la validation Draft-07 tourne
- **THEN** elle rejette (x et y requis si position présent)
