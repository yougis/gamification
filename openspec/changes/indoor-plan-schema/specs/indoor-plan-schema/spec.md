## Purpose

Définit le schéma JSON pour les jeux indoor GeoPlay : plans d'étage en repère local métrique, positionnement des nœuds sur les plans, et exclusion mutuelle avec les jeux outdoor (GPS).

## ADDED Requirements

### Requirement: Plans d'étage dans global

Le jeu SHALL pouvoir définir `global.indoorPlans` comme tableau optionnel de plans d'étage. Chaque plan SHALL contenir :
- `id` (string unique dans le jeu) : identifiant du plan
- `name` (string) : nom affiché (ex. "Rez-de-chaussée")
- `floor` (integer) : numéro d'étage (0 = RDC, négatif = sous-sol)
- `image` (string) : chemin vers l'image du plan dans le pack
- `origin` (objet : `{lat, lng}`) : point d'ancrage dans le monde réel (WGS84)
- `scale` (number) : pixels par mètre
- `sizeMeters` (objet : `{w, h}`) : dimensions physiques du plan en mètres

Si `indoorPlans` est absent, le jeu est considéré comme outdoor (GPS).

#### Scenario: Jeu avec 2 étages
- **GIVEN** un jeu avec `global.indoorPlans: [{id: "rdc", name: "RDC", floor: 0, ...}, {id: "etage1", name: "Étage 1", floor: 1, ...}]`
- **WHEN** la validation Draft-07 tourne
- **THEN** le jeu est accepté

#### Scenario: Plan sans image
- **GIVEN** un jeu avec `global.indoorPlans` contenant un plan sans champ `image`
- **WHEN** la validation Draft-07 tourne
- **THEN** le jeu est rejeté (champ requis manquant)

### Requirement: Position des nœuds indoor

Un nœud SHALL pouvoir porter un champ optionnel `position` avec :
- `planId` (string) : référence à un plan existant dans `indoorPlans`
- `x` (number) : position en mètres depuis l'origine du plan (axe horizontal)
- `y` (number) : position en mètres depuis l'origine du plan (axe vertical)

Un nœud sans `position` est considéré comme nœud structurel (pool, start, fin) ou outdoor.

#### Scenario: Nœud avec position valide
- **GIVEN** un nœud avec `position: {planId: "rdc", x: 12.5, y: 3.2}` et un plan "rdc" dans `indoorPlans`
- **WHEN** la validation applicative tourne
- **THEN** le nœud est accepté

#### Scenario: Nœud avec planId inexistant
- **GIVEN** un nœud avec `position: {planId: "inexistant", x: 0, y: 0}`
- **WHEN** la validation applicative tourne
- **THEN** le jeu est rejeté avec erreur "planId 'inexistant' non défini dans indoorPlans"

### Requirement: Exclusion mutuelle map/indoorPlans

Un jeu SHALL définir `global.map` OU `global.indoorPlans`, jamais les deux. Si les deux sont présents, le jeu SHALL être rejeté en couche 1 (Draft-07) ou couche 2 (applicatif).

#### Scenario: Jeu avec map uniquement
- **GIVEN** un jeu avec `global.map` et sans `global.indoorPlans`
- **WHEN** la validation tourne
- **THEN** le jeu est accepté (outdoor)

#### Scenario: Jeu avec indoorPlans uniquement
- **GIVEN** un jeu avec `global.indoorPlans` et sans `global.map`
- **WHEN** la validation tourne
- **THEN** le jeu est accepté (indoor)

#### Scenario: Jeu avec map et indoorPlans
- **GIVEN** un jeu avec `global.map` ET `global.indoorPlans`
- **WHEN** la validation tourne
- **THEN** le jeu est rejeté avec erreur "map et indoorPlans mutuellement exclusifs"

### Requirement: Cohérence scale et origin

Le validateur applicatif SHALL vérifier que chaque plan indoor a un `scale` > 0 et que `origin` contient `lat` et `lng` dans les bornes valides (-90 à 90 pour lat, -180 à 180 pour lng).

#### Scenario: Scale négatif rejeté
- **GIVEN** un plan avec `scale: -5`
- **WHEN** la validation applicative tourne
- **THEN** le jeu est rejeté avec erreur "scale doit être positif"

#### Scenario: Origin hors bornes rejeté
- **GIVEN** un plan avec `origin: {lat: 91, lng: 2.0}`
- **WHEN** la validation applicative tourne
- **THEN** le jeu est rejeté avec erreur "lat hors bornes (-90 à 90)"
