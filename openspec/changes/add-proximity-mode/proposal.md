## Why

Le GPS meurt en cave, en intérieur et en couvert forestier dense, closures des
lieux partenaires les plus demandés (grottes, musées, forts). Sans preuve de
présence alternative, tout Jeu s'y réduit à du quiz sur table. Ce change ajoute
le mode Proximity : prouver la présence par un MASTER temporaire (BLE/WiFi) ou
par méthode déclarative (QR, code, visée AR, validation animateur).

## What Changes

- Nouvelle condition d'activation `PROXIMITY_MASTER` (`masterId`, `transport:
  ble|wifi`, `minRssiDbm`, `dwellMs`), révocable comme `GEOFENCE` (`latch`,
  hystérésis et file ACTIVE applicables tels quels). Pas de balise fixe au socle.
- Méthodes déclaratives sans changement de schéma : QR affiché, code (tournant)
  MASTER, visée `AR_MARKER`, validation animateur — validées dans un module puis
  `NODE_COMPLETED`, avec couplage `dwell` ou code tournant si enjeu de score.
- Matrice milieux (règle Studio) : extérieur `GEOFENCE`, forêt `GEOFENCE` élargi +
  `dwell` long, bâtiment/cave : `PROXIMITY_MASTER` puis QR/code/AR/animateur en
  secours. Identifiants MASTER jamais en dur (JSON), rotation au Studio.
- Le MASTER (téléphone animateur ou Arduino BLE temporaire) sert aussi de hub de
  resync scores (lien avec le différé `600-sync-scoring-master`, non implémenté ici).

## Capabilities

### New Capabilities

- `proximity`: condition `PROXIMITY_MASTER`, méthodes déclaratives via modules, matrice milieux Studio, sécurité (permissions, anti-rejeu QR, rotation `masterId`).

### Modified Capabilities

- Aucune (`openspec/specs/` vide, socle 000 non archivé ; compatibilité avec les
  deltas 000 `game-graph`/`game-triggers` vérifiée sans les rouvrir).

## Impact

- Modifie le schéma graphe (1 condition ajoutée à l'enum) ; consommateurs impactés :
  Studio MCP (saisie `masterId`/seuils + matrice milieux), runtime natif (scan BLE,
  hotspot WiFi), orchestrateur (même sémantique révocable que `GEOFENCE`),
  validateur applicatif (condition environnementale sous hypothèse favorable).
- Ne touche ni à `CONDITIONAL`/`WINDOW` ni au registre (aucun module ajouté ;
  QR/code/AR/animateur utilisent types et bypass existants).
- Aucune connexion réseau requise : BLE advertise standard + WiFi local + QR/code
  imprimés, 100 % offline. Exception justifiée : aucune.
- Dépend de : `000-framework-architecture` (non archivé ; en reprend la sémantique
  `latch`/file/`forceDraw` sans la modifier).
