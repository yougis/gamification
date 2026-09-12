# viewer-orchestrator Specification

## Purpose

Définit comment le runtime évalue les activations, présente les nœuds et guide sur le terrain, sobrement et sans divergence entre implémentations.

## Requirements

### Requirement: Boucle d'évaluation continue

Le runtime SHALL évaluer les `activation` en continu (position, horloge, graphe),
résoudre les pools `ON_GAME_START` en ordre topo à l'init avant toute évaluation,
et persister chaque tirage aussitôt en SQLite. La sémantique SHALL être celle
des specs 000/100, jamais réinterprétée (règle anti-drift).

#### Scenario: Init avec pools en cascade

- **GIVEN** un pool B `ON_GAME_START` dépendant du pool A `ON_GAME_START`
- **WHEN** la session démarre
- **THEN** A est tiré puis B, dans l'ordre topo, avant tout `UNLOCKED`

### Requirement: File FIFO à modale unique

Le runtime SHALL présenter au plus 1 modale `ACTIVE` : passage auto pour
`GEOFENCE`/`TIMER`, choix (menu/carte) pour `NODE_COMPLETED`/`POOL_DRAWN`
multiples, file d'attente **FIFO**, `ACTIVE` latché, file suivant le `latch`
(sortie de file si relock). Ceci fige la question ouverte du 000.

#### Scenario: Deux geofences simultanées

- **GIVEN** un Quiz `ACTIVE` et un second geofence vrai
- **WHEN** le moteur évalue
- **THEN** le second attend en file FIFO sans seconde modale, et sort de file si relock

### Requirement: Capteurs sobres et guidance non bloquante

Le GPS SHALL adapter sa fréquence (ralenti hors épreuve), appliquer gating
`maxAccuracyM` + `dwell` + hystérésis depuis le JSON. La boussole SHALL fournir
heading nord vrai lissé + accuracy pour flèche POI + distance texte + haptique
(jamais couleur seule) ; capteur absent/interféré = flèche masquée + message
discret, jeu continuable carte + distance. La caméra SHALL ne s'ouvrir qu'à la
demande d'un module AR.

#### Scenario: Cour fermée sans accuracy

- **GIVEN** un POI `maxAccuracyM:15` et des fixes à 40 m
- **WHEN** le joueur piétine dans le rayon
- **THEN** le Nœud ne s'active pas et l'UI indique l'attente de précision

### Requirement: Rendu carte et triche tracée

La carte SHALL afficher position + trace GPX display + POI éligibles, sur fond
uni si tuiles absentes. Le mode triche in-app SHALL offrir bypass `GEOFENCE`,
auto-validation et `forceDraw`, chaque event portant le flag triche.

#### Scenario: Preview terrain d'une branche

- **GIVEN** un animateur forçant `pool->marche` en triche
- **WHEN** les events remontent
- **THEN** chacun porte le flag et le tirage réel reste intact
