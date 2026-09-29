## MODIFIED Requirements

### Requirement: Module shared KMP multiplateforme

Le module `shared` SHALL exposer la logique métier via un API Kotlin commune (`commonMain`), avec des `expect/actual` uniquement pour les fonctions système qui ne peuvent pas vivre en commun (fichiers, SQLite).

Le module SHALL compiler pour les cibles suivantes :
- `androidTarget` (Android)
- `iosArm64` (iOS device)
- `iosSimulatorArm64` (iOS simulateur)

Le WebAssembly (`wasmJs`) SHALL rester une cible de compilation instrumentale reservee au simulateur Studio : il ne SHALL jamais produire un player distribuable, installable ni offline.

#### Scenario: Compilation Android
- **WHEN** le module `shared` est compilé pour Android
- **THEN** le module produit un AAR utilisable par l'application Android

#### Scenario: Compilation iOS
- **WHEN** le module `shared` est compilé pour iOS
- **THEN** le module produit un framework utilisable par l'application iOS

## MODIFIED Requirements (suite)

### Requirement: Compose Multiplatform pour l'UI

L'UI du player SHALL utiliser Compose Multiplatform pour les écrans communs :
- Affichage du graphe de jeu (liste des nœuds, états)
- Affichage des modules (QUIZ, 7-erreurs, PUZZLE, etc.)
- Navigation entre les écrans
- Affichage de la carte (futur : MapLibre Compose)

Les écrans natifs (caméra AR, boussole) restent en `expect/actual` pour l'instant.

#### Scenario: Affichage du graphe sur Android
- **WHEN** le joueur ouvre une partie sur Android
- **THEN** le graphe de nœuds est affiché avec les états LOCKED/UNLOCKED/COMPLETED

#### Scenario: Affichage du graphe sur iOS
- **WHEN** le joueur ouvre une partie sur iOS
- **THEN** le graphe de nœuds est affiché avec les états LOCKED/UNLOCKED/COMPLETED

## ADDED Requirements

### Requirement: Tests communs sans ACTIVE

Le module `shared` SHALL inclure des tests unitaires communs (`commonTest`) qui vérifient la logique métier indépendamment de la plateforme.

Les tests SHALL couvrir au minimum :
- Machine à états (LOCKED→UNLOCKED→COMPLETED)
- Évaluation des conditions (GEOFENCE, NODE_COMPLETED, TIMER, POOL_DRAWN)
- Import et vérification de pack
- Persistence SQLite (via fake)

#### Scenario: Test machine à états
- **WHEN** un test vérifie la transition LOCKED→UNLOCKED
- **THEN** le test passe sans dépendance à une plateforme spécifique

#### Scenario: Test évaluation condition
- **WHEN** un test vérifie une condition NODE_COMPLETED
- **THEN** le test passe avec un fake du moteur

### Requirement: Moteur de jeu en commonMain sans ACTIVE

Le moteur de jeu (machine à états LOCKED→UNLOCKED→COMPLETED, évaluation des conditions, latch) SHALL vivre entièrement en `commonMain`, sans dépendance à une plateforme spécifique.

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

#### Scenario: Eligibles simultanes sans file
- **WHEN** deux nœuds deviennent UNLOCKED simultanément
- **THEN** les deux sont presentables et le joueur choisit librement, sans file imposee

## REMOVED Requirements

### Requirement: Game Engine en commonMain
**Reason**: Le moteur ne connait plus ni `ACTIVE` ni file FIFO (voir Requirement Moteur de jeu en commonMain sans ACTIVE et `game-graph`).
**Migration**: Les scenarios GEOFENCE et NODE_COMPLETED sont repris a l'identique ; le scenario de file est remplace.

### Requirement: Tests communs (commonTest)
**Reason**: Couverture reecrite sans `ACTIVE` (voir Requirement Tests communs sans ACTIVE).
**Migration**: Scenarios repris a l'identique hors vocabulaire d'etats.
