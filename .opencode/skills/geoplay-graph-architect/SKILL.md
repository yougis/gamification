---
name: geoplay-graph-architect
description: Modelise ou valide le graphe oriente d'un Jeu GeoPlay (Noeuds, activation, latch, cycles, pools, terminaison). A utiliser pour concevoir un parcours, relire un graphe auteur ou preparer un change 9xx.
---

# Skill : geoplay-graph-architect

Expert en modelisation de graphes de jeu pour le framework GeoPlay natif (iOS + Android).

## Regles inviolables

- Un Jeu est un **graphe oriente**, jamais une liste d'etapes. Un Noeud = une instance
  d'un Module du registre. Pas d'objet Lien isole : chaque Noeud porte son objet
  unique `activation {requires[], operator}`.
- Aucune valeur en dur : rayons, overrides, predicats, seuils, URLs, bbox/zooms se
  lisent dans le JSON du Jeu.

## Semantique a appliquer (specs actives, cycle sans ACTIVE)

1. **Fan-in** : `operator` (`AND`/`OR`) obligatoire des que `requires` a >= 2
   conditions, interdit si <= 1. Un JSON a >= 2 prerequis sans operateur est invalide,
   jamais interprete par defaut.
2. **Etats** : `LOCKED -> UNLOCKED -> COMPLETED`. Pas d'etat `ACTIVE`. `UNLOCKED` =
   eligible et presentable ; plusieurs noeuds peuvent etre `UNLOCKED` simultanement
   et le joueur choisit librement, sans file d'attente ni modale imposee.
3. **Latch** : `latch` par noeud (defaut `true`). `true` = reste `UNLOCKED` une fois
   debloque. `false` = retour `LOCKED` si les conditions revocables retombent
   (ex. sortie de geofence, avec hysteresis entree/sortie + dwell). Seules
   `GEOFENCE` et `WINDOW` sont revocables. Un ecran ouvert survit a la sortie
   de zone (ni expulsion, ni re-entree).
4. **Conditions** : `GEOFENCE` (lat, lng, radiusMeters + override, predicat
   `in|out|dwell|through`, dwellMs, hysteresis, maxAccuracyM),
   `NODE_COMPLETED {nodeId}`, `TIMER` (delai minimum, ancre `GAME_START` ou
   `NODE_COMPLETION` + `anchorNodeId`), `POOL_DRAWN {poolNodeId}`,
   `PROXIMITY_MASTER` (masterId, transport ble|wifi, seuils depuis JSON),
   `WINDOW` (fenetre relative GAME_START : apresSecondes/avantSecondes, revocable
   a l'echeance meme si latch:true), `ITEM_REQUIRED`/`ITEM_USED`/`CODE_INPUT`/
   `CLUE_RESOLVED` (references validees en C2). `CONDITIONAL` reste reserve.
5. **Cycles et rejeu** : `allowCycle` = propriete d'arete, `false` par defaut
   (topologie logique). `onReentry` = propriete de noeud, `ignore` par defaut
   (execution terrain). `replay` exige `maxReentries` (rejeux apres la 1ere
   completion) + `scoreOnReplay` (defaut `false` : seule la 1ere completion score).
6. **Terminaison** : au moins un Noeud `isEnding: true`, sauf cas HOME-seul
   (`nodes: []` accepte si et seulement si HOME figure dans global.presentation ;
   session sans fin assumee, sortie par Quitter). Fin = un `isEnding` passe
   `COMPLETED`. Chaque candidat de pool doit individuellement atteindre un `isEnding`.
   La garantie du validateur est une atteignabilite structurelle sous hypothese
   d'environnement favorable, jamais une preuve d'execution.
7. **RANDOM_POOL** : noeud structurel `LOCKED -> (tirage) -> COMPLETED`, jamais
   d'etat intermediaire. `randomPool {candidates[], drawCount, drawTiming
   ON_POOL_ACTIVATION|ON_GAME_START}`, sans remise. Persistance immediate dans
   `randomDraws[sessionId][poolNodeId]`, jamais recalcule (Reprendre = meme session,
   Nouvelle partie = nouvelle session). Tirage forcable (`forceDraw`) en
   triche/preview, avec flag triche pour le scoring.

## Instructions

- Pour un cas "1er POI aleatoire parmi N" : 1 noeud `RANDOM_POOL` + condition
  `POOL_DRAWN` sur les N candidats, chacun avec son chemin vers un `isEnding`.
- Signale tout AND exigeant 2 candidats distincts d'un meme pool a `drawCount: 1`
  (structurellement inatteignable, cas direct).
- Signale toute valeur codee en dur et tout type/condition hors enum sans regle
  de compat (ignore gracieux documente).
- Pour l'execution runtime (lifecycle, boucle d'evaluation, batterie, pipelines
  capteurs, hote de modules, injection du theme) : voir `geoplay-runtime-engine`.
  La semantique normative reste ici et dans les specs actives (game-graph, game-triggers, game-validation).
