## Purpose

Ajout du mode kiosque HOLD au schema racine du jeu. Quand `holdMode`
est active, le runtime verrouille le terminal et seule une action
d'animateur peut le relacher.

## ADDED Requirements

### Requirement: global.holdMode

Le schema racine SHALL contenir un champ optionnel `global.holdMode`
(enum : `"none"` | `"guidedAccess"` | `"screenPinning"` |
`"lockTask"`, defaut `"none"`). `additionalProperties:false` a chaque
niveau est maintenu, ce champ est le seul ajout autorise a `global`.

#### Scenario: Jeu sans HOLD

- **GIVEN** un Jeu avec `global.holdMode: "none"` ou champ absent
- **WHEN** le runtime charge le pack
- **THEN** le mode kiosque est desactive, le jeu se comporte comme a
  ce jour

#### Scenario: Jeu avec HOLD kiosque

- **GIVEN** un Jeu avec `global.holdMode: "guidedAccess"`
- **WHEN** le runtime lance la session
- **THEN** le terminal passe en mode Guided Access (iOS) ou
  equivalent Android avant toute interaction joueur

### Requirement: global.holdExit

Quand `global.holdMode != "none"`, le schema SHALL contenir
`global.holdExit` (objet) avec `method` (enum : `"adminPin"` |
`"adminGesture"` | `"adminQR"` | `"animateurCode"`) et, si applicable,
`pin` (string chiffree) et `adminPanel.enabled` (bool). Le `holdExit`
est requis quand `holdMode != "none"` ; son absence est un rejet
couche 1 (Draft-07).

#### Scenario: Sortie par PIN animateur

- **GIVEN** `holdMode: "guidedAccess"`, `holdExit.method: "adminPin"`,
  `holdExit.pin` present
- **WHEN** l'animateur saisit le PIN
- **THEN** le mode HOLD se desactive, la session se termine normalement
  et un event `holdExit` est journalise

#### Scenario: Sortie par geste admin

- **GIVEN** `holdMode: "screenPinning"`, `holdExit.method:
  "adminGesture"`
- **WHEN** l'animateur realise le geste dedie
- **WHEN** le gesture est valide
- **THEN** le mode HOLD se desactive et un event `holdExit` est
  journalise

### Requirement: Journalisation des entrees/sorties (tous modes)

Tout mode de jeu (HOLD ou non) SHALL journaliser dans l'interface
animateur chaque entree et sortie de session avec horodatage,
`sessionId`, type d'evenement (`sessionStart`, `sessionPause`,
`sessionResume`, `sessionEnd`, `holdExit`, `holdLock`). Le journal
est persistant en SQLite et exportable.

#### Scenario: Mode non-HOLD journalise les sorties

- **GIVEN** un Jeu avec `holdMode: "none"`
- **WHEN** le joueur quitte l'app puis revient
- **THEN** un event `sessionPause` et `sessionResume` est journalise
  dans l'interface, pas de verrouillage OS

#### Scenario: Mode HOLD journalise le lock

- **GIVEN** un Jeu avec `holdMode: "guidedAccess"`
- **WHEN** la session démarre
- **THEN** un event `holdLock` est journalise avec le timestamp

#### Scenario: Session interrompue puis reprise

- **GIVEN** session HOLD active, l'app passe en background
- **WHEN** l'OS signale `onPause`
- **THEN** event `sessionPause` journalise, le verrouillage OS reste
  actif (l'OS ne relache pas)

## MODIFIED Requirements

### Requirement: Racine Jeu versionnée

Le schema racine SHALL définir la racine : `gameId` (string non vide),
`schemaVersion` (semver du schéma), `nodes[]` (>=1), `branding`
(objet), `global` (carte, trace GPX display, rayon GPS global,
`holdMode`, `holdExit`). `additionalProperties:false` à chaque niveau.
Le `holdMode` et `holdExit` SHALL être lus depuis le JSON du
Jeu, jamais comme une condition de graphe.

#### Scenario: Vieux moteur refuse nouveau Jeu

- **GIVEN** un Jeu `schemaVersion:1.2.0` ouvert par un moteur `max:1.0.0`
- **WHEN** le runtime charge le pack
- **THEN** il refuse avec message de mise à jour au lieu de jouer partiellement

#### Scenario: Vieux moteur accepte nouveau Jeu avec holdMode

- **GIVEN** un Jeu `schemaVersion:1.3.0` avec `global.holdMode` ouvert
  par un moteur `min:1.3.0`
- **WHEN** le runtime charge le pack
- **THEN** il accepte et active le verrouillage kiosque

#### Scenario: Ancien moteur rejete jeu avec holdMode

- **GIVEN** un Jeu `schemaVersion:1.3.0` avec `global.holdMode` ouvert
  par un moteur `max:1.2.0`
- **WHEN** le runtime charge le pack
- **THEN** il refuse avec message de mise a jour (pas de lecture
  partielle du champ `holdMode`)

#### Scenario: Ancien moteur accepte jeu sans holdMode

- **GIVEN** un Jeu `schemaVersion:1.0.0` sans `global.holdMode`
- **WHEN** le runtime charge le pack
- **THEN** il accepte (holdMode absent = `"none"`, pas de verrouillage)

#### Scenario: Jeu HOLD valide accepte

- **GIVEN** un Jeu `schemaVersion:1.1.0` avec `global.holdMode: "guidedAccess"`
  et `global.holdExit.method: "adminPin"`
- **WHEN** le runtime charge le pack
- **THEN** il accepte et active le verrouillage kiosque