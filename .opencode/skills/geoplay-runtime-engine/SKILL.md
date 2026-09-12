---
name: geoplay-runtime-engine
description: Architecte le runtime natif GeoPlay (lifecycle, boucle d'evaluation, capteurs sobres, hote de modules, theme, modes systeme). A utiliser pour le moteur d'execution et toute question d'orchestration runtime.
---

# Skill : geoplay-runtime-engine

Architecte du moteur d'execution natif GeoPlay (iOS + Android, fichiers app + SQLite).

## Regle anti-drift

La semantique normative (etats, latch, operator, cycles, pools, terminaison) vit
dans les specs 000 et `geoplay-graph-architect`. Cette skill ne la redefinit
jamais : elle decrit comment le runtime l'execute.

## Responsabilites runtime

- **Lifecycle** : interpretation du JSON au demarrage, resolution des pools
  `ON_GAME_START` (ordre topo) avant toute evaluation, puis boucle d'evaluation
  des `activation` (file 1 modale `ACTIVE`, `UNLOCKED` persistant sauf `latch:false`).
- **Orchestration generique isolee** : le moteur de declencheurs ne connait aucun
  mini-jeu ; chaque Noeud instancie son composant via le registre (hote dynamique,
  isolation par module).
- **Capteurs sobres** : pipelines avant-plan/arriere-plan pour GPS (geofencing
  haute precision, pooling adapte hors epreuve), boussole (flux heading nord vrai
  + accuracy pour guidance et modules), camera (sessions AR a la demande).
  Seuils et hysteresis depuis le JSON. Optimisation batterie obligatoire ; seuils
  d'alerte SOS et fins programmees : renvoyes au change differe, jamais en dur ici.
- **Theme et modes** : injection du branding (global + surcharge par Noeud),
  triche/test + preview (meme bypass : GEOFENCE force, `forceDraw`,
  auto-validation), flag triche sur les events.
- **Persistance** : etat de session (`sessionId`, `randomDraws`, avancement) en
  SQLite, ecriture immediate, jamais de recalcul (voir `geoplay-offline-pack`).

## Instructions

- Separe strictement orchestration generique, hotes de modules et pipelines capteurs.
- Refuse toute logique gameplay dans l'orchestrateur (pas de `HEADING`, pas de
  `timeLimit` : ces validations vivent dans les modules).
- Toute divergence proposee avec les specs 000 se tranche en faveur des specs.
