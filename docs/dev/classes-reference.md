# Classes, Objets et Fonctions — Référence Développeur

Référence exhaustive des classes, objets et fonctions du framework GeoPlay (Kotlin et TypeScript).

---

## 1. TypeScript — Studio MCP (`studio/src/game/`)

### 1.1 mcp.ts — Opérations MCP du Studio

| Fonction | Signature | Description |
|----------|-----------|-------------|
| `composeNodes` | `(game: Game, nodes: GameNode[]) => Game` | Ajoute des nœuds au jeu |
| `setActivation` | `(game: Game, nodeId: string, activation: Activation) => Game` | Modifie les conditions d'activation |
| `registerAsset` | `(manifest: ManifestFile[], file: ManifestFile) => ManifestFile[]` | Ajoute un asset au manifest |
| `exportPack` | `(game: Game, meta: StudioMeta, manifest: ManifestFile[], animatorMode: boolean) => Promise<ExportResult>` | Exporte le pack de jeu |
| `setHoldMode` | `(game: Game, mode: HoldMode) => Game` | Configure le mode HOLD |
| `setHoldExit` | `(game: Game, exitConfig: HoldExit) => Game` | Configure la sortie HOLD |
| `getHoldConfig` | `(game: Game) => { holdMode: HoldMode; holdExit?: HoldExit }` | Obtient la config HOLD |
| `setReview` | `(meta: StudioMeta, nodeId: string, state: ReviewStatus, reviewedBy?: string) => StudioMeta` | Définit le statut de relecture |
| `addSecoursCode` | `(game: Game, nodeId: string) => Game` | Ajoute un nœud QUIZ de secours |

**ExportResult** :
```typescript
interface ExportResult {
  ok: boolean;
  errors: string[];
  gameJson?: string;
  manifest?: { files: ManifestFile[] };
}
```

### 1.2 types.ts — Types TypeScript

**Enums et types** :
```typescript
type Operator = "AND" | "OR";
type Predicate = "enter" | "exit" | "dwell" | "through";
type ConditionType = "GEOFENCE" | "NODE_COMPLETED" | "TIMER" | "POOL_DRAWN" | "PROXIMITY_MASTER" | "CONDITIONAL" | "WINDOW";
type HoldMode = "none" | "guidedAccess" | "screenPinning" | "lockTask";
type HoldExitMethod = "adminPin" | "adminGesture" | "adminQR" | "animateurCode";
type ReviewStatus = "draft" | "reviewed" | "published";
```

**Interfaces** :
| Interface | Champs principaux |
|-----------|-------------------|
| `Condition` | `type`, `lat`, `lng`, `radiusMeters`, `predicate`, `dwellMs`, `nodeId`, `anchor`, `delaySeconds`, `poolNodeId`, `masterId`, `transport`, `minRssiDbm`, etc. |
| `Activation` | `requires: Condition[]`, `operator?: Operator`, `latch?: boolean` |
| `GameNode` | `id`, `module`, `activation`, `onReentry?`, `maxReentries?`, `scoreOnReplay?`, `isEnding?`, `randomPool?`, `latch` |
| `Game` | `gameId`, `schemaVersion`, `minEngineVersion`, `branding?`, `global?`, `nodes[]`, `holdMode`, `holdExit` |
| `StudioMeta` | `provenance`, `status`, `overrides`, `i18n`, `milieu` |
| `HoldExit` | `method`, `pin?`, `adminPanel?` |
| `ManifestFile` | `path`, `version`, `size`, `sha256` |

**Fonction utilitaire** :
```typescript
const emptyMeta = (): StudioMeta => ({ provenance: {}, status: {}, overrides: {}, i18n: [], milieu: {} });
```

### 1.3 validate.ts — Validation

| Fonction | Signature | Description |
|----------|-----------|-------------|
| `validateLayer1` | `(game: unknown) => LayerReport` | Validation AJV Draft-07 (forme locale) |
| `validateLayer2` | `(game: Game) => LayerReport` | Validation applicative (cycles, atteignabilité, etc.) |
| `validateGame` | `(game: unknown) => { ok: boolean; layers: LayerReport[] }` | Double couche complète |
| `estActivable` | `(byId, poolOf, n, done, visiting) => boolean` | Vérifie si un nœud est atteignable |
| `deadEnds` | `(game: Game) => string[]` | Trouve les nœuds sans chemin vers une fin |

**LayerReport** :
```typescript
interface LayerReport {
  layer: 1 | 2;
  errors: string[];
}
```

### 1.4 runtime.ts — Runtime Joueur

| Fonction | Signature | Description |
|----------|-----------|-------------|
| `createHoldState` | `(mode: HoldMode) => HoldState` | Crée l'état HOLD initial |
| `holdLock` | `(state, sessionId) => HoldEvent` | Journalise le verrouillage |
| `holdUnlock` | `(state, method, sessionId) => HoldEvent` | Journalise le déverrouillage |
| `holdExitAttempt` | `(state, sessionId) => HoldEvent` | Journalise une tentative d'exit |
| `holdForceExit` | `(state, sessionId) => HoldEvent` | Journalise une sortie forcée (OS) |
| `isHoldActive` | `(state) => boolean` | Vérifie si HOLD est actif |
| `createSessionEvent` | `(type, sessionId) => SessionEvent` | Crée un event de session |
| `resolveGameStartPools` | `(game, sessionId, forced?, persist?) => Record<string, string[]>` | Résolution topo des pools ON_GAME_START |
| `present` | `(unlocked, prevQueue, prevActive) => Presentation` | File FIFO à modale unique |
| `hostModule` | `(registry, type, data) => { ok: true; value } \| { ok: false; nonJouable }` | Hôte de module isolé |
| `gpsFrequencyHz` | `(phase, batterieFaible) => number` | Fréquence GPS adaptative |
| `accuracyMessage` | `(accuracyM, maxAccuracyM) => string \| null` | Message de précision GPS |
| `smoothHeading` | `(prevDeg, nextDeg, alpha) => number` | Lissage du cap boussole |
| `compassState` | `(accuracyDeg, toleranceDeg) => { masquee, capOk }` | État de la boussole |
| `cameraPolicy` | `(openDemand, closeDemand) => boolean` | Politique d'ouverture caméra |

**HoldState** :
```typescript
interface HoldState {
  active: boolean;
  mode: HoldMode;
  lockedAt: number;
  exitMethod?: HoldExit["method"];
  attempts: number;
  journal: HoldEvent[];
}
```

**Presentation** :
```typescript
interface Presentation {
  activeId: string | null;
  queue: string[];
}
```

### 1.5 evaluate.ts — Moteur d'Évaluation

| Fonction | Signature | Description |
|----------|-----------|-------------|
| `drawPool` | `(pool, seedStr, forced?) => string[]` | Tirage au sort de candidats |
| `condTrue` | `(game, nodeId, c, sim, draws, completedAt, completedCount) => boolean` | Évalue une condition |
| `evalNode` | `(game, n, sim, draws, completedAt, completedCount) => boolean` | Évalue un nœud |
| `evaluate` | `(game, sim, draws, completedAt, completedCount, prevUnlocked) => EvalResult` | Évaluation complète |

**Sim** (simulation) :
```typescript
interface Sim {
  present: Set<string>;       // GEOFENCE/PROXIMITY simule vrai
  dwellOk: Set<string>;       // Dwell écoulé
  throughOk: Set<string>;     // Traversée simulée
  nowMs: number;              // Horloge session
  completedAt: Map<string, number>;  // Timestamps de completion
  accuracyM?: number;         // Précision GPS simulée
  holdMode?: string;          // Mode kiosque simulé
  holdExit?: { method: string };  // Exit simulé
}
```

**EvalResult** :
```typescript
interface EvalResult {
  unlocked: string[];  // Tous les nœuds déverrouillés
  auto: string[];      // Conditions environnementales → passage auto
  choice: string[];    // Graphe seul → choix (modale)
}
```

### 1.6 pack.ts — Gestion des Packs

| Fonction | Signature | Description |
|----------|-----------|-------------|
| `sha256Hex` | `(s: string \| Uint8Array) => Promise<string>` | Empreinte SHA-256 |
| `verifyManifest` | `(manifest, lire) => Promise<FileCheck[]>` | Vérifie chaque fichier |
| `diffManifest` | `(ancien, nouveau, etatLocal) => { aTelecharger, conserves }` | Différentiel de fichiers |
| `launchGate` | `(checks, manifest) => LaunchGate` | Vérifie si le pack est lanceable |
| `estimateSize` | `(manifest) => { octets, lisible }` | Estimation de taille |
| `checkQuota` | `(manifest, octetsLibres) => { ok, message }` | Vérifie l'espace disque |
| `selectFond` | `(tuilesDisponibles, statiqueDisponible) => FondCarte` | Sélection du fond de carte |

### 1.7 modules.ts — Registre de Modules

| Fonction | Signature | Description |
|----------|-----------|-------------|
| `hitTest` | `(polygons, px, py, dilatation) => boolean` | Test de touche dans polygone dilaté |
| `arMode` | `(caps: ArCaps) => { mode: "ar" \| "fallback2D"; motif: string }` | Mode AR ou fallback |

### 1.8 i18n-ui.ts — Traductions et Glossaire

| Constante | Description |
|-----------|-------------|
| `MODULES_FR` | Libellés français des modules |
| `CONDITIONS_FR` | Libellés français des conditions |
| `FAMILLES` | Catégories de l'interface (Épreuve, Déclenchement, etc.) |
| `PRESETS_RAYON` | Préréglages de rayon GPS |
| `MILIEUX` | Recommandations par milieu |
| `ETATS_FR` | Traductions des statuts |
| `OPERATEURS_FR` | Traductions des opérateurs |
| `erreurFR()` | Traduction des messages d'erreur de validation |

---

## 2. Kotlin — Player Runtime (`player/app/src/main/java/...`)

### 2.1 GameEngine.kt — Moteur d'Évaluation

| Fonction | Signature | Description |
|----------|-----------|-------------|
| `evaluate` | `(Game, Sim, draws, completedAt, completedCount, prevUnlocked) => EvalResult` | Évaluation complète |
| `drawPool` | `(GameNode, seedStr, forced?) => List<String>` | Tirage au sort |
| `present` | `(unlocked, prevQueue, prevActive) => Presentation` | File FIFO à modale unique |
| `condTrue` | `(nodeId, condition, sim, draws, completedAt) => Boolean` | Évalue une condition |
| `evalNode` | `(GameNode, sim, draws, completedAt) => Boolean` | Évalue un nœud |
| `createHoldState` | `(HoldMode) => HoldState` | Crée l'état HOLD |
| `holdLock` | `(HoldMode, sessionId) => SessionEvent` | Journalisation holdLock |
| `holdUnlock` | `(HoldMode, HoldExitMethod, sessionId) => SessionEvent` | Journalisation holdUnlock |
| `holdExitAttempt` | `(sessionId) => SessionEvent` | Journalisation holdExitAttempt |
| `holdForceExit` | `(sessionId) => SessionEvent` | Journalisation holdForceExit |
| `isHoldBlocking` | `(HoldMode) => Boolean` | Vérifie si HOLD bloque |
| `validateHoldConfig` | `(Game) => List<String>` | Cohérence HOLD |
| `accuracyMessage` | `(accuracyM, maxAccuracyM) => String?` | Message précision GPS |
| `presentWithHold` | `(unlocked, prevQueue, prevActive, holdActive, holdMode) => Presentation` | Présentation avec HOLD |

### 2.2 GameMcp.kt — Client MCP

| Fonction | Signature | Description |
|----------|-----------|-------------|
| `addSecoursCode` | `(Game, String) => Game` | Ajout nœud secours |
| `setHoldMode` | `(Game, HoldMode) => Game` | Configuration HOLD |
| `setHoldExit` | `(Game, HoldExit) => Game` | Configuration exit |
| `getHoldConfig` | `(Game) => Pair<HoldMode, HoldExit?>` | Obtention config HOLD |

### 2.3 GameModels.kt — Modèles de Données

**Enums** :
| Enum | Valeurs |
|------|---------|
| `ConditionType` | `GEOFENCE`, `NODE_COMPLETED`, `TIMER`, `POOL_DRAWN`, `PROXIMITY_MASTER`, `CONDITIONAL`, `WINDOW` |
| `HoldMode` | `NONE`, `GUIDED_ACCESS`, `SCREEN_PINNING`, `LOCK_TASK` |
| `HoldExitMethod` | `ADMIN_PIN`, `ADMIN_GESTURE`, `ADMIN_QR`, `ANIMATEUR_CODE` |
| `Operator` | `AND`, `OR` |
| `Predicate` | `ENTER`, `EXIT`, `DWELL`, `THROUGH` |
| `Anchor` | `GAME_START`, `NODE_COMPLETION` |
| `DrawTiming` | `ON_POOL_ACTIVATION`, `ON_GAME_START` |
| `Transport` | `BLE`, `WIFI` |
| `NodeState` | `LOCKED`, `UNLOCKED`, `ACTIVE`, `COMPLETED` |
| `OnReentry` | `IGNORE`, `REPLAY` |
| `ModuleType` | `QUIZ`, `DIFFERENCE_GAME`, `PUZZLE`, `AR_MARKER`, `BOUSSOLE`, `INFO`, `RANDOM_POOL` |
| `Difficulty` | `ENFANT`, `FAMILLE`, `EXPERT` |
| `GameMode` | `NORMAL`, `ANIMATEUR`, `SOIREE`, `HARDCORE` |
| `ReviewStatus` | `DRAFT`, `REVIEWED`, `PUBLISHED` |
| `Milieu` | `EXTERIEUR`, `FORET`, `BATIMENT_CAVE` |

**Data Classes** :
| Classe | Description |
|--------|-------------|
| `Game` | Racine du jeu (identique au TypeScript) |
| `GameNode` | Nœud du graphe |
| `Activation` | Conditions d'activation |
| `Condition` | Condition individuelle (plate, un seul type sérialisable) |
| `RandomPool` | Tirage au sort |
| `HoldExit` | Configuration de sortie HOLD |
| `Branding` | Branding du jeu |
| `GlobalData` | Données globales (GPS, carte, GPX) |
| `MapConfig` | Configuration de la carte |
| `Bbox` | Boîte englobante |
| `GpxTrace` | Trace GPX |
| `ModuleData` | Données du module |
| `MilieuPreset` | Préréglage de milieu |

### 2.4 GameDao.kt — Accès Base de Données

| Méthode | Description |
|---------|-------------|
| `insertProgress()` | Insère/Mise à jour de la progression |
| `getProgress(sessionId)` | Récupère la progression d'une session |
| `deleteProgress(sessionId)` | Supprime la progression |
| `insertNodeCompletion()` | Insère une complétion de nœud |
| `getNodeCompletion(sessionId, nodeId)` | Récupère une complétion |
| `getAllCompletionsForSession(sessionId)` | Toutes les complétions |
| `getCompletionCount(sessionId, nodeId)` | Nombre de complétions |
| `getReplayCount(sessionId, nodeId)` | Nombre de replays |
| `insertRandomDraw()` | Insère un tirage |
| `getRandomDraw(sessionId, poolNodeId)` | Récupère un tirage |
| `insertScore()` | Insère un score |
| `getScoresForSession(sessionId)` | Tous les scores |
| `getTotalScore(sessionId)` | Score total (hors triche) |
| `insertHoldJournal()` | Journalise un event HOLD |
| `getHoldJournal(sessionId)` | Journal HOLD complet |
| `insertSession()` | Insère une session |
| `getSession(sessionId)` | Récupère une session |
| `completeSession(sessionId, completedAt)` | Marque la session comme terminée |

### 2.5 GameDatabase.kt — Base SQLite

```kotlin
@Database(
    entities = [
        GameProgressEntity::class,
        NodeCompletionEntity::class,
        RandomDrawEntity::class,
        ScoreEntity::class,
        SessionEntity::class,
        HoldJournalEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class GameDatabase : RoomDatabase() {
    abstract fun gameDao(): GameDao
}
```

**Tables** :
| Table | Contenu |
|-------|---------|
| `game_progress` | `sessionId`, `gameId`, `currentNodeId`, `completedNodes`, `draws` |
| `node_completion` | `sessionId`, `nodeId`, `completedAt`, `score`, `isReplay`, `isCheat` |
| `random_draws` | `sessionId`, `poolNodeId`, `drawnNodeId`, `drawnAt`, `isForced` |
| `scores` | `sessionId`, `nodeId`, `score`, `isCheat`, `completedAt` |
| `sessions` | `sessionId`, `gameId`, `startedAt`, `completedAt`, `isCheatMode` |
| `hold_journal` | `sessionId`, `eventType`, `method`, `success`, `timestamp` |

### 2.6 GameRepository.kt — Couche Métier

| Méthode | Description |
|---------|-------------|
| `createSession(gameId, sessionId)` | Crée une nouvelle session |
| `getSession(sessionId)` | Récupère une session |
| `completeSession(sessionId)` | Termine une session |
| `getProgress(sessionId)` | Progression |
| `saveProgress(progress)` | Sauvegarde la progression |
| `completeNode(sessionId, nodeId, score, isReplay, isCheat)` | Complète un nœud |
| `saveRandomDraw(draw)` | Sauvegarde un tirage |
| `recordScore(sessionId, nodeId, score, isCheat)` | Enregistre un score |
| `getSessionsForGame(gameId)` | Toutes les sessions d'un jeu |

### 2.7 PackManager.kt — Gestion des Packs

| Méthode | Description |
|---------|-------------|
| `importPack(inputStream, onProgress)` | Import depuis ZIP/JSON |
| `importPackFromUrl(url, onProgress)` | Import depuis URL |
| `loadPack(packName)` | Charge un pack installé |
| `getInstalledPacks()` | Liste des packs installés |

**PackVerificationResult** :
```kotlin
data class PackVerificationResult(
    val isValid: Boolean,
    val errors: List<String>,
    val progressPercent: Float,
    val missingFiles: List<String>,
    val corruptedFiles: List<String>
)
```

### 2.8 GeoPlayApplication.kt — Point d'Entrée Application

| Méthode | Description |
|---------|-------------|
| `onCreate()` | Initialisation de la base de données et pack de référence |
| `copyReferencePackIfNeeded()` | Import du pack `reference-5poi.json` si absent |

### 2.9 MainActivity.kt — Interface Utilisateur

| Méthode | Description |
|---------|-------------|
| `onCreate()` | Configuration du navigation drawer |
| `handleImportDeepLink(intent)` | Gestion du deep link QR (`geoplay://import?url=...`) |
| `onNewIntent(intent)` | Gestion des nouveaux intents |
| `onOptionsItemSelected(item)` | Navigation |

---

## 3. Schéma JSON (`game-schema.json`)

Le schéma de validation est défini dans `studio/src/game/schema/game-schema.json` (JSON Schema Draft-07).

**Champs racine requis** : `gameId`, `schemaVersion`, `minEngineVersion`, `nodes`

**Propriétés principales** :
| Champ | Type | Contraintes |
|-------|------|-------------|
| `gameId` | string | `minLength: 1` |
| `schemaVersion` | string | Pattern semver |
| `minEngineVersion` | string | Pattern semver |
| `branding` | object | Libre |
| `global.holdMode` | string | Enum: `none`, `guidedAccess`, `screenPinning`, `lockTask` |
| `global.holdExit` | object | `method` requis si `holdMode != "none"` |
| `nodes` | array | ≥1 élément, `additionalProperties: false` |
| `additionalProperties` | — | `false` à chaque niveau |

---

## 4. Classes Room Entities

| Entity | Table | Champs principaux |
|--------|-------|-------------------|
| `GameProgressEntity` | `game_progress` | `sessionId`, `gameId`, `currentNodeId`, `completedNodes`, `draws`, `completedCounts`, `replays` |
| `NodeCompletionEntity` | `node_completion` | `sessionId`, `nodeId`, `completedAt`, `score`, `isReplay`, `isCheat` |
| `RandomDrawEntity` | `random_draws` | `sessionId`, `poolNodeId`, `drawnNodeId`, `drawnAt`, `isForced` |
| `ScoreEntity` | `scores` | `sessionId`, `nodeId`, `score`, `isCheat`, `completedAt` |
| `SessionEntity` | `sessions` | `sessionId`, `gameId`, `startedAt`, `completedAt`, `isCheatMode` |
| `HoldJournalEntity` | `hold_journal` | `sessionId`, `eventType`, `method`, `success`, `timestamp` |

---

## 5. Constantes et Préréglages

### 5.1 Préréglages de Rayon GPS (`i18n-ui.ts`)

| Nom | Mètres | Description |
|-----|--------|-------------|
| Piéton | 15 | Centre-ville, précision correcte |
| Parc | 30 | Défaut : jardins, places |
| Vélo | 50 | Vitesse : anticipe la traversée |
| Forêt | 60 | GPS dégradé + attente longue |

### 5.2 Milieux (`i18n-ui.ts`)

| Milieu | Recommandation |
|--------|----------------|
| Extérieur | Zone GPS 15–30 m, ouverture rapide |
| Forêt dense | Zone GPS élargie 40–60 m + attente longue |
| Bâtiment/cave | Près de l'animateur, puis QR/code/AR/animateur en secours |
