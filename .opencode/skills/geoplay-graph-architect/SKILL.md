---
name: geoplay-graph-architect
description: Modelise ou valide le graphe oriente d'un Jeu GeoPlay (Noeuds, activation, latch, cycles, pools, terminaison). A utiliser pour concevoir un parcours, relire un graphe auteur ou preparer le change 100.
---

# Skill : geoplay-graph-architect

Expert en modelisation de graphes de jeu pour le framework GeoPlay natif (iOS + Android).

## Regles inviolables

- Un Jeu est un **graphe oriente**, jamais une liste d'etapes. Un Noeud = une instance
  d'un Module du registre. Pas d'objet Lien isole : chaque Noeud porte son objet
  unique `activation {requires[], operator}`.
- Aucune valeur en dur : rayons, overrides, predicats, seuils, URLs, bbox/zooms se
  lisent dans le JSON du Jeu.

## Semantique a appliquer (socle 000)

1. **Fan-in** : `operator` (`AND`/`OR`) obligatoire des que `requires` a >= 2
   conditions, interdit si <= 1. Un JSON a >= 2 prerequis sans operateur est invalide,
   jamais interprete par defaut.
2. **Etats** : `LOCKED -> UNLOCKED -> ACTIVE -> COMPLETED`. `UNLOCKED` = eligible,
   `ACTIVE` = presente. Une seule modale `ACTIVE` a la fois, file d'attente :
   `GEOFENCE`/`TIMER` passent auto, `NODE_COMPLETED`/`POOL_DRAWN` multiples se
   presentent comme un choix, jamais empiles.
3. **Latch** : `activation.latch` par noeud. `true` = reste `UNLOCKED` une fois
   debloque. `false` = retour `LOCKED` si les conditions revocables retombent
   (ex. sortie de geofence, avec hysteresis entree/sortie + dwell). Seules
   `GEOFENCE` et `WINDOW` sont revocables. `ACTIVE` latche toujours : une modale
   ouverte ne se ferme jamais a la sortie de zone.
4. **Conditions socle** : `GEOFENCE` (lat, lng, radiusMeters + override, predicat
   `enter|exit|dwell|through`, dwellMs, hysteresis, maxAccuracyM),
   `NODE_COMPLETED {nodeId}`, `TIMER` (delai minimum, ancre obligatoire
   `GAME_START` ou `NODE_COMPLETION` + `anchorNodeId`), `POOL_DRAWN {poolNodeId}`.
   `CONDITIONAL` et `WINDOW` sont reserves dans l'enum, non outilles au socle.
5. **Cycles et rejeu** : `allowCycle` = propriete d'arete, `false` par defaut
   (topologie logique). `onReentry` = propriete de noeud, `ignore` par defaut
   (execution terrain). `replay` exige `maxReentries` (rejeux apres la 1ere
   completion) + `scoreOnReplay` (defaut `false` : seule la 1ere completion score).
6. **Terminaison** : au moins un Noeud `isEnding: true`. Fin = un `isEnding` passe
   `COMPLETED`. Chaque candidat de pool doit individuellement atteindre un `isEnding`.
   La garantie du validateur est une atteignabilite structurelle sous hypothese
   d'environnement favorable, jamais une preuve d'execution.
7. **RANDOM_POOL** : noeud structurel `LOCKED -> (tirage) -> COMPLETED`, jamais
   `ACTIVE`. `randomPool {candidates[], drawCount, drawTiming
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
  La semantique normative reste ici et dans les specs 000.
