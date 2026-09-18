## Purpose

Module KMP partagé contenant la logique métier du player GeoPlay : moteur de jeu, orchestrateur de graphe, import de packs, validation, et persistence SQLite. Ce module est consommé par les applications Android et iOS via Compose Multiplatform.

## ADDED Requirements

### Requirement: Module shared KMP multiplateforme

Le module `shared` SHALL exposer la logique métier via un API Kotlin commune (`commonMain`), avec des `expect/actual` uniquement pour les fonctions système qui ne peuvent pas vivre en commun (fichiers, SQLite).

Le module SHALL compiler pour les cibles suivantes :
- `androidTarget` (Android)
- `iosArm64` (iOS device)
- `iosSimulatorArm64` (iOS simulateur)

#### Scenario: Compilation Android
- **WHEN** le module `shared` est compilé pour Android
- **THEN** le module produit un AAR utilisable par l'application Android

#### Scenario: Compilation iOS
- **WHEN** le module `shared` est compilé pour iOS
- **THEN** le module produit un framework utilisable par l'application iOS

### Requirement: Game Engine en commonMain

Le moteur de jeu (machine à états LOCKED→UNLOCKED→ACTIVE→COMPLETED, évaluation des conditions, latch, file FIFO) SHALL vivre entièrement en `commonMain`, sans dépendance à une plateforme spécifique.

Le moteur SHALL supporter :
- Les conditions GEOFENCE, NODE_COMPLETED, TIMER, POOL_DRAWN
- L'opérateur AND|OR pour la fan-in
- Le latch par nœud
- La terminaison via isEnding
- Les pools ON_GAME_START et ON_POOL_ACTIVATION

#### Scenario: Évaluation de condition GEOFENCE
- **WHEN** le moteur évalue une condition GEOFENCE avec les coordonnées du joueur
- **THEN** le nœud passe de LOCKED à UNLOCKED si le joueur est dans le rayon

#### Scenario: Évaluation de condition NODE_COMPLETED
- **WHEN** le moteur évalue une condition NODE_COMPLETED et que le nœud source est COMPLETED
- **THEN** la condition est considérée comme vraie

#### Scenario: File FIFO avec modale unique
- **WHEN** deux nœuds deviennent UNLOCKED simultanément
- **THEN** seul le premier est présenté au joueur, le second attend en file

### Requirement: Import de pack multiplateforme

L'import de packs SHALL fonctionner de manière identique sur Android et iOS, en utilisant une abstraction de fichiers via `expect/actual`.

Le module SHALL :
- Lire le manifest SHA-256 par fichier
- Vérifier l'intégrité de chaque asset
- Refuser un pack partiel ou corrompu avec état explicite
- Persister la progression en SQLite (via abstraction `expect/actual`)

#### Scenario: Import réussi sur Android
- **WHEN** un joueur importe un pack valide sur Android
- **THEN** le pack est vérifié fichier par fichier et le jeu est prêt à démarrer

#### Scenario: Import réussi sur iOS
- **WHEN** un joueur importe un pack valide sur iOS
- **THEN** le pack est vérifié fichier par fichier et le jeu est prêt à démarrer

#### Scenario: Pack corrompu refusé
- **WHEN** un pack contient un fichier avec un SHA-256 incorrect
- **THEN** le pack est refusé avec le nom du fichier fautif

### Requirement: Persistence SQLite multiplateforme

La persistence SHALL utiliser une abstraction `expect/actual` pour SQLite, permettant d'utiliser Room KMP ou SQLDelight sur chaque plateforme.

Le schéma SQLite SHALL contenir au minimum :
- Progression des nœuds (session, nœud, état)
- Tirages aléatoires (session, pool, candidat)
- Événements de jeu (type, nœud, timestamp, flag triche)
- Inventaire du joueur (session, objets obtenus)

#### Scenario: Persistance sur Android
- **WHEN** le joueur progresse dans le jeu sur Android
- **THEN** la progression est écrite en SQLite immédiatement

#### Scenario: Persistance sur iOS
- **WHEN** le joueur progresse dans le jeu sur iOS
- **THEN** la progression est écrite en SQLite immédiatement

#### Scenario: Reprise après kill
- **WHEN** l'application est tuée puis relancée avec le même sessionId
- **THEN** la progression exacte est restaurée (pas de re-tirage)

### Requirement: Compose Multiplatform pour l'UI

L'UI du player SHALL utiliser Compose Multiplatform pour les écrans communs :
- Affichage du graphe de jeu (liste des nœuds, états)
- Affichage des modules (QUIZ, 7-erreurs, PUZZLE, etc.)
- Navigation entre les écrans
- Affichage de la carte (futur : MapLibre Compose)

Les écrans natifs (caméra AR, boussole) restent en `expect/actual` pour l'instant.

#### Scenario: Affichage du graphe sur Android
- **WHEN** le joueur ouvre une partie sur Android
- **THEN** le graphe de nœuds est affiché avec les états LOCKED/UNLOCKED/ACTIVE/COMPLETED

#### Scenario: Affichage du graphe sur iOS
- **WHEN** le joueur ouvre une partie sur iOS
- **THEN** le graphe de nœuds est affiché avec les états LOCKED/UNLOCKED/ACTIVE/COMPLETED

### Requirement: Stubs expect/actual pour modules natifs

Le module `shared` SHALL définir des interfaces `expect` pour les futurs modules natifs, avec des stubs temporaires qui retournent des valeurs par défaut ou lèvent des erreurs explicites.

Les interfaces attendues :
- `LocationProvider` : position GPS (stub : retourne position fixe)
- `CompassProvider` : cap magnétique (stub : retourne 0°)
- `CameraProvider` : accès caméra AR (stub : non disponible)
- `BLEProvider` : scan Bluetooth (stub : aucun périphérique)
- `KioskProvider` : mode kiosque (stub : non disponible)

#### Scenario: Stub GPS utilisé
- **WHEN** le moteur demande la position et que le module natif n'est pas chargé
- **THEN** le stub retourne une position par défaut avec un flag "fallback"

#### Scenario: Stub boussole utilisé
- **WHEN** le moteur demande le cap et que le module natif n'est pas chargé
- **THEN** le stub retourne 0° avec un flag "fallback"

### Requirement: Tests communs (commonTest)

Le module `shared` SHALL inclure des tests unitaires communs (`commonTest`) qui vérifient la logique métier indépendamment de la plateforme.

Les tests SHALL couvrir au minimum :
- Machine à états (LOCKED→UNLOCKED→ACTIVE→COMPLETED)
- Évaluation des conditions (GEOFENCE, NODE_COMPLETED, TIMER, POOL_DRAWN)
- Import et vérification de pack
- Persistence SQLite (via fake)

#### Scenario: Test machine à états
- **WHEN** un test vérifie la transition LOCKED→UNLOCKED
- **THEN** le test passe sans dépendance à une plateforme spécifique

#### Scenario: Test évaluation condition
- **WHEN** un test vérifie une condition NODE_COMPLETED
- **THEN** le test passe avec un fake du moteur
