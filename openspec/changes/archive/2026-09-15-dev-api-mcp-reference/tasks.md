## 1. Documentation de l'API

- [x] 1.1 Créer `docs/dev/api-reference.md` — Types de données globaux du jeu (Game, Node, Module, Activation, Condition) et leurs champs
- [x] 1.2 Documenter les types TypeScript : `types.ts` (GameModels, Node, Activation, Condition, Pool, HoldMode, HoldExit, etc.)
- [x] 1.3 Documenter les types Kotlin : `GameModels.kt` (data classes du runtime)
- [x] 1.4 Documenter le flux d'exécution : comment un jeu est chargé, évalué, et affiché (runtime.ts → evaluate.ts → validate.ts)
- [x] 1.5 Documenter la gestion des packs : `pack.ts` (chargement, vérification SHA-256, différentiel) et `PackManager.kt`
- [x] 1.6 Documenter l'orchestrateur : `runtime.ts` et `evaluate.ts` (boucle d'évaluation, machine à états, file FIFO)
- [x] 1.7 Documenter la validation : `validate.ts` (double couche Draft-07 + applicative) et le schéma JSON
- [x] 1.8 Documenter le registre de modules : `modules.ts` (types enregistrés, besoins, sous-schémas)

## 2. Documentation du MCP

- [x] 2.1 Créer `docs/dev/mcp-reference.md` — Architecture MCP : Studio (serveur TypeScript) ↔ Player (client Kotlin)
- [x] 2.2 Documenter les opérations du Studio MCP : `composeNodes`, `setActivation`, `registerAsset`, `validateGame`, `buildManifest`, `exportPack`, `setHoldMode`, `setHoldExit`, `getHoldConfig`
- [x] 2.3 Documenter les opérations du Player MCP : `GameMcp.kt` (interface Kotlin du MCP client)
- [x] 2.4 Documenter les formats de requête et réponse JSON pour chaque opération MCP
- [x] 2.5 Documenter la validation AJV : comment chaque opération MCP est validée contre le schéma avant exécution
- [x] 2.6 Documenter le flux de communication : comment le Studio envoie des commandes au runtime et reçoit les résultats

## 3. Documentation des Classes, Objets et Fonctions

- [x] 3.1 Créer `docs/dev/classes-reference.md` — TypeScript : `mcp.ts` (classe/objet serveur MCP, méthodes exposées)
- [x] 3.2 TypeScript : `types.ts` (interfaces et types exportés : Game, Node, Activation, Condition, Pool, HoldConfig, etc.)
- [x] 3.3 TypeScript : `validate.ts` (fonctions de validation, structure du résultat de validation)
- [x] 3.4 TypeScript : `runtime.ts` (classe Runtime, méthodes d'évaluation, de persistance, de gestion des états)
- [x] 3.5 TypeScript : `modules.ts` (registre de modules, fonctions d'enregistrement et de rendu)
- [x] 3.6 TypeScript : `evaluate.ts` (moteur d'évaluation, fonctions de résolution des conditions)
- [x] 3.7 Kotlin : `GameEngine.kt` (classe principale du moteur, méthodes publiques)
- [x] 3.8 Kotlin : `GameMcp.kt` (client MCP côté runtime, méthodes de communication)
- [x] 3.9 Kotlin : `GameModels.kt` (data classes : Game, Node, Module, Activation, HoldMode, HoldExit)
- [x] 3.10 Kotlin : `GameDao.kt`, `GameDatabase.kt`, `GameRepository.kt` (couche persistance SQLite)
- [x] 3.11 Kotlin : `PackManager.kt` (gestion des packs : téléchargement, vérification, installation)
- [x] 3.12 Kotlin : `GeoPlayApplication.kt`, `MainActivity.kt`, `GameFragments.kt`, `Adapters.kt` (interface utilisateur)

## 4. Mise à jour de la ROADMAP

- [x] 4.1 Ajouter la référence à ce nouveau change dans `ROADMAP.md`

## 5. Vérification Finale

- [x] 5.1 Exécuter `openspec status --change "dev-api-mcp-reference"` pour vérifier que tous les artifacts sont complets
- [x] 5.2 Exécuter `openspec validate --changes` pour valider le change
- [x] 5.3 Vérifier que les trois fichiers `docs/dev/api-reference.md`, `docs/dev/mcp-reference.md`, `docs/dev/classes-reference.md` sont présents et cohérents
