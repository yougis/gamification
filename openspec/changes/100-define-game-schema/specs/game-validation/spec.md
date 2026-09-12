## MODIFIED Requirements

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
comme distinctes, chacune avec le verdict de sa couche.

#### Scenario: Forme OK mais graphe casse

- **GIVEN** un JSON bien forme Draft-07 avec un cycle `A<->B` non autorise
- **WHEN** les deux couches tournent
- **THEN** la premiere passe et la seconde rejette avec erreur de cycle
