## MODIFIED Requirements

### Requirement: Racine Jeu versionnée

Le schéma SHALL définir la racine : `gameId` (string non vide), `schemaVersion` (semver), `nodes[]` (>=1, sauf cas HOME-seul), `branding`, `global` (carte, trace GPX display, rayon GPS global, `holdMode`, `holdExit`, `navigationModel`, `presentation`, `experienceStyle`, `gameMode`, `difficulty`, `dureeTotale`, `finDeTemps`). Vocabulaire etats : `LOCKED | UNLOCKED | COMPLETED`, aucun `ACTIVE`. Events : `COMPLETED | ABANDON` + flag `hors-delai`. `additionalProperties:false` a chaque niveau. Cas HOME-seul : `nodes: []` accepte ssi `HOME` dans `presentation`, exigence `isEnding` levee.

#### Scenario: Vieux moteur refuse nouveau Jeu
- **GIVEN** un Jeu `schemaVersion:1.2.0` ouvert par un moteur `max:1.0.0`
- **WHEN** le runtime charge le pack
- **THEN** il refuse avec message de mise à jour au lieu de jouer partiellement

#### Scenario: Ancien moteur accepte jeu sans holdMode
- **GIVEN** un Jeu `schemaVersion:1.0.0` sans `global.holdMode`
- **WHEN** le runtime charge le pack
- **THEN** il accepte (holdMode absent = `"none"`, pas de verrouillage)

#### Scenario: Jeu HOLD valide accepte
- **GIVEN** un Jeu `schemaVersion:1.1.0` avec `global.holdMode: "guidedAccess"` et `global.holdExit.method: "adminPin"`
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
