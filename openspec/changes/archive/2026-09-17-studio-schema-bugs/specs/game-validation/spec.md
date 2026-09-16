## Purpose

Ajouter les validations applicatives pour les fonctionnalités indoor, tile, et le rejet du champ `global.preset` obsolète — règles manquantes dans le validateur actuel.

## ADDED Requirements

### Requirement: Exclusion mutuelle map et indoorPlans

Le validateur applicatif SHALL rejeter un jeu contenant à la fois `global.map` (objet avec au moins une propriété) et `global.indoorPlans` (tableau non vide). Un jeu ne peut être ni outdoor (carte) ni indoor (plans) simultanément.

#### Scenario: map et indoorPlans présents

- **GIVEN** un jeu avec `global.map: {provider: "osm", ...}` et `global.indoorPlans: [{id: "rdc", ...}]`
- **WHEN** le validateur applicatif controle
- **THEN** le jeu est rejeté avec erreur "Exclusion mutuelle: map et indoorPlans ne peuvent coexister"

#### Scenario: map seul

- **GIVEN** un jeu avec `global.map: {provider: "osm"}` et pas de `indoorPlans`
- **WHEN** le validateur applicatif controle
- **THEN** le jeu est accepté

#### Scenario: indoorPlans seul

- **GIVEN** un jeu avec `global.indoorPlans: [{id: "rdc", ...}]` et pas de `global.map`
- **WHEN** le validateur applicatif controle
- **THEN** le jeu est accepté

### Requirement: Validation planId pour nœuds indoor

Le validateur applicatif SHALL vérifier que tout `position.planId` référencé par un nœud existe dans `global.indoorPlans`. Toute référence à un plan inexistant SHALL produire une erreur C2.

#### Scenario: planId valide

- **GIVEN** un jeu avec `global.indoorPlans: [{id: "rdc", ...}]` et un nœud avec `position: {planId: "rdc", x: 10, y: 5}`
- **WHEN** le validateur applicatif controle
- **THEN** le nœud est accepté

#### Scenario: planId inexistant

- **GIVEN** un jeu avec `global.indoorPlans: [{id: "rdc", ...}]` et un nœud avec `position: {planId: "etage1", x: 10, y: 5}`
- **WHEN** le validateur applicatif controle
- **THEN** le jeu est rejeté avec erreur "planId 'etage1' n'existe pas dans indoorPlans"

### Requirement: Validation scale > 0

Le validateur applicatif SHALL vérifier que chaque plan dans `global.indoorPlans` a un `scale` strictement positif.

#### Scenario: scale positif

- **GIVEN** un jeu avec `global.indoorPlans: [{id: "rdc", scale: 20, ...}]`
- **WHEN** le validateur applicatif controle
- **THEN** le plan est accepté

#### Scenario: scale négatif ou nul

- **GIVEN** un jeu avec `global.indoorPlans: [{id: "rdc", scale: 0, ...}]`
- **WHEN** le validateur applicatif controle
- **THEN** le jeu est rejeté avec erreur "scale du plan 'rdc' doit être > 0"

### Requirement: Warning nœud indoor avec GEOFENCE

Le validateur applicatif SHALL émettre un avertissement (pas un rejet) lorsqu'un nœud possède à la fois une `position` (indoor) et une condition `GEOFENCE` dans son activation. Ces deux mécanismes de localisation sont généralement incompatibles.

#### Scenario: Nœud indoor avec GEOFENCE

- **GIVEN** un nœud avec `position: {planId: "rdc", x: 10, y: 5}` et une condition `GEOFENCE` dans `activation.requires`
- **WHEN** le validateur applicatif controle
- **THEN** un avertissement est émis mais le jeu n'est pas rejeté

#### Scenario: Nœud indoor sans GEOFENCE

- **GIVEN** un nœud avec `position: {planId: "rdc", x: 10, y: 5}` et aucune condition GEOFENCE
- **WHEN** le validateur applicatif controle
- **THEN** aucun avertissement

### Requirement: Validation tileRadiusMeters pour strategy radius

Le validateur applicatif SHALL vérifier que `global.tileRadiusMeters` est > 0 lorsque `global.tileStrategy` vaut `radius`.

#### Scenario: tileRadiusMeters valide

- **GIVEN** un jeu avec `global.tileStrategy: "radius"` et `global.tileRadiusMeters: 500`
- **WHEN** le validateur applicatif controle
- **THEN** accepté

#### Scenario: tileRadiusMeters invalide

- **GIVEN** un jeu avec `global.tileStrategy: "radius"` et `global.tileRadiusMeters: -100`
- **WHEN** le validateur applicatif controle
- **THEN** rejeté avec erreur "tileRadiusMeters doit être > 0 quand tileStrategy est radius"

### Requirement: Warning tileStrategy none avec map

Le validateur applicatif SHALL émettre un avertissement lorsque `global.tileStrategy` vaut `"none"` mais que `global.map` est présent (objet avec propriétés). C'est une incohérence : une carte configurée sans stratégie de tuiles.

#### Scenario: tileStrategy none avec map

- **GIVEN** un jeu avec `global.tileStrategy: "none"` et `global.map: {provider: "osm", ...}`
- **WHEN** le validateur applicatif controle
- **THEN** un avertissement est émis

#### Scenario: tileStrategy fixed avec map

- **GIVEN** un jeu avec `global.tileStrategy: "fixed"` et `global.map: {provider: "osm", ...}`
- **WHEN** le validateur applicatif controle
- **THEN** aucun avertissement

### Requirement: Rejet de global.preset obsolète

Le validateur applicatif SHALL rejeter tout jeu contenant `global.preset` (champ supprimé du schema). Le message SHALL indiquer d'utiliser `global.experienceStyle.preset` à la place.

#### Scenario: Jeu avec global.preset

- **GIVEN** un jeu avec `global.preset: "BASIC"`
- **WHEN** le validateur applicatif controle
- **THEN** le jeu est rejeté avec erreur "global.preset est obsolète, utilisez global.experienceStyle.preset"

#### Scenario: Jeu sans global.preset

- **GIVEN** un jeu sans `global.preset`
- **WHEN** le validateur applicatif controle
- **THEN** aucun rejet lié à preset
