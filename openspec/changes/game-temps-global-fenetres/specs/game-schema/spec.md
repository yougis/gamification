## MODIFIED Requirements

### Requirement: Racine Jeu versionnée

Le schéma SHALL définir la racine : `gameId` (string non vide), `schemaVersion`
(semver du schéma), `nodes[]` (>=1), `branding` (objet typé : `name`, `primaryColor`,
`secondaryColor`, `fontFamily`, `logo` optionnel), `global` (carte, trace
GPX display, rayon GPS global, `holdMode` enum `"none"|"guidedAccess"|"screenPinning"|"lockTask"`,
`holdExit` objet avec `method`, `navigationModel`, `presentation`, `experienceStyle` (objet),
`gameMode`, `difficulty`, `dureeTotale` (integer ≥ 0, secondes de partie, optionnel),
`finDeTemps` (enum `"terminer"|"continuer"`, requis si `dureeTotale` posée via `if/then`)).
`global.preset` est supprimé du schéma : un jeu le
contenant est rejeté en couche 1. `experienceStyle`, `gameMode`, `difficulty`,
`dureeTotale` sont optionnels : un jeu sans ces champs reste valide (pas de limite
de temps). `additionalProperties:false` à chaque niveau.
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
