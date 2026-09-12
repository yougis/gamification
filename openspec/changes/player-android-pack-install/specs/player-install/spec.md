## Purpose

Définit l'application joueur Android générique : importer un pack Studio, le vérifier, le jouer offline, journaliser scores et progression.

## ADDED Requirements

### Requirement: Import de pack vérifié

Le Player SHALL importer un pack par QR, lien ou fichier, vérifier le manifest
SHA-256 par fichier au premier lancement et refuser tout pack partiel ou
corrompu avec état explicite (progression %, fichier fautif). Un pack vérifié
SHALL rejouer sans réseau.

#### Scenario: QR scanné en borne

- **GIVEN** un joueur scannant le QR du pack `reference-5poi` sans réseau ensuite
- **WHEN** l'import se termine
- **THEN** le pack est vérifié fichier par fichier puis le jeu démarre offline

#### Scenario: Pack corrompu refusé

- **GIVEN** un pack dont 1 asset sur 20 a un SHA-256 faux
- **WHEN** le joueur tente de lancer
- **THEN** seul ce fichier est re-téléchargé (si réseau) ou le lancement est
  refusé avec le fichier nommé (sans réseau)

### Requirement: Exécution graphe et modules

Le Player SHALL exécuter la sémantique des specs (`viewer-orchestrator`, états,
`latch`, file FIFO, pools persistés) et rendre les 5 modules socle avec leurs
fallbacks (2D, sans-capteur, dilatation tactile). Un type inconnu SHALL dégrader
le nœud avec message, jamais crasher le Jeu.

#### Scenario: Partie 5 POI de bout en bout

- **GIVEN** le pack `reference-5poi` importé
- **WHEN** le joueur joue le tirage puis la branche jusqu'à FIN
- **THEN** chaque état suit la machine `LOCKED→UNLOCKED→ACTIVE→COMPLETED`

### Requirement: Progression et scores journalisés

Progression, `randomDraws[sessionId]` et events (avec flag triche) SHALL vivre
en SQLite, écriture immédiate. Reprendre = même `sessionId` ; nouvelle partie =
nouveau `sessionId`. Aucune transmission réseau au socle (resync différée 600).

#### Scenario: Reprise après kill

- **GIVEN** une partie avec tirage persisté puis app tuée
- **WHEN** le joueur rouvre la même partie
- **THEN** le tirage est relu, aucun re-tirage

### Requirement: Distribution Android progressive

Le Player SHALL s'installer en sideload (APK debug) au POC puis via Play
Interne, avec permissions justifiées dans le flux (localisation, Bluetooth,
caméra). Le `versionCode` SHALL suivre l'app, jamais le pack (les packs sont
versionnés par leur manifest).

#### Scenario: Installation borne associative

- **GIVEN** une tablette sans compte Google
- **WHEN** l'animateur installe l'APK et importe le pack par fichier
- **THEN** le jeu tourne sans compte ni réseau
