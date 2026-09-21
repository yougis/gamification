## MODIFIED Requirements

### Requirement: node.screen dans le schéma

Le schéma Draft-07 SHALL définir `screen` comme objet optionnel sur chaque nœud. Si présent, il SHALL contenir les propriétés de ScreenDefinition (layout, background, zones, transitions, styles). `additionalProperties: false` SHALL être appliqué à chaque niveau.

`styles` (objet optionnel) SHALL contenir : `fontFamily` (string), `fontSize` (number > 0), `fontWeight` (enum `normal|bold`), `color` (string), `align` (enum `left|center|right`). `additionalProperties: false` SHALL être appliqué.

#### Scenario: Nœud avec screen valide
- **GIVEN** un nœud avec `screen: { layout: "basic-story", background: { type: "color", value: "#000" } }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le nœud est accepté

#### Scenario: Nœud avec screen invalide
- **GIVEN** un nœud avec `screen: { layout: "test", unknownField: true }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le nœud est rejeté (additionalProperties: false)

#### Scenario: Nœud avec styles d'écran valides
- **GIVEN** un nœud avec `screen: { styles: { fontFamily: "Georgia", fontSize: 18 } }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le nœud est accepté

### Requirement: global.screen dans le schéma

Le schéma Draft-07 SHALL définir `global.screen` comme objet optionnel de même type que `node.screen`. `global.screen` sert de template par défaut pour les nœuds sans screen.

`global.screen.styles` SHALL servir de styles par défaut pour tout le jeu (héritage global → écran → widget).

#### Scenario: Global screen valide
- **GIVEN** un jeu avec `global.screen: { layout: "quiz-focus", background: { type: "color", value: "#1a1a2e" } }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le jeu est accepté

#### Scenario: Global screen avec champ inconnu
- **GIVEN** un jeu avec `global.screen: { layout: "test", extra: "field" }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le jeu est rejeté (additionalProperties: false)

## ADDED Requirements

### Requirement: global.minigameDefaults dans le schéma

Le schéma Draft-07 SHALL définir `global.minigameDefaults` comme objet optionnel : `{ maxAttempts?: integer ≥ 1, timeLimitSeconds?: integer ≥ 0 }`. `additionalProperties: false` SHALL être appliqué.

#### Scenario: Défauts globaux valides
- **GIVEN** un jeu avec `global.minigameDefaults: { maxAttempts: 3, timeLimitSeconds: 60 }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le jeu est accepté

#### Scenario: Défaut invalide
- **GIVEN** un jeu avec `global.minigameDefaults: { maxAttempts: 0 }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le jeu est rejeté (maxAttempts ≥ 1)

### Requirement: Options QCM image et découpe puzzle dans le schéma

Le sous-schéma `QUIZ` SHALL accepter des options `{ text?: string, image?: string }` avec au moins l'un des deux requis (via `anyOf`), 2 à 6 options par question, et `maxAttempts` (integer ≥ 1, optionnel).

Le sous-schéma `PUZZLE` SHALL accepter `tileRows` et `tileCols` (integers 2 à 6, requis ensemble via `if/then`), `maxAttempts` (integer ≥ 1, optionnel) et `timeLimitSeconds` (integer ≥ 0, optionnel).

#### Scenario: Option image valide
- **GIVEN** une option `{ image: "chateau.jpg" }` sans texte
- **WHEN** la validation Draft-07 tourne
- **THEN** l'option est acceptée (au moins un des deux présent)

#### Scenario: Découpe puzzle valide
- **GIVEN** un PUZZLE avec `tileRows: 4, tileCols: 4`
- **WHEN** la validation Draft-07 tourne
- **THEN** le module est accepté
