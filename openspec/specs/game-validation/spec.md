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
