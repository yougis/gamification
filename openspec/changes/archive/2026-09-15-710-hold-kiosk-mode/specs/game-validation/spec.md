## Purpose

La double couche de validation GeoPlay garantit qu'un Jeu invalide
ne part jamais sur le terrain. Le mode HOLD ajoute des regles
applicatives pour verifier la cohérence entre `holdMode` et `holdExit`.

## MODIFIED Requirements

### Requirement: Double couche Draft-07 plus applicative

Tout Jeu SHALL passer successivement la validation JSON Schema
Draft-07 (forme locale : types, requis, `operator` obligatoire si >=2
conditions via `if/then` et interdit si <=1, `isEnding` present,
`activation` bien formee, `onReentry:replay` exigeant `maxReentries`,
enum des conditions fermee incluant `PROXIMITY_MASTER`, `withReplacement`
exclu, `additionalProperties:false`) puis le validateur applicatif
(CLI/Studio) pour tout le reste : cycles, atteignabilite, topo pools,
`drawCount<=len`, unicite, AND-exclusif direct, **et maintenant la
cohérence `holdMode`/`holdExit`/`needsLock`**. Un JSON valide Draft-07
SHALL pouvoir rester invalide tant que la seconde couche n'est pas
passee, et les deux étapes SHALL etre documentees comme distinctes,
chaque une avec le verdict de sa couche. Le validateur
SHALL aussi verifier la coherence HOLD : si `global.holdMode != "none"`
alors `global.holdExit.method` est present ; tout module avec
`needsLock: true` exige `holdMode != "none"`.

#### Scenario: Forme OK mais graphe casse

- **GIVEN** un JSON bien forme Draft-07 avec un cycle `A<->B` non autorise
- **WHEN** les deux couches tournent
- **THEN** la premiere passe et la seconde rejette avec erreur de cycle

#### Scenario: Forme OK mais holdMode incohérent

- **GIVEN** un JSON bien forme Draft-07 avec `holdMode: "lockTask"`
  et `holdExit.method` absent
- **WHEN** les deux couches tournent
- **THEN** la premiere passe et la seconde rejette avec erreur
  holdExit manquant

#### Scenario: HOLD incoherent rejeté

- **GIVEN** un Jeu avec `holdMode: "lockTask"` et pas de `holdExit`
- **WHEN** la validation couche 1+2 tourne
- **THEN** le Jeu est rejete avec erreur de coherence HOLD

### Requirement: Validation applicative HOLD

Le validateur applicatif SHALL verifier, quand `global.holdMode !=
"none"` :
1. `global.holdExit` est present et complet (method obligatoire)
2. `holdExit.method` est un des valores de l'enum supportées
3. `holdExit.pin` est present si `method` requiert un PIN
4. `holdExit.adminPanel.enabled` est vrai si `method:
   "adminPanel"` ou equivalent
5. Si un module `needsLock: true` est present, `holdMode` ne peut
   pas etre `"none"`
6. Le PIN n'est pas en clair dans le JSON source (verifie en
   couche applicative, pas en Draft-07 car le chiffrement est un
   detail d'implementation)

#### Scenario: holdMode sans holdExit rejeté

- **GIVEN** un JSON avec `global.holdMode: "guidedAccess"` et pas de
  `global.holdExit`
- **WHEN** le validateur applicatif tourne
- **THEN** le Jeu est rejete avec erreur "holdExit requis quand
  holdMode != none"

#### Scenario: Module needsLock sans HOLD rejeté

- **GIVEN** un JSON avec un module `needsLock: true` et
  `global.holdMode: "none"`
- **WHEN** le validateur applicatif tourne
- **THEN** le Jeu est rejete avec erreur "Module X nécessite
  holdMode != none"

#### Scenario: Module besoin verrouillage sans HOLD

- **GIVEN** un jeu avec module `needsLock: true` et
  `holdMode: "none"`
- **WHEN** le validateur applicatif controle
- **THEN** le jeu est rejete avec le module fautif identifié

#### Scenario: Configuration HOLD complete validee

- **GIVEN** `holdMode: "lockTask"`, `holdExit.method: "adminPin"`,
  module `needsLock: true`
- **WHEN** le validateur applicatif tourne
- **THEN** le Jeu est accepte, le verrouillage kiosque peut
  s'activer

### Requirement: Draft-07 HOLD

La validation Draft-07 SHALL accepter `global.holdMode` et
`global.holdExit` comme champs supplementaires du schema racine.
`holdMode` SHALL valoir `"none"`, `"guidedAccess"`, `"screenPinning"`,
ou `"lockTask"`. `holdExit` SHALL etre un objet avec `method` (string
enum) et optionnellement `pin` (string) et `adminPanel` (objet).
`additionalProperties:false` est maintenu — ces champs sont les seuls
ajouts autorises a `global`.

#### Scenario: holdMode valeur invalide

- **GIVEN** `global.holdMode: "invalidValue"`
- **WHEN** la validation Draft-07 tourne
- **THEN** elle rejette (valeur en dehors de l'enum)

#### Scenario: holdExit incomplet en Draft-07

- **GIVEN** `global.holdMode: "guidedAccess"`, `global.holdExit: {}`
  (method absent)
- **WHEN** la validation Draft-07 tourne
- **THEN** elle rejette (requis conditionnel via if/then : si
  holdMode != none alors holdExit.method est requis)

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

### Requirement: Hypothese environnement jamais presentee comme preuve

Le validateur ne SHALL jamais pretendre prouver qu'un GPS entrera
dans un rayon ni qu'un `TIMER` sera observe ; sa garantie SHALL etre
libellee atteignabilite structurelle sous hypothese d'environnement
favorable, avec `GEOFENCE`/`TIMER` supposes pouvoir devenir vrais.
**Le validateur ne SHALL jamais pretendre prouver que l'animateur
entrera le PIN correct ; la garantie HOLD est structurelle** : la
configuration est complete, mais l'execution depend de l'animateur.

#### Scenario: Libelle de garantie

- **GIVEN** un Jeu valide par le validateur
- **WHEN** le rapport est genere
- **THEN** il mentionne l'hypothese d'environnement favorable
  au lieu d'une garantie d'execution

#### Scenario: Libelle de garantie HOLD

- **GIVEN** un Jeu valide par le validateur avec HOLD configure
- **WHEN** le rapport est genere
- **THEN** il mentionne "configuration HOLD complete, sortie animateur
  sous hypothese d'acces au panneau admin" au lieu d'une garantie
  que l'animateur entrera le PIN