# game-validation Specification

## Purpose

Definit la double couche de validation GeoPlay garantissant qu'un Jeu invalide ne part jamais sur le terrain.

## Requirements

### Requirement: Double couche Draft-07 plus applicative

Tout Jeu SHALL passer successivement la validation JSON Schema Draft-07
(forme locale : types, requis, `operator` obligatoire si >=2 conditions via
`if/then` et interdit si <=1, `isEnding` present, `activation` bien formee,
`onReentry:replay` exigeant `maxReentries`, enum des conditions fermée
incluant `PROXIMITY_MASTER`, `withReplacement` exclu, `additionalProperties:
false`) puis le validateur applicatif (CLI/Studio) pour tout le reste :
cycles, atteignabilite, topo pools, `drawCount<=len`, unicite, AND-exclusif
direct. Un JSON valide Draft-07 SHALL pouvoir rester invalide tant que la
seconde couche n'est pas passee, et les deux etapes SHALL etre documentees
comme distinctes, chacune avec le verdict de sa couche. Le validateur
SHALL aussi verifier la coherence HOLD : si `global.holdMode != "none"`
alors `global.holdExit.method` est present ; tout module avec
`needsLock: true` exige `holdMode != "none"`.

#### Scenario: Forme OK mais graphe casse

- **GIVEN** un JSON bien forme Draft-07 avec un cycle `A<->B` non autorise
- **WHEN** les deux couches tournent
- **THEN** la premiere passe et la seconde rejette avec erreur de cycle

#### Scenario: HOLD incoherent rejeté

- **GIVEN** un Jeu avec `holdMode: "lockTask"` et pas de `holdExit`
- **WHEN** la validation couche 1+2 tourne
- **THEN** le Jeu est rejete avec erreur de coherence HOLD

### Requirement: Validation applicative HOLD

Le validateur applicatif SHALL verifier la coherence HOLD :
`holdExit` present si `holdMode != "none"`, format PIN/geste valide,
et tout module `needsLock: true` a un `holdMode` actif. Un module
`needsLock: true` avec `holdMode: "none"` est structurellement
inatteignable et rejeté.

#### Scenario: Module besoin verrouillage sans HOLD

- **GIVEN** un jeu avec module `needsLock: true` et `holdMode: "none"`
- **WHEN** le validateur applicatif controle
- **THEN** le jeu est rejete avec le module fautif identifié

### Requirement: Draft-07 HOLD

Le schema Draft-07 SHALL contenir `global.holdMode` enum valide
(`"none"|"guidedAccess"|"screenPinning"|"lockTask"`), `global.holdExit`
objet avec `method` requis si `holdMode != "none"` (via `allOf` if/then).

#### Scenario: Draft-07 rejette holdMode sans holdExit

- **GIVEN** un JSON avec `global.holdMode: "lockTask"` et pas de
  `global.holdExit`
- **WHEN** la validation Draft-07 tourne
- **THEN** elle rejette avec erreur de champs manquants

#### Scenario: Draft-07 accepte holdMode complet

- **GIVEN** un JSON avec `global.holdMode: "lockTask"` et
  `global.holdExit.method: "adminPin"`
- **WHEN** la validation Draft-07 tourne
- **THEN** elle accepte

### Requirement: Regles applicatives obligatoires

Le validateur applicatif SHALL verifier : construction du graphe de
dependances en ignorant les aretes `allowCycle:true` puis rejet de tout
cycle residuel ; atteignabilite d'un `isEnding` sous hypothese explicite
d'environnement favorable ; `RANDOM_POOL` et `OR` comme alternatifs ;
chaque candidat de pool vers un `isEnding` ; detection AND-sur-branches-
exclusives limitee au cas direct (enfants `NODE_COMPLETED` directs vers
candidats distincts d'un meme pool `drawCount:1`, sans fermeture
transitive) ; ordre topo des pools `ON_GAME_START` et rejet des cycles
inter-pools ; rejet d'un pool `ON_GAME_START` dependant d'un candidat de
pool `ON_POOL_ACTIVATION` ; `drawCount<=candidates.length` ; unicite d'un
`nodeId` dans un seul pool. La limite transitive SHALL etre documentee
comme volontaire (pas de solveur complet au socle) avec consigne de garder
les convergences de branches peu profondes.

#### Scenario: Convergence profonde non garantie

- **GIVEN** deux branches de pool qui convergent apres 3 noeuds intermediaires vers un AND
- **WHEN** le validateur applicatif controle
- **THEN** il ne promet pas de detecter l'inatteignabilite et le documente comme limite connue

### Requirement: Hypothese environnement jamais presentee comme preuve

Le validateur ne SHALL jamais pretendre prouver qu'un GPS entrera dans un
rayon ni qu'un `TIMER` sera observe ; sa garantie SHALL etre libellee
atteignabilite structurelle sous hypothese d'environnement favorable, avec
`GEOFENCE`/`TIMER` supposes pouvoir devenir vrais.

#### Scenario: Libelle de garantie

- **GIVEN** un Jeu valide par le validateur
- **WHEN** le rapport est genere
- **THEN** il mentionne l'hypothese d'environnement favorable au lieu d'une garantie d'execution

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

### Requirement: Validation applicative des recettes

Le validateur applicatif SHALL vérifier chaque recette : tout `itemId` d'entrée et `output` SHALL exister dans `objects[]` ; `inputs` SHALL compter au moins 2 entrées ; `output` SHALL NE PAS figurer parmi les entrées (rejet anti-farming immédiat) ; une entrée avec `consume: true` SHALL référencer un objet `consumable: true` (même règle que `ITEM_USED`, symétrie assumée). La détection de cycles transitifs (A→B→A) SHALL être documentée comme limite volontaire sans solveur complet, comme pour la règle AND-sur-branches-exclusives du socle.

#### Scenario: Sortie auto-produite rejetée
- **GIVEN** une recette `cle + poudre → cle`
- **WHEN** le validateur applicatif tourne
- **THEN** le jeu est rejeté (sortie parmi les entrées), nœud et recette nommés

#### Scenario: Entrée consommée non consommable rejetée
- **GIVEN** une recette consommant `loupe` (`consumable: false`)
- **WHEN** le validateur tourne
- **THEN** le jeu est rejeté avec l'objet fautif nommé

#### Scenario: Référence orpheline rejetée
- **GIVEN** une recette référençant `objet_inexistant`
- **WHEN** le validateur tourne
- **THEN** le jeu est rejeté avec la référence fautive nommée
