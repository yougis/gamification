# viewer-orchestrator Specification

## Purpose

Définit comment le runtime évalue les activations, présente les nœuds et guide sur le terrain, sobrement et sans divergence entre implémentations.

## Requirements

### Requirement: HOLD meta-état kiosque

Quand `global.holdMode != "none"`, le runtime SHALL activer le verrouillage
kiosque OS (Guided Access / Screen Pinning / Lock Task Mode) immédiatement
avant la première interaction joueur et le maintenir actif tant que la session
n'est pas terminée ou qu'une action de sortie animateur n'est pas réalisée.
Le runtime N'INTERCEPTE JAMAIS le bouton Home ou le geste système — l'OS
verrouille. Le runtime réagit uniquement aux signaux `onPause`/`onStop` de
l'OS pour journaliser.

#### Scenario: Session HOLD démarre et verrouille

- **GIVEN** un Jeu avec `global.holdMode: "lockTask"` et `holdExit`
  configuré
- **WHEN** la session démarre
- **THEN** le terminal passe en Lock Task Mode, le joueur ne peut
  pas accéder aux autres apps ni au panneau de notification

#### Scenario: Appui Home en mode HOLD

- **GIVEN** session HOLD active, le joueur tente le bouton Home
- **WHEN** l'OS intercepte et verrouille
- **THEN** l'application reste visible, le joueur ne change pas
  d'application, un event `holdBlock` est journalise

### Requirement: Sortie HOLD par action animateur

Quand `holdMode != "none"`, le runtime SHALL fournir un canal d'exit
réservé à l'animateur. Le canal est configuré dans `global.holdExit`
et n'est accessible que via l'interface d'administration du runtime
(jamais dans l'UI joueur). L'action de sortie peut être : PIN,
geste, QR ou code. Chaque sortie réussie produit un event `holdExit`
avec le timestamp, le `sessionId`, et la méthode utilisée.

#### Scenario: PIN correct désactive HOLD

- **GIVEN** `holdMode: "guidedAccess"`, `holdExit.method: "adminPin"`
- **WHEN** l'animateur saisit le PIN correct via le panneau admin
- **THEN** le runtime relâche le verrouillage OS, `holdExit` event
  journalisé, la session peut se terminer normalement

#### Scenario: PIN incorrect

- **GIVEN** `holdMode: "guidedAccess"`, `holdExit.method: "adminPin"`
- **WHEN** l'animateur saisit un PIN incorrect
- **THEN** le runtime rejette, compteur de tentative incrémenté,
  event `holdExitAttempt` journalise avec `success: false`

### Requirement: Sortie HOLD forcee par l'OS

Si l'OS force la sortie de l'app (coupure système, redémarrage,
mise à jour), le runtime SHALL journaliser un event `holdForceExit`
avec le timestamp et le `sessionId`. Au redémarrage, le même
`sessionId` relit l'état depuis SQLite ; le HOLD est relancé si la
session n'est pas terminée.

#### Scenario: Redémarrage après coupure en HOLD

- **GIVEN** session HOLD active, coupure système
- **WHEN** le joueur redémarre avec le même `sessionId`
- **THEN** le HOLD est relancé (verrouillage kiosque réactivé),
  aucun re-tirage, la session reprend exactement là où elle en était

### Requirement: Tous les modes journalisent entrées/sorties

Tout mode de jeu (HOLD ou `holdMode: "none"`) SHALL journaliser
dans l'interface animateur :
- `sessionStart` : timestamp de début
- `sessionPause` : timestamp quand l'app passe en background
- `sessionResume` : timestamp de reprise
- `sessionEnd` : timestamp de fin normale
- `holdLock` / `holdUnlock` : timestamp du verrouillage/déverrouillage
  kiosque (si `holdMode != "none"`)
- `holdExit` : timestamp et méthode de sortie HOLD

Le journal est persistant en SQLite et accessible via l'interface
animateur avec filtres par session et par type d'event.

#### Scenario: Mode non-HOLD journalise les entrées/sorties

- **GIVEN** `holdMode: "none"`
- **WHEN** le joueur lance la session, la quitte et la relance
- **THEN** `sessionStart`, `sessionPause`, `sessionResume`,
  `sessionEnd` sont tous journalisés dans l'interface

### Requirement: Boucle d'évaluation continue

Le runtime SHALL évaluer les `activation` en continu (position,
horloge, graphe), résoudre les pools `ON_GAME_START` en ordre
topo à l'init avant toute évaluation, et persister chaque tirage
aussitôt en SQLite. **En mode HOLD, la boucle d'évaluation
continue, mais les signaux `onPause`/`onStop` de l'OS ne
provoquent pas de pause de l'évaluation sauf si l'OS force
l'arrêt de l'app**. La sémantique SHALL être celle des specs
000/100, jamais réinterprétée (règle anti-drift).

#### Scenario: Init avec pools en cascade

- **GIVEN** un pool B `ON_GAME_START` dépendant du pool A `ON_GAME_START`
- **WHEN** la session démarre
- **THEN** A est tiré puis B, dans l'ordre topo, avant tout `UNLOCKED`

#### Scenario: HOLD ne pause pas l'évaluation

- **GIVEN** session HOLD active, le joueur revient en arrière
- **WHEN** l'OS signale `onPause`
- **THEN** l'évaluation continue en arrière-plan, seul le journal
  est mis à jour, le verrouillage kiosque reste actif

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
(jamais couleur seule). **En mode HOLD, le gating `maxAccuracyM` et `dwell`
s'appliquent avec les mêmes paramètres depuis le JSON, mais la position est
vérifiée même en mode kiosque pour détecter toute anomalie de localisation.**
Un capteur absent/interféré = flèche masquée + message discret, jeu continuable
carte + distance. La caméra SHALL ne s'ouvrir qu'à la demande d'un module AR.

#### Scenario: Cour fermée sans accuracy

- **GIVEN** un POI `maxAccuracyM:15` et des fixes à 40 m
- **WHEN** le joueur piétine dans le rayon
- **THEN** le Nœud ne s'active pas et l'UI indique l'attente de précision

#### Scenario: HOLD avec precisions GPS

- **GIVEN** `holdMode: "guidedAccess"`, POI avec `maxAccuracyM:15`
- **WHEN** le joueur est dans le rayon avec des fixes à 20 m
- **THEN** le Nœud ne s'active pas, l'UI indique l'attente de
  précision, le verrouillage kiosque reste actif

### Requirement: Rendu carte et triche tracée

La carte SHALL afficher position + trace GPX display + POI éligibles, sur fond
uni si tuiles absentes. Le mode triche in-app SHALL offrir bypass `GEOFENCE`,
auto-validation et `forceDraw`, chaque event portant le flag triche. **En mode
HOLD, le mode triche est accessible uniquement via l'interface d'administrateur
(panneau admin), jamais depuis l'UI joueur. Chaque event triche en mode HOLD
porte en plus le flag `holdMode` pour tracer l'activité kiosque.**

#### Scenario: Preview terrain d'une branche

- **GIVEN** un animateur forçant `pool->marche` en triche
- **WHEN** les events remontent
- **THEN** chacun porte le flag et le tirage réel reste intact

#### Scenario: Triche en mode HOLD via panneau admin

- **GIVEN** `holdMode: "lockTask"`, l'animateur accède au panneau admin
- **WHEN** l'animateur active le bypass `GEOFENCE`
- **THEN** chaque event porte le flag triche et le flag `holdMode`,
  l'audit trail est complet
