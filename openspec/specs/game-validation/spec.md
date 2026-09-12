# game-validation Specification

## Purpose

Definit la double couche de validation GeoPlay garantissant qu'un Jeu invalide ne part jamais sur le terrain.

## Requirements

### Requirement: Double couche Draft-07 plus applicative

Tout Jeu SHALL passer successivement la validation JSON Schema Draft-07
(forme locale : types, requis, `operator` obligatoire si >=2 conditions via
`if/then`, `isEnding` present, `activation` bien formee) puis le validateur
applicatif (CLI/Studio) pour tout le reste. Un JSON valide Draft-07 SHALL
pouvoir rester invalide tant que la seconde couche n'est pas passee, et les
deux etapes SHALL etre documentees comme distinctes dans le change
`100-define-game-schema`.

#### Scenario: Forme OK mais graphe casse

- **GIVEN** un JSON bien forme Draft-07 avec un cycle `A<->B` non autorise
- **WHEN** les deux couches tournent
- **THEN** la premiere passe et la seconde rejette avec erreur de cycle

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
