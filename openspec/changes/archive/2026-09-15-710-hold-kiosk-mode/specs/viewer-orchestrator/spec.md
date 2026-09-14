## Purpose

Le runtime évalue les activations en continu et gère la boucle de
vie de la session. Le mode HOLD ajoute un meta-état kiosque autour
de la machine à états existante, sans la modifier.

## MODIFIED Requirements

### Requirement: Boucle d'évaluation continue

Le runtime SHALL évaluer les `activation` en continu (position,
horloge, graphe), résoudre les pools `ON_GAME_START` en ordre
topo à l'init avant toute évaluation, et persister chaque tirage
aussitôt en SQLite. **En mode HOLD, la boucle d'évaluation continue, mais les
signaux `onPause`/`onStop` de l'OS ne provoquent pas de pause de
l'évaluation sauf si l'OS force l'arrêt de l'app**. La sémantique SHALL
être celle des specs 000/100, jamais réinterprétée (règle anti-drift).

#### Scenario: Init avec pools en cascade

- **GIVEN** un pool B `ON_GAME_START` dépendant du pool A `ON_GAME_START`
- **WHEN** la session démarre
- **THEN** A est tiré puis B, dans l'ordre topo, avant tout `UNLOCKED`

#### Scenario: HOLD ne pause pas l'évaluation

- **GIVEN** session HOLD active, le joueur revient en arrière
- **WHEN** l'OS signale `onPause`
- **THEN** l'évaluation continue en arrière-plan, seul le journal
  est mis à jour, le verrouillage kiosque reste actif

### Requirement: Capteurs sobres et guidance non bloquante

Le GPS SHALL adapter sa fréquence (ralenti hors épreuve), appliquer
gating `maxAccuracyM` + `dwell` + hystérésis depuis le JSON. **En mode
HOLD, le gating `maxAccuracyM` et `dwell` s'appliquent avec les mêmes
paramètres depuis le JSON, mais la position est vérifiée même en
mode kiosque pour détecter toute anomalie de localisation.** La boussole
SHALL fournir heading nord vrai lissé + accuracy pour flèche POI +
distance texte + haptique (jamais couleur seule).

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