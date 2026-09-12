## Purpose

Definit les conditions d'activation du socle GeoPlay et le noeud structurel RANDOM_POOL, reserves comprises.

## ADDED Requirements

### Requirement: GEOFENCE parametre depuis le JSON

Toute condition `GEOFENCE` SHALL lire depuis le JSON : `lat`, `lng`,
`radiusMeters` (avec override par Noeud du rayon global), `predicate`
(`enter|exit|dwell|through`), `dwellMs`, hysteresis de sortie
(rayon ou delai distincts de l'entree) et gating `maxAccuracyM`. Aucune de
ces valeurs ne SHALL etre une constante du code. La qualification de position repose
sur accuracy + dwell seuls.

#### Scenario: Entree avec dwell anti-traversee voiture

- **GIVEN** un POI `predicate:dwell dwellMs:10000 radiusMeters:30`
- **WHEN** le joueur traverse le rayon en 20 s sans s'arreter
- **THEN** le Noeud devient `UNLOCKED`, mais une traversee de 3 s ne l'active pas

#### Scenario: Through corridor sans arret

- **GIVEN** un passage `predicate:through corridorWidthM:20`
- **WHEN** le joueur traverse le corridor sans s'arreter
- **THEN** le Noeud devient `UNLOCKED` sur historique de positions, pas sur distance instantanee

### Requirement: NODE_COMPLETED et TIMER ancres

`NODE_COMPLETED {nodeId}` SHALL devenir vrai a `COMPLETED` du noeud cite et
rester vrai. `TIMER` est un delai minimum avant eligibilite, jamais une
echeance, avec `anchor` obligatoire (`GAME_START` ou `NODE_COMPLETION` +
`anchorNodeId`). Le temps limite de reponse interne a un module
(`timeLimitSeconds` + `onTimeout` du Quiz) ne SHALL jamais etre une condition
d'activation du graphe.

#### Scenario: Timer depuis completion

- **GIVEN** un Noeud `TIMER anchor:NODE_COMPLETION anchorNodeId:poi-a delai:300s`
- **WHEN** 300 s se sont ecoulees depuis `poi-a COMPLETED`
- **THEN** le Noeud devient `UNLOCKED`, pas avant

### Requirement: RANDOM_POOL noeud structurel ensemence

`RANDOM_POOL` SHALL etre un noeud jamais presente au joueur traversant
`LOCKED -> (tirage) -> COMPLETED` sans `ACTIVE`, avec
`randomPool {candidates[], drawCount, drawTiming ON_POOL_ACTIVATION|ON_GAME_START}`.
Tirage sans remise au socle (`withReplacement` supprime).
`ON_POOL_ACTIVATION` tire quand le pool devient `UNLOCKED`,
`ON_GAME_START` tire a l'init de session avant toute evaluation, en ordre
topologique si un pool `ON_GAME_START` depend d'un autre (cycle inter-pools
rejete). Un pool `ON_GAME_START` ne SHALL pas dependre d'un candidat de pool
`ON_POOL_ACTIVATION`. Un `nodeId` ne SHALL apparaitre que dans un seul pool.
Le resultat SHALL etre ecrit immediatement dans
`randomDraws[sessionId][poolNodeId]` et jamais recalcule : Reprendre = meme
`sessionId` relit, Nouvelle partie = nouveau `sessionId` retire. Les candidats
referencent le pool via `{type:POOL_DRAWN, poolNodeId}`. Le tirage SHALL
pouvoir etre force (`forceDraw:[...]`) en triche/preview avec flag triche
pour le scoring.

#### Scenario: Tirage direct 1 parmi 5

- **GIVEN** un pool `candidates:[a,b,c,d,e] drawCount:1 ON_POOL_ACTIVATION`
- **WHEN** le pool devient `UNLOCKED`
- **THEN** exactement 1 candidat devient eligible via `POOL_DRAWN` et le resultat est persiste immediatement

#### Scenario: Relance ne re-tire pas

- **GIVEN** une session avec tirage `pool->c` persiste
- **WHEN** l'app relance avec le meme `sessionId` entre l'intro et le POI
- **THEN** aucun re-tirage n'a lieu et le geofencing reste sur `c`

#### Scenario: Dependance boot invalide rejetee

- **GIVEN** un pool `ON_GAME_START` dont l'activation depend d'un candidat de
  pool `ON_POOL_ACTIVATION`
- **WHEN** le validateur controle l'ordonnancement
- **THEN** le Jeu est rejete

### Requirement: Reserves CONDITIONAL et WINDOW non outillees

L'enum des conditions SHALL contenir `CONDITIONAL` (branchement gamebook sur
reponse) et `WINDOW` (fenetre horaire absolue `{from,to,timezone,onMiss}`)
comme reserves : presentes pour eviter un breaking change, non outillees par
le Studio au socle, comportement `onMiss`/recurrence non defini. Le moteur
SHALL ignorer gracieusement un type reserve ou inconnu au socle.

#### Scenario: Type reserve ignore sans crash

- **GIVEN** un Jeu contenant une condition `WINDOW` lue par le moteur v0
- **WHEN** le moteur evalue les activations
- **THEN** il n'echoue pas et documente l'ignorance au lieu d'activer ou de crasher
