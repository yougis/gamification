## Purpose

Mise à jour du schema Draft-07 pour intégrer `global.experienceStyle`, `global.gameMode`, `global.difficulty`, le `branding` typé, et supprimer `global.preset`.

## MODIFIED Requirements

### Requirement: Racine Jeu versionnée

**FROM:** Le schéma définit la racine avec `gameId`, `schemaVersion`, `nodes[]`, `branding` (objet unconstrained), `global` avec `holdMode`, `holdExit`, `navigationModel`, `presentation`, `preset`.

**TO:** Le schéma définit la racine avec `gameId`, `schemaVersion`, `nodes[]`, `branding` (objet typé), `global` avec `holdMode`, `holdExit`, `navigationModel`, `presentation`, `experienceStyle` (objet), `gameMode`, `difficulty`. `preset` est **supprimé**.

**Modified properties:**
- `branding` : passe de `{"type": "object"}` à un objet typé avec `name` (string), `primaryColor` (string hex), `secondaryColor` (string hex), `fontFamily` (string), `logo` (string optionnel)
- `global` : ajoute `experienceStyle` (objet optionnel), `gameMode` (enum optionnel), `difficulty` (enum optionnel)
- `global` : **REMOVED** `preset` (enum)

Le `schemaVersion` du Jeu SHALL être vérifié contre le `minEngineVersion` à l'ouverture.

**Reason:** `preset` est un doublon de `navigationModel`. `experienceStyle`, `gameMode`, `difficulty` sont des concepts manquants.

**Migration:** Les jeux existants avec `global.preset` devront migrer vers `global.experienceStyle.preset`. Les jeux sans ces nouveaux champs restent valides (tous optionnels).

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

### Requirement: Operateur strict en if/then

**FROM:** `operator` est requis si `requires` a >=2 éléments et interdit si <=1.

**TO:** Inchangé. Cette requirement n'est pas affectée par le changement.

### Requirement: Enum des conditions

**FROM:** `condition.type` inclut `GEOFENCE`, `NODE_COMPLETED`, `TIMER`, `POOL_DRAWN`, `PROXIMITY_MASTER`, `CONDITIONAL`, `WINDOW`, `ITEM_REQUIRED`, `ITEM_USED`, `CODE_INPUT`, `CLUE_RESOLVED`.

**TO:** Inchangé. Les types de conditions ne sont pas affectés par le changement.

### Requirement: Montage registre en $ref

**FROM:** Les `data` de modules sont montés par `$ref` + discriminant sur `module.type`.

**TO:** Le registre SHALL inclure le champ `experienceNeeds` pour chaque module. Le schéma racine ne SHALL jamais énumérer le contenu d'un module.

**Modified:** Le `registry.json` et le sous-schema de chaque module ajoutent `experienceNeeds` comme champ optionnel (array de strings).

#### Scenario: Module avec experienceNeeds
- **GIVEN** un module AR_MARKER avec `experienceNeeds: ["map", "visual"]`
- **WHEN** le schéma racine est relu
- **THEN** aucun de ses objets n'a changé (seul le registre a gagné une entrée)

## ADDED Requirements

### Requirement: experienceStyle dans le schema

Le schema Draft-07 SHALL définir `global.experienceStyle` comme objet optionnel avec les propriétés suivantes :
- `preset` (string optionnel, enum : BASIC, GUIDED, TREASURE_HUNT, ESCAPE_GAME, OPEN_EXPLORATION)
- `identity` (objet optionnel : `{name, publisher, logo, theme}`)
- `visual` (objet optionnel : `{primaryColor, secondaryColor, fontFamily, borderRadius, cardStyle}`)
- `components` (objet optionnel)
- `media` (objet optionnel)
- `motion` (objet optionnel)
- `map` (objet optionnel)
- `voice` (objet optionnel)

Chaque sous-objet SHALL avoir `additionalProperties: false`.

#### Scenario: experienceStyle avec preset et visual
- **GIVEN** un jeu avec `global.experienceStyle.preset: "ESCAPE_GAME"` et `global.experienceStyle.visual.primaryColor: "#ff4400"`
- **WHEN** la validation Draft-07 tourne
- **THEN** le jeu est accepté

### Requirement: gameMode et difficulty dans le schema

Le schema Draft-07 SHALL définir :
- `global.gameMode` (string optionnel, enum : NORMAL, ANIMATEUR, SOIREE, HARDCORE)
- `global.difficulty` (string optionnel, enum : ENFANT, FAMILLE, EXPERT)

#### Scenario: gameMode valide
- **GIVEN** un jeu avec `global.gameMode: "ANIMATEUR"`
- **WHEN** la validation Draft-07 tourne
- **THEN** le jeu est accepté

#### Scenario: gameMode invalide
- **GIVEN** un jeu avec `global.gameMode: "INVALID"`
- **WHEN** la validation Draft-07 tourne
- **THEN** le jeu est rejeté
