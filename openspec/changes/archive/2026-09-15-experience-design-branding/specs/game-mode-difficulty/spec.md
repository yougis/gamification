## Purpose

Définit les champs `global.gameMode` et `global.difficulty` comme configuration de niveau jeu, remplaçant les enums `GameMode` et `Difficulty` actuellement non intégrés au modèle `Game`.

## ADDED Requirements

### Requirement: GameMode dans global

Le jeu MAY définir `global.gameMode` comme champ optionnel avec les valeurs :
- `NORMAL` — jeu standard
- `ANIMATEUR` — mode animateur avec triche et bypass capteurs
- `SOIREE` — mode soirée avec contraintes de temps
- `HARDCORE` — mode difficile sans aides

Si `global.gameMode` est absent, la valeur par défaut SHALL être `NORMAL`.

`gameMode` SHALL être un meta-état du runtime, pas une condition de graphe.

#### Scenario: Jeu en mode animateur
- **GIVEN** un jeu avec `global.gameMode: "ANIMATEUR"`
- **WHEN** le joueur lance la session
- **THEN** le runtime active les fonctionnalités de triche et bypass capteurs

#### Scenario: Jeu sans gameMode
- **GIVEN** un jeu sans `global.gameMode`
- **WHEN** le moteur charge le jeu
- **THEN** le jeu fonctionne en mode `NORMAL`

### Requirement: Difficulty dans global

Le jeu MAY définir `global.difficulty` comme champ optionnel avec les valeurs :
- `ENFANT` — difficulté enfant
- `FAMILLE` — difficulté famille
- `EXPERT` — difficulté expert

Si `global.difficulty` est absent, la valeur par défaut SHALL être `FAMILLE`.

`difficulty` SHALL influencer les overrides de difficulté (rayon GPS réduit, temps limité, etc.) mais NE SHALL PAS modifier le graphe du jeu.

#### Scenario: Difficulté enfant
- **GIVEN** un jeu avec `global.difficulty: "ENFANT"`
- **WHEN** le joueur lance la session
- **THEN** le runtime applique les overrides enfant (rayon GPS augmenté, indices plus fréquents)

#### Scenario: Difficulté expert
- **GIVEN** un jeu avec `global.difficulty: "EXPERT"`
- **WHEN** le joueur lance la session
- **THEN** le runtime applique les overrides expert (rayon GPS réduit, pas d'indices)

### Requirement: Interaction avec experienceStyle

`global.gameMode` et `global.difficulty` SHALL interagir avec `global.experienceStyle` :
- `gameMode` peut modifier `experienceStyle.media` et `experienceStyle.motion`
- `difficulty` peut modifier `experienceStyle.components` et `experienceStyle.map`

La résolution SHALL se faire dans l'ordre : `experienceStyle.preset → gameMode overrides → difficulty overrides → manual overrides`.

#### Scenario: Mode animateur modifie l'experienceStyle
- **GIVEN** un jeu avec `experienceStyle.preset: "BASIC"` et `global.gameMode: "ANIMATEUR"`
- **WHEN** le moteur résout l'experienceStyle
- **THEN** le `experienceStyle` résultant inclut les overrides animateur (triche, bypass)

### Requirement: Validation Draft-07

Le schema Draft-07 SHALL contenir `global.gameMode` et `global.difficulty` comme champs optionnels avec leurs enum respectifs.

#### Scenario: gameMode valide
- **GIVEN** un jeu avec `global.gameMode: "ANIMATEUR"`
- **WHEN** la validation Draft-07 tourne
- **THEN** le jeu est accepté

#### Scenario: gameMode invalide
- **GIVEN** un jeu avec `global.gameMode: "INVALID_MODE"`
- **WHEN** la validation Draft-07 tourne
- **THEN** le jeu est rejeté

### Requirement: Studio configuration gameMode et difficulty

Le Studio SHALL offrir des champs pour configurer `global.gameMode` et `global.difficulty` dans l'éditeur de jeu. Ces champs SHALL être visibles dans la configuration globale du jeu.

Toute modification SHALL garantir un export JSON conforme au schema Draft-07.

#### Scenario: Modification du gameMode dans le Studio
- **GIVEN** un jeu en édition
- **WHEN** l'auteur change `global.gameMode` de `NORMAL` à `ANIMATEUR`
- **THEN** le JSON exporté contient le nouveau mode et passe la validation

### Requirement: Impact sur les modules

Les modules SHALL pouvoir lire `global.gameMode` et `global.difficulty` pour adapter leur comportement :
- `GameMode.ANIMATEUR` : les modules activent le mode triche
- `Difficulty.ENFANT` : les modules augmentent les tolérances et les aides
- `Difficulty.EXPERT` : les modules réduisent les tolérances et les aides

Le moteur SHALL transmettre `gameMode` et `difficulty` aux modules lors de leur initialisation.

#### Scenario: Module adapte son comportement au gameMode
- **GIVEN** un jeu avec `global.gameMode: "ANIMATEUR"`
- **WHEN** un module QUIZ est initialisé
- **THEN** le QUIZ active l'auto-validation triche et le flag triche sur tous les events

#### Scenario: Module adapte sa difficulté
- **GIVEN** un jeu avec `global.difficulty: "ENFANT"`
- **WHEN** un module DIFFERENCE_GAME est initialisé
- **THEN** les polygones sont agrandis et la tolrance de tap est augmentée
