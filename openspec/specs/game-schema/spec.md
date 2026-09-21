# game-schema Specification

## Purpose

Donne au framework son document JSON opposable : structure, champs, enums et exemple prouvant que le cas de référence s'exprime et se valide.

## Requirements

### Requirement: Racine Jeu versionnée

Le schéma SHALL définir la racine : `gameId` (string non vide), `schemaVersion`
(semver du schéma), `nodes[]` (>=1), `branding` (objet typé : `name`, `primaryColor`,
`secondaryColor`, `fontFamily`, `logo` optionnel), `global` (carte, trace
GPX display, rayon GPS global, `holdMode` enum `"none"|"guidedAccess"|"screenPinning"|"lockTask"`,
`holdExit` objet avec `method`, `navigationModel`, `presentation`, `experienceStyle` (objet),
`gameMode`, `difficulty`). `global.preset` est supprimé du schéma : un jeu le
contenant est rejeté en couche 1. `experienceStyle`, `gameMode` et `difficulty`
sont optionnels : un jeu sans ces champs reste valide. `additionalProperties:false` à chaque niveau.
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
Le registre SHALL inclure le champ `experienceNeeds` (array de strings, optionnel)
pour chaque module.

#### Scenario: Nouveau type sans toucher la racine

- **GIVEN** un 6e type enregistré avec son sous-schéma
- **WHEN** le schéma racine est relu
- **THEN** aucun de ses objets n'a changé (seul le registre a gagné une entrée)

#### Scenario: Module avec experienceNeeds

- **GIVEN** un module AR_MARKER avec `experienceNeeds: ["map", "visual"]`
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

### Requirement: indoorPlans dans global

Le schema Draft-07 SHALL définir `global.indoorPlans` comme tableau optionnel d'objets. Chaque plan SHALL contenir :
- `id` (string non vide, unique)
- `name` (string non vide)
- `floor` (number, étage)
- `image` (string, référence asset)
- `origin` (objet : `lat`, `lng` en number)
- `scale` (number > 0, pixels par mètre)
- `sizeMeters` (objet : `w`, `h` en number)

`additionalProperties: false` SHALL être appliqué à chaque niveau.

#### Scenario: Jeu indoor avec un plan

- **GIVEN** un jeu avec `global.indoorPlans: [{id: "rdc", name: "Rez-de-chaussée", floor: 0, image: "plan-rdc.png", origin: {lat: 48.01, lng: 2.01}, scale: 20, sizeMeters: {w: 50, h: 30}}]`
- **WHEN** la validation Draft-07 tourne
- **THEN** le jeu est accepté

#### Scenario: Plan avec scale invalide

- **GIVEN** un jeu avec `global.indoorPlans: [{id: "rdc", ..., scale: -5}]`
- **WHEN** la validation Draft-07 tourne
- **THEN** le jeu est rejeté (scale doit être > 0)

#### Scenario: Plan avec champ inconnu

- **GIVEN** un jeu avec `global.indoorPlans: [{id: "rdc", ..., champInconnu: "valeur"}]`
- **WHEN** la validation Draft-07 tourne
- **THEN** le jeu est rejeté (additionalProperties: false)

### Requirement: node.position

Le schema Draft-07 SHALL définir `position` comme objet optionnel sur chaque nœud. Si présent, il SHALL contenir :
- `planId` (string non vide)
- `x` (number, distance en mètres depuis l'origine)
- `y` (number, distance en mètres depuis l'origine)

`additionalProperties: false` SHALL être appliqué.

#### Scenario: Nœud indoor avec position

- **GIVEN** un nœud avec `position: {planId: "rdc", x: 10.5, y: 7.2}`
- **WHEN** la validation Draft-07 tourne
- **THEN** le nœud est accepté

#### Scenario: Nœud sans position

- **GIVEN** un nœud sans champ `position`
- **WHEN** la validation Draft-07 tourne
- **THEN** le nœud est accepté (champ optionnel)

#### Scenario: Position avec champ inconnu

- **GIVEN** un nœud avec `position: {planId: "rdc", x: 10, y: 7, z: 3}`
- **WHEN** la validation Draft-07 tourne
- **THEN** le nœud est rejeté (additionalProperties: false)

### Requirement: tileStrategy dans global

Le schema Draft-07 SHALL définir `global.tileStrategy` comme string optionnel avec les valeurs :
- `fixed` — tuiles fixes dans la bbox
- `viewport` — tuiles autour de la vue courante
- `radius` — tuiles dans un rayon autour des POI
- `none` — pas de tuiles pré-chargées

Si `tileStrategy` vaut `radius`, `global.tileRadiusMeters` (number > 0) SHALL être requis via `if/then`.

#### Scenario: tileStrategy radius avec rayon

- **GIVEN** un jeu avec `global.tileStrategy: "radius"` et `global.tileRadiusMeters: 500`
- **WHEN** la validation Draft-07 tourne
- **THEN** le jeu est accepté

#### Scenario: tileStrategy radius sans rayon

- **GIVEN** un jeu avec `global.tileStrategy: "radius"` et pas de `tileRadiusMeters`
- **WHEN** la validation Draft-07 tourne
- **THEN** le jeu est rejeté (champ requis via if/then)

#### Scenario: tileStrategy sans tileRadiusMeters

- **GIVEN** un jeu avec `global.tileStrategy: "fixed"` et pas de `tileRadiusMeters`
- **WHEN** la validation Draft-07 tourne
- **THEN** le jeu est accepté (rayon non requis pour fixed)

### Requirement: global.map structuré

Le schema Draft-07 SHALL définir `global.map` comme objet optionnel avec les propriétés :
- `provider` (string, ex. "osm", "maptiler")
- `bbox` (objet : `minLat`, `minLng`, `maxLat`, `maxLng` en number)
- `minZoom` (number >= 0)
- `maxZoom` (number <= 20)
- `attribution` (string optionnelle)

`additionalProperties: false` SHALL être appliqué.

#### Scenario: map avec toutes les propriétés

- **GIVEN** un jeu avec `global.map: {provider: "osm", bbox: {minLat: 48.0, minLng: 2.0, maxLat: 48.1, maxLng: 2.1}, minZoom: 10, maxZoom: 18, attribution: "© OpenStreetMap"}`
- **WHEN** la validation Draft-07 tourne
- **THEN** le jeu est accepté

#### Scenario: map avec champ inconnu

- **GIVEN** un jeu avec `global.map: {provider: "osm", tiles: "url"}`
- **WHEN** la validation Draft-07 tourne
- **THEN** le jeu est rejeté (additionalProperties: false)

### Requirement: discovery.itemId

Le schema Draft-07 SHALL ajouter `itemId` (string optionnel) au sous-schéma `discovery` pour le mode `ON_ITEM`. Le champ SHALL être requis si `mode` vaut `ON_ITEM` (via `if/then`).

#### Scenario: Discovery ON_ITEM avec itemId

- **GIVEN** un nœud avec `discovery: {mode: "ON_ITEM", itemId: "cle"}`
- **WHEN** la validation Draft-07 tourne
- **THEN** le nœud est accepté

#### Scenario: Discovery ON_ITEM sans itemId

- **GIVEN** un nœud avec `discovery: {mode: "ON_ITEM"}`
- **WHEN** la validation Draft-07 tourne
- **THEN** le nœud est rejeté (itemId requis pour ON_ITEM)

### Requirement: node.screen dans le schéma

Le schéma Draft-07 SHALL définir `screen` comme objet optionnel sur chaque nœud. Si présent, il SHALL contenir les propriétés de ScreenDefinition (layout, background, zones, transitions). `additionalProperties: false` SHALL être appliqué à chaque niveau.

#### Scenario: Nœud avec screen valide

- **GIVEN** un nœud avec `screen: { layout: "basic-story", background: { type: "color", value: "#000" } }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le nœud est accepté

#### Scenario: Nœud avec screen invalide

- **GIVEN** un nœud avec `screen: { layout: "test", unknownField: true }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le nœud est rejeté (additionalProperties: false)

### Requirement: global.screen dans le schéma

Le schéma Draft-07 SHALL définir `global.screen` comme objet optionnel de même type que `node.screen`. `global.screen` sert de template par défaut pour les nœuds sans screen.

#### Scenario: Global screen valide

- **GIVEN** un jeu avec `global.screen: { layout: "quiz-focus", background: { type: "color", value: "#1a1a2e" } }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le jeu est accepté

#### Scenario: Global screen avec champ inconnu

- **GIVEN** un jeu avec `global.screen: { layout: "test", extra: "field" }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le jeu est rejeté (additionalProperties: false)

### Requirement: Définitions Widget dans le schéma

Le schéma Draft-07 SHALL définir les types de widgets via un discrimant `type` : TextWidget, ImageWidget, ButtonWidget, ProgressBarWidget, ModuleWidget, SpacerWidget. Chaque variante SHALL imposer ses champs requis et interdire les autres (`additionalProperties: false` par variante).

#### Scenario: Widget texte valide

- **GIVEN** un widget `{ type: "text", text: "Bonjour" }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le widget est accepté

#### Scenario: Widget avec type inconnu

- **GIVED** un widget `{ type: "custom_widget" }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le widget est rejeté (type non dans l'enum)

### Requirement: Définition ZoneContent dans le schéma

Le schéma Draft-07 SHALL définir `ZoneContent` avec `layout` (enum: stack, grid, free) et `widgets` (tableau de Widget). `additionalProperties: false` SHALL être appliqué.

#### Scenario: Zone content valide

- **GIVEN** une zone avec `layout: "stack"` et un tableau de widgets
- **WHEN** la validation Draft-07 tourne
- **THEN** la zone est acceptée
