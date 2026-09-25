# player-install Specification

## Purpose

Définit l'application joueur Android générique : importer un pack Studio, le vérifier, le jouer offline, journaliser scores et progression.

## Requirements

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

Le Player SHALL également être distribuable sur iOS via TestFlight, avec un
build automatisé par GitHub Actions sur runner macOS. Le `versionCode` iOS
SHALL suivre le même schéma que Android.

#### Scenario: Installation borne associative

- **GIVEN** une tablette sans compte Google
- **WHEN** l'animateur installe l'APK et importe le pack par fichier
- **THEN** le jeu tourne sans compte ni réseau

#### Scenario: Build iOS via GitHub Actions

- **WHEN** un commit est poussé sur la branche principale
- **THEN** GitHub Actions build le module shared KMP pour iOS, compile l'app iOS, et produit un artefact TestFlight-ready

#### Scenario: Test sur iPhone 12

- **GIVEN** un iPhone 12 connecté en développement
- **WHEN** l'animateur installe l'app iOS via Xcode ou TestFlight
- **THEN** le jeu tourne avec la même logique que la version Android

### Requirement: Coquille PWA installable et offline

Le Player SHALL exister aussi comme coquille navigateur installable (PWA :
manifest, service worker, « Ajouter à l'écran d'accueil » / Web Clip MDM),
adossée au même moteur et à la même UI commune que le natif. La PWA SHALL
importer un pack par fichier, URL ou QR, vérifier le manifest SHA-256 par
fichier au premier lancement et refuser tout pack partiel ou corrompu avec
état explicite, exactement comme le natif. Un pack vérifié SHALL rejouer sans
réseau (visite en ligne initiale requise pour la mise en cache).

La persistance PWA (progression, tirages, events, inventaire) SHALL vivre en
stockage local navigateur avec écriture immédiate et même `sessionId` de
reprise. Le stockage SHALL être demandé persistant (`persist()`) et le
lancement SHALL revérifier l'intégrité du pack.

Le verrouillage kiosque OS n'existant pas côté web, la PWA SHALL proposer la
procédure Guided Access (iPad) comme repli documenté quand `holdMode !=
"none"`, sans jamais prétendre verrouiller.

#### Scenario: Installation flotte sans compte

- **GIVEN** un iPad supervisé recevant la PWA par Web Clip MDM
- **WHEN** l'animateur ouvre le jeu sans réseau après une visite en ligne
- **THEN** le pack vérifié démarre offline, sans compte Apple ni provisioning

#### Scenario: Pack PWA partiel non lançable

- **GIVEN** un pack PWA mis en cache à 90 %
- **WHEN** le joueur tente de lancer
- **THEN** le lancement est refusé avec la progression et le fichier manquant

### Requirement: Export compatible multi-player

Le même JSON de jeu SHALL s'exporter vers `NATIVE` et `PWA` sans fork (même
schéma, même manifest, même validation AJV des deux côtés). Le canal SHALL
être un attribut de distribution choisi à l'export, jamais une variante du
jeu. L'export SHALL afficher le verdict de compatibilité par canal avant
génération (voir `player-compatibility`).

#### Scenario: Même jeu, deux canaux

- **GIVEN** un jeu QUIZ/PUZZLE sans capteur exotique
- **WHEN** l'auteur exporte vers `NATIVE` puis vers `PWA`
- **THEN** les deux packs contiennent le même `game.json` et passent la même validation AJV

### Requirement: Build iOS automatisé

Le Player iOS SHALL être buildé automatiquement via GitHub Actions sur un
runner macOS. Le workflow SHALL :
1. Compiler le module `shared` KMP pour `iosArm64`
2. Compiler l'app iOS via `xcodebuild`
3. Produire un artefact `.ipa` ou bundle TestFlight
4. Utiliser des secrets GitHub pour le code signing (certificat, profil)

Le workflow SHALL se déclencher sur :
- Push sur la branche `main`
- Tag de version (pour les releases)
- Pull request (pour les builds de vérification)

#### Scenario: Build automatique sur push
- **WHEN** un développeur push un commit sur `main`
- **THEN** GitHub Actions lance le build iOS et upload l'artefact

#### Scenario: Build de vérification sur PR
- **WHEN** une pull request est créée
- **THEN** GitHub Actions build iOS sans publier (vérification uniquement)

#### Scenario: Release via tag
- **WHEN** un tag `v*` est créé
- **THEN** GitHub Actions build iOS et upload sur TestFlight

### Requirement: Compatibilité schéma JSON

Le Player iOS SHALL consommer le même format de pack JSON que le Player
Android. Le schema Draft-07 `game-schema` SHALL être validé par les deux
applications. Aucune adaptation de format ne SHALL être nécessaire pour
iOS.

#### Scenario: Pack exporté jouable sur iOS
- **WHEN** un pack est exporté par le Studio
- **THEN** il est jouable sur Android ET iOS sans modification

#### Scenario: Validation JSON identique
- **WHEN** un pack est importé sur iOS
- **THEN** la validation Draft-07 produit le même résultat que sur Android
