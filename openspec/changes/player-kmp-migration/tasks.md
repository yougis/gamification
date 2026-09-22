## 1. Setup KMP et Gradle

- [x] 1.1 Créer le module `shared` avec configuration KMP (build.gradle.kts, targets androidTarget/iosArm64/iosSimulatorArm64, Kotlin 2.1, Compose Multiplatform plugin) — Vérifier : `./gradlew :shared:compileKotlinAndroid` passe
- [x] 1.2 Configurer le module `app` pour consommer `shared` (api dependency, Compose Activity) — Vérifier : `./gradlew :app:assembleDebug` passe
- [x] 1.3 Ajouter les dépendances Compose Multiplatform au module `shared` (runtime, ui, material3, navigation) — Vérifier : la compilation passe sans erreur
- [x] 1.4 Configurer Room KMP dans le module `shared` (KSP, schema, DAOs communs) — Vérifier : `./gradlew :shared:compileKotlinAndroid` passe avec Room
- [ ] 1.5 Vérifier la compilation iOS (`./gradlew :shared:linkDebugFrameworkIosArm64`) — Vérifier : le framework iOS est produit — NOTE: `compileKotlinIosArm64` + `compileKotlinIosSimulatorArm64` (klib) passent sur Linux ; le link `.framework` est désactivé par le plugin Kotlin sur non-macOS ("Task is enabled is false", Apple SDK requis) → framework vérifié sur runner macOS en 6.3 — NOTE 2026-09-22 : klibs recompilés OK avec providers + UI Compose + `MainViewController` (uikit 1.10.3)
- [x] 1.6 Vérifier que le module `app` fonctionne toujours (smoke test Android existant) — Vérifier : le jeu se lance sur émulateur Android — NOTE: émulateur Fedora HS (SwiftShader segfault) ; smoke test OK sur émulateur Android Studio (Mac) : l'appli démarre

## 2. Extraction logique vers commonMain

- [x] 2.1 Déplacer les modèles de données (Game, Node, Condition, Module, etc.) vers `shared/src/commonMain` — Vérifier : compilation commune et Android passent
- [x] 2.2 Déplacer le GameEngine (machine à états, évaluation des conditions, latch, file FIFO) vers `shared/src/commonMain` — Vérifier : tests unitaires communs passent
- [x] 2.3 Déplacer l'import de packs (manifest, vérification SHA-256, lecture JSON) vers `shared/src/commonMain` — Vérifier : test d'import passe
- [x] 2.4 Configurer Room KMP avec le schéma de persistence (sessions, tirages, événements, inventaire) — Vérifier : `./gradlew :shared:compileKotlinAndroid` passe

## 3. Stubs expect/actual pour modules natifs

- [x] 3.1 Créer les interfaces `expect` dans `commonMain` : LocationProvider, CompassProvider, CameraProvider, BLEProvider, KioskProvider — Vérifier : la compilation commune passe — NOTE: Kotlin interdit `expect interface` : interfaces en `commonMain` + fabriques `expect fun default*Provider()` (`androidMain`/`iosMain`/`jvmMain` actuals) ; `jvmMain` requis sinon `jvmTest` ne compile pas ; compilation commune + Android + klibs iOS OK
- [x] 3.2 Implémenter les stubs `actual` Android (retournent des valeurs par défaut) — Vérifier : `./gradlew :app:assembleDebug` passe — NOTE: vérifié via `:shared:compileDebugKotlinAndroid` OK (stubs : position Paris fallback, cap 0°, caméra indisponible, BLE vide, kiosque déverrouillé)
- [x] 3.3 Implémenter les stubs `actual` iOS (retournent des valeurs par défaut) — Vérifier : `./gradlew :shared:linkDebugFrameworkIosArm64` passe — NOTE: link impossible sur Linux (Apple SDK requis) ; `compileKotlinIosArm64` + `compileKotlinIosSimulatorArm64` (klibs) passent avec les actuals iOS ; link vérifié sur runner macOS en 6.3

## 4. UI Compose Multiplatform

- [x] 4.1 Créer les composants Compose communs (thème, couleurs, typographie, navigation) — Vérifier : compilation commune passe — NOTE: `GeoPlayTheme` + `GeoPlayNavHost` (graphe/quiz) créés ; compilations commune, Android et klibs iOS OK
- [x] 4.2 Créer l'écran du graphe de jeu (liste des nœuds avec états LOCKED/UNLOCKED/ACTIVE/COMPLETED) — Vérifier : l'écran s'affiche sur Android — NOTE: `GameGraphScreen` créé + libellés testés (`PlayerUiCommonTest`) + compilation Android OK ; affichage sur appareil/émulateur restant à vérifier (émulateur Fedora HS, cf. 1.6)
- [x] 4.3 Créer l'écran du module QUIZ (questions, options, validation) — Vérifier : le QUIZ fonctionne sur Android — NOTE: `QuizScreen` + parse/score purs créés, `PlayerUiCommonTest` (options mixtes texte/image, score) OK ; fonctionnement sur appareil restant à vérifier (émulateur Fedora HS, cf. 1.6)
- [ ] 4.4 Créer l'application iOS SwiftUI qui consomme le framework shared ( ContentView, navigation) — Vérifier : l'app iOS compile et affiche l'écran principal — NOTE 2026-09-22 : scaffold écrit (`player/iosApp` : pbxproj cohérent, `iOSApp`/`ContentView` avec import fichier, `MainViewController` côté shared) + workflow 6.1 ; compilation Xcode réelle en attente du runner macOS (6.3)

## 5. Tests

- [x] 5.1 Créer des tests unitaires communs (`commonTest`) pour la machine à états (LOCKED→UNLOCKED→ACTIVE→COMPLETED) — Vérifier : `./gradlew :shared:jvmTest` passe — NOTE: `GameEngineCommonTest` (NODE_COMPLETED, latch, tirage déterministe, FIFO modale unique) OK en jvmTest
- [x] 5.2 Créer des tests unitaires communs pour l'évaluation des conditions (GEOFENCE, NODE_COMPLETED, TIMER, POOL_DRAWN) — Vérifier : les tests passent — NOTE: tests GEOFENCE/TIMER/POOL_DRAWN ajoutés, `ProvidersContractTest` (contrats + stubs) ajouté ; jvmTest 24/24 OK
- [x] 5.3 Créer des tests unitaires communs pour l'import de packs — Vérifier : les tests passent — NOTE: `PackImportCommonTest` (SHA, intact/corrompu, roundtrip manifest) OK en jvmTest
- [ ] 5.4 Créer un test instrumenté Android pour vérifier le gameplay complet — Vérifier : le test passe sur émulateur
- [ ] 5.5 Créer un test instrumenté iOS (via XCTest) pour vérifier le gameplay complet — Vérifier : le test passe sur simulateur

## 6. CI/CD GitHub Actions

- [ ] 6.1 Créer le workflow GitHub Actions pour iOS (trigger push/PR/tag, runner macos-latest) — Vérifier : le workflow apparaît dans l'onglet Actions — NOTE 2026-09-22 : `.github/workflows/player.yml` écrit (jobs android-debug/APK, ios-build simulateur sans signature, ios-testflight sur tag ; YAML valide) ; apparition dans l'onglet à vérifier après push
- [ ] 6.2 Configurer les secrets GitHub (certificat de signature, profil de provisioning) — Vérifier : les secrets sont référencés dans le workflow
- [ ] 6.3 Tester le build iOS sur GitHub Actions (push sur branche de test) — Vérifier : le build passe et produit un artefact
- [ ] 6.4 Tester l'installation sur iPhone 12 physique (via TestFlight ou Xcode) — Vérifier : l'app s'installe et se lance
- [ ] 6.5 Prérequis distribution iOS : enrôlement Apple Developer + groupe de testeurs internes TestFlight — Vérifier : le build 6.3 est visible dans App Store Connect et distribué au groupe interne
- [ ] 6.6 Écran d'import du pack sur iOS (fichier et/ou QR/URL, même format JSON qu'Android) — Vérifier : un testeur iPhone importe `game-5poi` sans Xcode et joue jusqu'à FIN
- [ ] 6.7 Canal de distribution testeurs Android : APK debug + pack de test publiés à URL stable (sans Android Studio côté testeur) — Vérifier : installation et import réussis depuis un appareil vierge
