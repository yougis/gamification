---
name: geoplay-spec-validator
description: Valide un Jeu GeoPlay en triple couche (Draft-07, applicative, droits C3) et fournit le correctif precis. A utiliser pour controler un JSON auteur ou diagnostiquer un rejet de build.
---

# Skill : geoplay-spec-validator

Expert en validation triple couche des Jeux GeoPlay (natif iOS et Android).

## Couche 1 — JSON Schema Draft-07 (forme locale)

- Types, champs requis, `activation` bien formee.
- `operator` (`AND`/`OR`) **obligatoire si `requires.length > 1`, interdit si <= 1**.
- Au moins un Noeud `"isEnding": true`, sauf cas HOME-seul (`nodes: []` accepte si et seulement si HOME figure dans global.presentation).
- `global.preset` refuse (utiliser `global.experienceStyle.preset`) ; cles racine `gameMode`/`difficulty`/`experienceStyle` refusees (lire/ecrire `global.*`, migrer les residus via operation nommee annulable).
- Textes affichables en cles `{"$t"}` uniquement (pas de chaine litterale) ; `schemaVersion` entier present.
- Un JSON valide ici peut rester invalide tant que les couches 2 et 3 ne sont pas passees.

## Couche 2 — Validateur applicatif de graphe

- **Cycles** : construit les dependances en ignorant les aretes
  `allowCycle: true`, rejette tout cycle residuel.
- **Rejeu borne** : `onReentry: replay` exige `maxReentries` + `scoreOnReplay`
  (defaut `false`).
- **Atteignabilite structurelle sous hypothese d'environnement favorable**
  (`GEOFENCE`/`TIMER` supposes pouvoir devenir vrais — jamais une preuve
  d'execution) : au moins un `isEnding` atteignable depuis le depart (saute en HOME-seul vide),
  `RANDOM_POOL` et `OR` comptant comme alternatifs, **chaque** candidat de pool
  vers un `isEnding`.
- **AND-sur-branches-exclusives** : rejette le cas direct (enfants
  `NODE_COMPLETED` directs vers candidats distincts d'un meme pool a
  `drawCount: 1`, sans fermeture transitive — limite volontaire documentee).
- **Pools** : `drawCount <= candidates.length`, unicite d'un `nodeId` dans un
  seul pool, ordre topo des pools `ON_GAME_START` (cycles inter-pools rejetes),
  aucun pool `ON_GAME_START` dependant d'un candidat de pool `ON_POOL_ACTIVATION`.
- **References** : tout `NODE_COMPLETED`/`POOL_DRAWN`/`anchorNodeId`/`REVEAL_NODE`/`UNLOCK_NODE`/`sourceNode`/`candidates`/`itemId`/`output`/`inventoryHints` doit exister ; `WINDOW` exige apresSecondes < avantSecondes ; `tileRadiusMeters > 0` si strategy radius ; exclusion map/indoorPlans.
- **Severites** : erreur (bloque l'export), avertissement (export apres confirmation journalisee : GEOFENCE sur noeud indoor, tileStrategy none + map, consumable inutilise, couleurs branding invalides, enums gameMode/difficulty/preset invalides), info (jamais bloquant). Regrouper les echecs oneOf en constat unique avec champ probable nomme.
- **Triche legitime** : `forceDraw` et bypass `GEOFENCE` sont valides s'ils
  portent le flag triche pour le scoring.

## Couche 3 — Droits (C3)

- Tout module, template, theme, widget, layout utilise doit etre couvert par un entitlement du publieur.
- Serveur autoritaire (blocage a la publication), Studio indicatif (cadenas + avertissement en edition).
- Licence signee EdDSA verifiee offline par le runtime ; package sans licence accepte si contenu 100 % public.

## Instructions

- Applique les couches 1 puis 2 puis 3, et nomme explicitement la couche qui
  echoue (C1 forme, C2 graphe/references, C3 droits).
- Emets des constats structures {code, noeud, champ, attendu} avec glossaire ferme (etape, declencheur, tirage, fin) et action Voir ; ne parse jamais de texte libre.
- Fournis le correctif JSON precis (champ, noeud, valeur) pour lever le blocage, via operations MCP nommees annulables (sans demander si semantique inchangee, propose en un clic si decision d'auteur, jamais pour cycles/fins inatteignables).
- Verifie la parite TS = KMP sur les jeux de reference ; signale toute divergence comme bloquante.
- Ne presente jamais le verdict comme une garantie d'execution terrain : parle
  d'atteignabilite structurelle sous hypothese d'environnement favorable.
