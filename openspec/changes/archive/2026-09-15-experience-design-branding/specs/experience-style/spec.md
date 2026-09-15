## Purpose

Definit le concept `experienceStyle` comme configuration de première classe pour l'identité visuelle, sensorielle et interactive d'un jeu GeoPlay, indépendante du `navigationModel` (gameplay) et de la `presentation` (modes d'affichage).

## ADDED Requirements

### Requirement: Configuration experienceStyle

Le jeu SHALL définir `global.experienceStyle` comme objet optionnel avec 7 dimensions fonctionnelles. Chaque dimension peut être préconfigurée via un preset puis surchargée individuellement.

- `preset` (optionnel, string) : préfixe de référence (`"BASIC"`, `"GUIDED"`, `"TREASURE_HUNT"`, `"ESCAPE_GAME"`, `"OPEN_EXPLORATION"`)
- `identity` (optionnel) : `{ name, publisher, logo, theme }`
- `visual` (optionnel) : `{ primaryColor, secondaryColor, fontFamily, borderRadius, cardStyle }`
- `components` (optionnel) : `{ navigationBar, toolbox, cluePanel, mapStyle }`
- `media` (optionnel) : `{ audioTheme, vibrationPattern, animations }`
- `motion` (optionnel) : `{ transitionStyle, parallax, loadingIndicator }`
- `map` (optionnel) : `{ style, markerSet, routeStyle, zoomBehavior }`
- `voice` (optionnel) : `{ enabled, language, voiceType, prompts }`

Si `experienceStyle` est absent, le moteur SHALL appliquer un `ExperienceStyle` vide avec toutes les dimensions aux valeurs par défaut.

#### Scenario: Jeu avec experienceStyle complet
- **GIVEN** un jeu avec `global.experienceStyle` contenant `preset: "ESCAPE_GAME"` et `visual.primaryColor: "#ff4400"`
- **WHEN** le moteur charge le jeu
- **THEN** le Player utilise le preset ESCAPE_GAME et le couleur primaire #ff4400

#### Scenario: Jeu sans experienceStyle
- **GIVEN** un jeu sans `global.experienceStyle`
- **WHEN** le moteur charge le jeu
- **THEN** le moteur applique un `ExperienceStyle` vide avec toutes les dimensions par défaut

### Requirement: Résolution du preset

Le moteur SHALL résoudre l'`experienceStyle` via le pipeline : `ExperienceStylePreset → overrides → resolved ExperienceStyle → Player`.

1. Si `experienceStyle.preset` est présent, charger les valeurs par défaut du preset
2. Appliquer les overrides individuels de chaque dimension
3. Résoudre en un `ExperienceStyle` complet
4. Le Player consomme le `ExperienceStyle` résolu indépendamment de `navigationModel` et `presentation`

La résolution SHALL être faite par `GameEngine.resolveExperienceStyle()` et persistante en SQLite avec le reste de la progression.

#### Scenario: Preset avec override visuel
- **GIVEN** un jeu avec `experienceStyle.preset: "BASIC"` et `experienceStyle.visual.primaryColor: "#ff0000"`
- **WHEN** le moteur résout l'experienceStyle
- **THEN** le preset BASIC est appliqué, puis `primaryColor` est remplacé par `#ff0000`

#### Scenario: Preset modifié individuellement
- **GIVEN** le preset BASIC avec `visual.primaryColor: "#1a7f37"`
- **WHEN** l'auteur modifie `experienceStyle.visual.primaryColor` à `"#ff4400"`
- **THEN** le jeu utilise le preset BASIC avec la couleur primaire personnalisée

### Requirement: Indépendance vis-à-vis de navigationModel et presentation

`experienceStyle` SHALL être conceptuellement indépendant de `navigationModel` et `presentation`. Un même `experienceStyle` peut être utilisé avec n'importe quel `navigationModel` et n'importe quel `presentation`.

- Le `navigationModel` contrôle les mécanismes de progression, discovery, activation, inventory, effects
- La `presentation` contrôle les modes d'affichage (MAP, LIST, STORY, etc.)
- L'`experienceStyle` contrôle l'identité visuelle, sensorielle et interactive

#### Scenario: Même style, navigation différente
- **GIVEN** un jeu avec `experienceStyle: {preset: "ESCAPE_GAME"}` et `navigationModel: "BASIC"`
- **WHEN** le joueur lance la session
- **THEN** le Player affiche l'identité visuelle ESCAPE_GAME (boîte à outils, indices) mais utilise les mécanismes de navigation BASIC (geofence)

#### Scenario: Même style, presentation différente
- **GIVEN** un jeu avec `experienceStyle: {preset: "ESCAPE_GAME"}` et `presentation: ["TOOLBOX", "CLUE"]`
- **WHEN** le joueur lance la session
- **THEN** le Player affiche la boîte à outils et les indices avec le style ESCAPE_GAME

### Requirement: experienceStyle dans le Player

Le Player mobile SHALL adapter son interface selon le `experienceStyle` résolu.

Le Player SHALL :
- appliquer `experienceStyle.visual` pour les couleurs et typographies
- afficher les composants selon `experienceStyle.components`
- utiliser `experienceStyle.media` pour les sons et vibrations
- appliquer `experienceStyle.map` pour le style de carte
- utiliser `experienceStyle.voice` pour les prompts vocaux

#### Scenario: Couleurs personnalisées
- **GIVEN** un jeu avec `experienceStyle.visual.primaryColor: "#ff4400"`
- **WHEN** le joueur ouvre le jeu
- **THEN** l'interface utilise #ff4400 comme couleur primaire

#### Scenario: Voice prompts
- **GIVEN** un jeu avec `experienceStyle.voice.enabled: true` et `experienceStyle.voice.language: "fr"`
- **WHEN** le joueur atteint un POI
- **THEN** les prompts vocaux en français sont lus

### Requirement: Persistance et reprise

L'`experienceStyle` résolu SHALL persister en SQLite avec le reste de la progression. Reprendre = même `sessionId` relit l'`experienceStyle` résolu. Nouvelle partie = nouveau `sessionId` avec `experienceStyle` par défaut.

#### Scenario: Reprise avec experienceStyle
- **GIVEN** une partie avec `experienceStyle.preset: "ESCAPE_GAME"` et `experienceStyle.visual.primaryColor: "#ff4400"`
- **WHEN** l'application est relancée avec le même `sessionId`
- **THEN** l'`experienceStyle` résolu est restauré

### Requirement: Validation Draft-07

Le schema Draft-07 SHALL contenir `global.experienceStyle` comme objet optionnel avec les 7 dimensions comme propriétés optionnelles. Le schema SHALL permettre `additionalProperties: false` à chaque niveau pour garantir la conformité.

#### Scenario: Jeu avec experienceStyle valide
- **GIVEN** un jeu avec `global.experienceStyle.preset: "ESCAPE_GAME"` et `global.experienceStyle.visual.primaryColor: "#ff4400"`
- **WHEN** la validation Draft-07 tourne
- **THEN** le jeu est accepté

#### Scenario: Jeu avec experienceStyle invalide (champ inconnu)
- **GIVEN** un jeu avec `global.experienceStyle.champInconnu: "valeur"`
- **WHEN** la validation Draft-07 tourne
- **THEN** le jeu est rejeté (champ étranger à la variante)

### Requirement: Module registry — experienceNeeds

Le registre de modules SHALL permettre à chaque module de déclarer ses besoins en termes d'`experienceStyle` via le champ `experienceNeeds` : liste des dimensions requises (`"visual"`, `"audio"`, `"map"`, `"voice"`, etc.).

#### Scenario: Module nécessitant la carte
- **GIVEN** un module AR_MARKER avec `experienceNeeds: ["map", "visual"]`
- **WHEN** le jeu utilise ce module
- **THEN** le player vérifie que MAP et les styles visuels sont disponibles dans l'`experienceStyle`

#### Scenario: Module sans besoins spécifiques
- **GIVEN** un module QUIZ sans `experienceNeeds`
- **WHEN** le jeu utilise ce module
- **THEN** le module fonctionne sans interaction avec l'`experienceStyle`
