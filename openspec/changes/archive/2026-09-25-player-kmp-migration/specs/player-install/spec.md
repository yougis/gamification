## MODIFIED Requirements

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

## ADDED Requirements

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
