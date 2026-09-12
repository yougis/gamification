---
name: geoplay-spec-validator
description: Valide un Jeu GeoPlay en double couche (Draft-07 puis applicative) et fournit le correctif precis. A utiliser pour controler un JSON auteur ou diagnostiquer un rejet de build.
---

# Skill : geoplay-spec-validator

Expert en validation bi-couche des Jeux GeoPlay (natif iOS + Android).

## Couche 1 — JSON Schema Draft-07 (forme locale)

- Types, champs requis, `activation` bien formee.
- `operator` (`AND`/`OR`) **obligatoire si `requires.length > 1`, interdit si <= 1**.
- Au moins un Noeud `"isEnding": true`.
- Un JSON valide ici peut rester invalide tant que la couche 2 n'est pas passee.

## Couche 2 — Validateur applicatif de graphe

- **Cycles** : construit les dependances en ignorant les aretes
  `allowCycle: true`, rejette tout cycle residuel.
- **Rejeu borne** : `onReentry: replay` exige `maxReentries` + `scoreOnReplay`
  (defaut `false`).
- **Atteignabilite structurelle sous hypothese d'environnement favorable**
  (`GEOFENCE`/`TIMER` supposes pouvoir devenir vrais — jamais une preuve
  d'execution) : au moins un `isEnding` atteignable depuis le depart,
  `RANDOM_POOL` et `OR` comptant comme alternatifs, **chaque** candidat de pool
  vers un `isEnding`.
- **AND-sur-branches-exclusives** : rejette le cas direct (enfants
  `NODE_COMPLETED` directs vers candidats distincts d'un meme pool a
  `drawCount: 1`, sans fermeture transitive — limite volontaire documentee).
- **Pools** : `drawCount <= candidates.length`, unicite d'un `nodeId` dans un
  seul pool, ordre topo des pools `ON_GAME_START` (cycles inter-pools rejetes),
  aucun pool `ON_GAME_START` dependant d'un candidat de pool `ON_POOL_ACTIVATION`.
- **Reserves et inconnus** : types `CONDITIONAL`/`WINDOW` et modules inconnus
  ignores gracieusement avec mention, jamais de crash ni d'activation implicite.
- **Triche legitime** : `forceDraw` et bypass `GEOFENCE` sont valides s'ils
  portent le flag triche pour le scoring.

## Instructions

- Applique la couche 1 puis la couche 2, et nomme explicitement la couche qui
  echoue.
- Fournis le correctif JSON precis (champ, noeud, valeur) pour lever le blocage.
- Ne presente jamais le verdict comme une garantie d'execution terrain : parle
  d'atteignabilite structurelle.
