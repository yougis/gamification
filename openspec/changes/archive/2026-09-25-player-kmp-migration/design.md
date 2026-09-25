## Context

Le player actuel est un projet Android mono-module (`:app`) utilisant ViewBinding, Room, Navigation et Java 17. La cible est Kotlin 2.0.21, AGP 8.7.2, Gradle 8.14. Le développement se fait sur Fedora (pas de Xcode local), les tests iOS sur iPhone 12 et iPad physiques.

Le principe d'architecture du projet (kmp-native-boundary) impose : base KMP partagée, code natif uniquement à la frontière radio/OS. Pour ce change, on se limite à l'évaluation Compose Multiplatform — les modules natifs (GPS, BLE, AR, etc.) restent en stubs `expect` temporairement.

## Goals / Non-Goals

**Goals:**
- Convertir le player en structure KMP multi-module (shared + app)
- Utiliser Compose Multiplatform pour l'UI partagée Android/iOS
- Configurer GitHub Actions pour build iOS automatique
- Valider que Compose suffit pour le socle UI (graphe, modules, navigation)
- Maintenir la compatibilité avec le schema JSON existant

**Non-Goals:**
- Implémenter les modules natifs (GPS, BLE, AR, boussole) — on garde des stubs `expect`
- Modifier le Studio web
- Changer le format JSON des packs
- Supporter le mode kiosque (HOLD) sur iOS dans ce change
- Atteindre la parité de fonctionnalité avec Android (c'est une évaluation)

## Decisions

### 1. Structure multi-module KMP

**Décision :** 3 modules Gradle — `shared` (KMP), `app` (Android wrapper), `iosApp` (Xcode project).

**Rationale :** Le module `shared` contient toute la logique métier. `app` est un wrapper fin Compose qui installe le module shared. `iosApp` est un projet Xcode SwiftUI qui consomme le framework shared produit par Gradle.

**Alternatives considérées :**
- Module unique avec target Android + iOS → rejeté car l'app iOS a besoin d'un projet Xcode séparé pour le build et le code signing
- Deux modules séparés sans shared → rejeté car duplique toute la logique métier

### 2. Compose Multiplatform pour l'UI

**Décision :** Utiliser Compose Multiplatform pour les écrans communs (graphe, modules, navigation). Les écrans natifs (caméra AR) restent en `expect/actual`.

**Rationale :** Compose Multiplatform permet de partager ~80% de l'UI entre Android et iOS. Pour le socle (QUIZ, 7-erreurs, PUZZLE), l'UI est suffisamment standard pour fonctionner en Compose. La caméra AR nécessite un rendu natif.

**Alternatives considérées :**
- SwiftUI natif + Kotlin logique → rejeté car duplique toute l'UI
- Flutter → rejeté car le projet est déjà en Kotlin, Flutter ajouterait un runtime Dart inutile
- React Native → rejeté pour la même raison

### 3. Persistence SQLite : Room KMP

**Décision :** Utiliser Room KMP (avec KSP) pour la persistence SQLite, en gardant le même schéma que l'actuel.

**Rationale :** Room est déjà utilisé côté Android. Room KMP (disponible depuis Room 2.7+) permet de partager le schéma et les DAOs en `commonMain`. L'`actual` fournit l'accès fichier par plateforme.

**Alternatives considérées :**
- SQLDelight → alternatif solide mais nécessite de réécrire les DAOs existants
- SQLite brut via expect/actual → trop de boilerplate, pas de type-safety

### 4. Gradle KMP avec Kotlin 2.2

**Décision :** Mettre à jour Kotlin de 2.0.21 à 2.2.21 (au lieu de 2.1.x initialement envisagé), Compose Multiplatform 1.10.3, KSP 2.2.21-2.0.5, Room 2.8.5, compileSdk/targetSdk 35.

**Rationale :** Les artefacts récents de l'écosystème (navigation-compose 2.9.2) sont compilés avec Kotlin 2.2.x. Les klibs Kotlin ne sont lisibles que par un compilateur de version égale ou supérieure : rester en 2.1 cassait `kspCommonMainKotlinMetadata` et le link iOS. Room 2.6.1/KAPT ne supporte pas Kotlin ≥ 2.1 (metadata max 2.0.0), d'où Room 2.8.5 + KSP. navigation-compose-android 2.9.7 exige compileSdk 35.

**Note d'implémentation (tâche 1.4) :** Room KMP exige `@ConstructedBy` sur la classe `@Database` en commonMain + un `expect object ... : RoomDatabaseConstructor<T>` ; l'`actual` est **généré par Room** (ne pas l'écrire à la main — conflit de doublon). KSP est branché **par cible** (`kspAndroid`, `kspJvm`) : ce sont les seules configurations câblées dans les graphes de compilation (vérifié via dry-run).

**Note d'implémentation (tâche 2.4) :** `kspCommonMainMetadata` est volontairement exclu pour l'instant — sa sortie produisait un `actual` en double avec les implémentations par cible (erreur `has no corresponding expected declaration`). Il reviendra en phase 3/6.x où le link `.framework` sera vérifié pour de vrai sur runner macOS. Les entités et la DB DOIVENT vivre dans le même module (Room KSP ne résout pas les entités à travers une frontière de module KMP avec ce toolchain). Preuve runtime : `DatabasePersistenceTest` (jvmTest, driver SQLite bundlé, base mémoire) couvre sessions, tirages, complétions, scores (+flag triche), progression, journal HOLD et inventaire.

### 5. GitHub Actions pour iOS

**Décision :** Workflow GitHub Actions sur `macos-latest` avec `xcodebuild`, code signing via secrets GitHub.

**Rationale :** Le développeur est sur Fedora, pas de Xcode local. GitHub Actions macOS runners ont Xcode préinstallé. Le code signing utilise des certificats et profils stockés en base64 dans les secrets GitHub.

**Alternatives considérées :**
- Fastlane → ajouté en complexité, `xcodebuild` direct suffit pour un POC
- Codemagic → service tiers, pas nécessaire pour un POC

### 6. Versioning du framework shared

**Décision :** Le framework shared produit par Gradle est versionné par le `versionCode` de l'app, pas par un version séparée.

**Rationale :** Simplifie la gestion des dépendances. Le framework est un artefact interne, pas une librairie publique.

### 7. Distribution test (sans Android Studio côté testeur)

**Décision :** iOS via TestFlight interne (groupe de testeurs, pas de review Apple) ; Android via sideload APK debug + pack de test à URL stable. Pas de Firebase App Distribution à ce stade.

**Décision 2026-09-22 (phase de test, sans compte Apple) :** installation Xcode directe (Mac + Apple ID gratuit + câble), sans enrôlement Developer ni TestFlight. Certificat personnel 7 jours → re-installation hebdomadaire. TestFlight/App Store réservés à la production (change ultérieur).

**Rationale :** TestFlight interne et sideload couvrent les deux plateformes sans infra ni compte supplémentaire au-delà de l'enrôlement Apple Developer (requis dans tous les cas, même en Ad Hoc). Firebase ajouterait un projet et un SDK pour un gain nul à ce stade. Le déploiement production (Play Store, App Store) fera l'objet d'un change ultérieur avec son écran de configuration dans le Studio.

**Alternatives considérées :**
- Ad Hoc + UDID collectés à la main → rejeté : friction par appareil, TestFlight interne est plus simple au même coût
- Firebase App Distribution → différé : réévaluer si les testeurs se plaignent du sideload Android

## Risks / Trade-offs

### Risque 1 : Compose Multiplatform ne couvre pas tous les cas UI
- **Impact** : Certains écrans (carte interactive, modules AR) ne seront pas jouables en Compose
- **Mitigation** : On évalue sur le socle (QUIZ, 7-erreurs, PUZZLE) qui est suffisant pour le POC. Les écrans natifs restent en `expect/actual` pour plus tard.

### Risque 2 : Room KMP en version récente
- **Impact** : Room KMP est relativement nouveau, des bugs ou limitations peuvent exister
- **Mitigation** : Si Room KMP pose problème, basculer sur SQLDelight qui est mature. Le schéma SQLite est simple et portable.

### Risque 3 : Build iOS sans Xcode local
- **Impact** : Difficile de debugguer les problèmes de build iOS
- **Mitigation** : GitHub Actions fournit des logs détaillés. L'iPhone 12 physique permet de tester l'app compilée.

### Risque 4 : Performance Compose sur iOS
- **Impact** : Compose sur iOS peut être plus lent que SwiftUI natif
- **Mitigation** : C'est une évaluation. Si les performances sont insuffisantes, on pourra migrer vers SwiftUI natif pour l'UI tout en gardant la logique KMP.

### Risque 5 : Code signing iOS complexe
- **Impact** : Les certificats et profils Apple peuvent causer des erreurs de build
- **Mitigation** : Documentation des secrets GitHub requis. Utiliser un profil de distribution Ad Hoc pour le POC.

## Migration Plan

### Phase 1 : Setup KMP (tasks 1.1-1.6)
1. Créer le module `shared` avec configuration KMP
2. Configurer les targets (androidTarget, iosArm64, iosSimulatorArm64)
3. Ajouter les dépendances Compose Multiplatform
4. Configurer le module `app` pour consommer `shared`
5. Vérifier la compilation Android
6. Vérifier la compilation iOS

### Phase 2 : Extraction logique (tasks 2.1-2.4)
1. Déplacer le GameEngine vers `commonMain`
2. Déplacer les modèles de données vers `commonMain`
3. Déplacer l'import de packs vers `commonMain`
4. Configurer Room KMP pour la persistence

### Phase 3 : UI Compose (tasks 3.1-3.4)
1. Créer les composants Compose communs
2. Créer l'UI du graphe de jeu
3. Créer l'UI des modules (QUIZ, etc.)
4. Créer l'app iOS SwiftUI qui consomme le framework

### Phase 4 : CI/CD (tasks 4.1-4.3)
1. Créer le workflow GitHub Actions pour iOS
2. Configurer le code signing
3. Tester le build sur iPhone 12

### Rollback
- Si Compose Multiplatform pose problème : revenir au projet Android natif existant
- Si Room KMP pose problème : basculer sur SQLDelight
- Si le build iOS échoue : reporter à un change ultérieur, garder l'Android natif

## Open Questions

1. **Room KMP vs SQLDelight** : La décision est prise pour Room KMP, mais si des blocages apparaissent, faut-il basculer sur SQLDelight dès le POC ou attendre ?
2. **Version Compose Multiplatform** : Quelle version exacte utiliser ? (Probablement la dernière stable au moment de l'implémentation)
3. **Taille du framework iOS** : Le framework KMP compilé pour iOS sera probablement plus gros qu'une lib SwiftUI native. Est-ce acceptable pour le POC ?
4. **Tests instrumentés iOS** : Faut-il mettre en place des tests automatisés sur iOS dès le POC, ou se limiter au build ?
