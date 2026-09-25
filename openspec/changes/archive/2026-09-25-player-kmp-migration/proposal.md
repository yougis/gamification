## Why

Le player actuel est une application Android pure. Pour offrir une expérience iOS native tout en maximisant le code partagé, il faut migrer vers Kotlin Multiplatform (KMP) avec Compose Multiplatform pour l'UI. Avant de s'engager sur des modules natifs complexes (GPS, BLE, AR), l'objectif est d'évaluer si Compose Multiplatform suffit pour le socle : affichage du graphe, UI des modules, navigation, import de packs. Les modules natifs (capteurs, radios) seront ajoutés ultérieurement si Compose ne couvre pas le besoin.

Le developpement se fait sur Fedora (pas de Xcode local). La build iOS passera par GitHub Actions sur runner macOS, avec test sur iPhone 12 et iPad physiques.

## What Changes

- **Nouveau module KMP `shared`** : contient la logique métier (game engine, orchestrateur, validation, import pack, SQLite) en `commonMain`, avec des stubs `expect/actual` pour les futurs modules natifs
- **Module Android `app`** : devient un wrapper fin qui consomme le module `shared`, remplace ViewBinding par Compose Multiplatform
- **Projet iOS `iosApp`** : application SwiftUI qui consomme le module `shared`, build via GitHub Actions
- **Gradle KMP** : configuration multiplateforme (androidTarget, iosArm64, iosSimulatorArm64)
- **GitHub Actions** : workflow de build iOS sur runner macOS, avec code signing via secrets
- **Pas de modules natifs** : GPS, boussole, AR, BLE restent en `expect` stubs pour l'instant — évaluation Compose d'abord
- **Compose Multiplatform** : UI partagée entre Android et iOS pour le socle (graphe, menus, modules)

## Capabilities

### New Capabilities

- `kmp-runtime`: Module KMP partagé contenant le moteur de jeu, l'orchestrateur de graphe, l'import de packs, la validation, et la persistence SQLite — avec stubs expect/actual pour les futurs modules natifs

### Modified Capabilities

- `player-install`: Les requirements d'import et d'exécution doivent supporter le multiplateforme (Android + iOS) via le module shared KMP

## Impact

- **Code** : restructuration complète du dossier `player/` (nouveau module `shared`, refonte `app`, nouveau `iosApp`)
- **Dépendances** : ajout Gradle KMP plugin, Compose Multiplatform, kotlinx.serialization KMP, Room KMP ou SQLDelight
- **Build** : nouveau workflow GitHub Actions pour iOS (`macos-latest` runner), configuration code signing
- **Tests** : tests unitaires communs (`commonTest`) + tests instrumentés Android + tests instrumentés iOS
- **Compatibilité** : le JSON de jeu existant (schema game-schema) reste valide — pas de changement au format
- **Aucun changement au Studio** : le Studio web reste inchangé
