## Purpose

Compléter le schema Draft-07 avec les types indoor, tile, map structurée et discovery.itemId — champs définis en TypeScript mais absents du schema, rendant tout jeu utilisant ces fonctionnalités invalide en couche 1.

## ADDED Requirements

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
