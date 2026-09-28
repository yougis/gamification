## MODIFIED Requirements

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

Le Studio SHALL lire et écrire exclusivement `global.experienceStyle`, jamais une clé `experienceStyle` à la racine du jeu (rejetée en couche 1). Si un jeu chargé porte une valeur racine résiduelle, le Studio SHALL la fusionner dans `global.experienceStyle` (la valeur `global` gagne en cas de conflit) puis retirer la clé racine, via une opération nommée annulable.

#### Scenario: Jeu avec experienceStyle complet
- **GIVEN** un jeu avec `global.experienceStyle` contenant `preset: "ESCAPE_GAME"` et `visual.primaryColor: "#ff4400"`
- **WHEN** le moteur charge le jeu
- **THEN** le Player utilise le preset ESCAPE_GAME et le couleur primaire #ff4400

#### Scenario: Jeu sans experienceStyle
- **GIVEN** un jeu sans `global.experienceStyle`
- **WHEN** le moteur charge le jeu
- **THEN** le moteur applique un `ExperienceStyle` vide avec toutes les dimensions par défaut

#### Scenario: Panneau Config sans clé racine
- **GIVEN** un jeu valide affiché dans l'écran Config
- **WHEN** l'auteur change le preset puis une couleur dans le panneau Experience Style
- **THEN** seul `global.experienceStyle` est modifié (annulable par undo) et la validation C1 reste verte

#### Scenario: Valeur racine résiduelle migrée
- **GIVEN** un jeu chargé avec `experienceStyle` à la racine ET `global.experienceStyle` initialisé par `jeuVide`
- **WHEN** le Studio ouvre le jeu
- **THEN** la racine est fusionnée dans `global` (global gagne), la clé racine disparaît, et l'opération est annulable par undo
