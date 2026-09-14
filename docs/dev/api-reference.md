# API Reference — GeoPlay

Référence complète des interfaces de programmation du framework GeoPlay.

---

## 1. Types de Données Globaux

### Game (Jeu)

La racine de tout jeu GeoPlay. Représente l'intégralité du fichier `game.json`.

**TypeScript** (`studio/src/game/types.ts`) :
```typescript
interface Game {
  gameId: string;              // Identifiant unique du jeu
  schemaVersion: string;       // Version du schéma (semver)
  minEngineVersion: string;    // Version minimale du moteur requise
  branding?: Record<string, unknown>;  // Branding global
  global?: Record<string, unknown> & {
    holdMode?: HoldMode;       // Mode kiosque
    holdExit?: HoldExit;       // Configuration de sortie HOLD
  };
  nodes: GameNode[];           // Tous les nœuds du jeu
}
```

**Kotlin** (`player/app/.../model/GameModels.kt`) :
```kotlin
@Serializable
data class Game(
    val gameId: String,
    val schemaVersion: String = "1.0.0",
    val minEngineVersion: String = "1.0.0",
    val nodes: List<GameNode> = emptyList(),
    val branding: JsonElement? = null,
    val global: JsonElement? = null,
    val holdMode: HoldMode = HoldMode.NONE,
    val holdExit: HoldExit? = null
)
```

### GameNode (Nœud)

Chaque étape du jeu. Contient le module, les conditions d'activation et le comportement de rejeu.

**TypeScript** :
```typescript
interface GameNode {
  id: string;                                    // Identifiant unique
  module: { type: string; data: Record<string, unknown> };  // Module et ses données
  activation: Activation;                        // Conditions d'activation
  onReentry?: "ignore" | "replay";               // Comportement si revisité
  maxReentries?: number;                         // Limite si replay
  scoreOnReplay?: boolean;                       // Score aussi au replay
  isEnding?: boolean;                            // Marque la fin du jeu
  randomPool?: { candidates: string[]; drawCount: number; drawTiming: "ON_POOL_ACTIVATION" | "ON_GAME_START" };
  latch: boolean;                                // Verrouillage d'état
}
```

**Kotlin** :
```kotlin
@Serializable
data class GameNode(
    val id: String,
    val module: ModuleData,
    val activation: Activation,
    val onReentry: OnReentry = OnReentry.IGNORE,
    val maxReentries: Int = 0,
    val scoreOnReplay: Boolean = false,
    val isEnding: Boolean = false,
    val randomPool: RandomPool? = null,
    val latch: Boolean = true
)
```

### Activation

Les conditions qui déverrouillent un nœud et leur opérateur logique.

**TypeScript** :
```typescript
interface Activation {
  requires: Condition[];   // Liste des conditions (≥1)
  operator?: "AND" | "OR"; // ET ou OU (requis si ≥2 conditions)
  latch?: boolean;         // Reste déverrouillé une fois débloqué (défaut: true)
}
```

**Kotlin** :
```kotlin
@Serializable
data class Activation(
    val requires: List<Condition> = emptyList(),
    val operator: Operator? = null,
    val latch: Boolean = true
)
```

### Condition

Une condition d'activation du jeu. Le type détermine les champs requis.

**TypeScript** :
```typescript
interface Condition {
  type: "GEOFENCE" | "NODE_COMPLETED" | "TIMER" | "POOL_DRAWN" | "PROXIMITY_MASTER" | "CONDITIONAL" | "WINDOW";
  // GEOFENCE fields:
  lat?: number; lng?: number; radiusMeters?: number; predicate?: "enter"|"exit"|"dwell"|"through";
  dwellMs?: number; hysteresisMeters?: number; maxAccuracyM?: number;
  // NODE_COMPLETED fields:
  nodeId?: string; allowCycle?: boolean;
  // TIMER fields:
  anchor?: "GAME_START"|"NODE_COMPLETION"; anchorNodeId?: string; delaySeconds?: number;
  // POOL_DRAWN fields:
  poolNodeId?: string;
  // PROXIMITY_MASTER fields:
  masterId?: string; transport?: "ble"|"wifi"; minRssiDbm?: number;
  // Plus tous les champs optionnels selon le type
}
```

**Kotlin** :
```kotlin
@Serializable
data class Condition(
    val type: ConditionType,
    val lat: Double? = null, val lng: Double? = null,
    val radiusMeters: Int? = null, val predicate: Predicate? = null,
    val dwellMs: Long? = null, val hysteresisMeters: Int? = null,
    val maxAccuracyM: Int? = null, val nodeId: String? = null,
    val allowCycle: Boolean = false, val anchor: Anchor? = null,
    val anchorNodeId: String? = null, val delaySeconds: Long? = null,
    val poolNodeId: String? = null, val masterId: String? = null,
    val transport: Transport? = null, val minRssiDbm: Int? = null
)
```

### ModuleData

Données du module. Le champ `type` détermine quel mini-jeu est joué.

**TypeScript** :
```typescript
interface ModuleData {
  type: string;               // QUIZ, DIFFERENCE_GAME, PUZZLE, AR_MARKER, BOUSSOLE, etc.
  data: Record<string, unknown>; // Données spécifiques au module
}
```

**Kotlin** :
```kotlin
@Serializable
data class ModuleData(val type: String, val data: Map<String, JsonElement> = emptyMap())
```

### HoldMode et HoldExit

Configuration du mode kiosque.

**TypeScript** :
```typescript
type HoldMode = "none" | "guidedAccess" | "screenPinning" | "lockTask";
type HoldExitMethod = "adminPin" | "adminGesture" | "adminQR" | "animateurCode";

interface HoldExit {
  method: HoldExitMethod;
  pin?: string;
  adminPanel?: { enabled: boolean };
}
```

**Kotlin** :
```kotlin
enum class HoldMode { NONE, GUIDED_ACCESS, SCREEN_PINNING, LOCK_TASK }
enum class HoldExitMethod { ADMIN_PIN, ADMIN_GESTURE, ADMIN_QR, ANIMATEUR_CODE }
data class HoldExit(val method: HoldExitMethod, val pin: String? = null, val adminPanel: Boolean = false)
```

---

## 2. Types Énumérés

| Enum | Valeurs | Description |
|------|---------|-------------|
| `ConditionType` | `GEOFENCE`, `NODE_COMPLETED`, `TIMER`, `POOL_DRAWN`, `PROXIMITY_MASTER`, `CONDITIONAL`, `WINDOW` | Types de conditions d'activation |
| `HoldMode` | `NONE`, `GUIDED_ACCESS`, `SCREEN_PINNING`, `LOCK_TASK` | Modes de verrouillage kiosque |
| `HoldExitMethod` | `ADMIN_PIN`, `ADMIN_GESTURE`, `ADMIN_QR`, `ANIMATEUR_CODE` | Méthodes de sortie HOLD |
| `Operator` | `AND`, `OR` | Opérateurs logiques pour les conditions |
| `Predicate` | `ENTER`, `EXIT`, `DWELL`, `THROUGH` | Types de déclenchement GEOFENCE |
| `Anchor` | `GAME_START`, `NODE_COMPLETION` | Points d'ancrage pour les TIMERS |
| `DrawTiming` | `ON_POOL_ACTIVATION`, `ON_GAME_START` | Moment du tirage au sort |
| `Transport` | `BLE`, `WIFI` | Transport du PROXIMITY_MASTER |
| `NodeState` | `LOCKED`, `UNLOCKED`, `ACTIVE`, `COMPLETED` | États d'un nœud |
| `OnReentry` | `IGNORE`, `REPLAY` | Comportement quand le joueur revient |
| `ModuleType` | `QUIZ`, `DIFFERENCE_GAME`, `PUZZLE`, `AR_MARKER`, `BOUSSOLE`, `INFO`, `RANDOM_POOL` | Types de modules enregistrés |
| `Difficulty` | `ENFANT`, `FAMILLE`, `EXPERT` | Niveaux de difficulté |
| `GameMode` | `NORMAL`, `ANIMATEUR`, `SOIREE`, `HARDCORE` | Modes de jeu |
| `ReviewStatus` | `DRAFT`, `REVIEWED`, `PUBLISHED` | Statuts de validation du jeu |
| `Milieu` | `EXTERIEUR`, `FORET`, `BATIMENT_CAVE` | Milieux recommandés par le Studio |

---

## 3. Flux d'Exécution

### 3.1 Chargement d'un Jeu

1. Le Studio ouvre le fichier `game.json`
2. Le validateur **couche 1** (AJV Draft-07) vérifie la forme locale
3. Le validateur **couche 2** (applicative) vérifie les cycles, l'atteignabilité, la cohérence HOLD
4. Si validation réussie : le jeu est chargé en mémoire
5. Si validation échoue : l'export est refusé, erreurs retournées

### 3.2 Évaluation (runtime.ts / evaluate.ts)

```
Boucle d'évaluation:
  1. Résoudre les pools ON_GAME_START en ordre topologique (resolveGameStartPools)
  2. Pour chaque nœud LOCKED : évaluer activation.requires[]
  3. Si conditions satisfaites → UNLOCKED
  4. Si UNLOCKED et environnement → AUTO (passage automatique)
  5. Si UNLOCKED et graphe seul → CHOIX (modale à présenter)
  6. Persister les tirages en SQLite immédiatement
```

**TypeScript** (`runtime.ts`) :
- `resolveGameStartPools()` : résolution topologique des pools ON_GAME_START
- `present()` : file FIFO à modale unique (ACTIVE latche)
- `hostModule()` : hôte de module isolé (rendu ou non-jouable)
- `gpsFrequencyHz()` : fréquence GPS adaptative
- `smoothHeading()` : lissage du cap boussole

**Kotlin** (`GameEngine.kt`) :
- `evaluate()` : évaluation complète des nœuds
- `drawPool()` : tirage au sort
- `present()` : file FIFO avec latch
- `condTrue()` : évaluation conditionnelle

### 3.3 Persistance SQLite

Toutes les données sont écrites immédiatement (pas de batch).

**Tables** (`GameDao.kt`) :
- `game_progress` : `sessionId`, `nodeId`, `status`, `timestamp`
- `node_completion` : `sessionId`, `nodeId`, `completedAt`, `score`, `isReplay`, `isCheat`
- `random_draws` : `sessionId`, `poolNodeId`, `drawnNodeId`, `drawnAt`, `isForced`
- `scores` : `sessionId`, `nodeId`, `score`, `isCheat`, `completedAt`
- `sessions` : `sessionId`, `gameId`, `startedAt`, `completedAt`, `isCheatMode`
- `hold_journal` : `sessionId`, `eventType`, `method`, `success`, `timestamp`

---

## 4. Gestion des Packs

### 4.1 Manifest (`pack.ts`)

```typescript
interface ManifestFile {
  path: string;      // Chemin du fichier
  version: string;   // Version du fichier
  size: number;      // Taille en octets
  sha256: string;    // Empreinte SHA-256 (64 hex caractères)
}
```

**Fonctions principales** :
- `sha256Hex()` : calcul de l'empreinte SHA-256
- `verifyManifest()` : vérifie chaque fichier contre le manifest
- `diffManifest()` : détermine quels fichiers ont changé (téléchargement différentiel)
- `launchGate()` : vérifie si le pack est lanceable (tous les fichiers OK)
- `estimateSize()` : estimation de la taille totale
- `selectFond()` : sélection du fond de carte (tuiles/statique/uni)

### 4.2 PackManager (Kotlin)

`PackManager.kt` gère le cycle de vie complet du pack :
- `importPack()` : import depuis un flux ZIP ou JSON
- `importPackFromUrl()` : import depuis une URL réseau
- `verifyFiles()` : vérification SHA-256 par fichier
- `loadPack()` : chargement d'un pack installé
- `getInstalledPacks()` : liste des packs installés

### 4.3 Launch Gate (Gating)

Si un fichier est manquant ou corrompu :
- Le pack **ne se lance pas**
- `LaunchGate` retourne `lancable: false` avec la progression en octets vérifiés
- Le fichier fautif est nommé dans les erreurs

---

## 5. Orchestrateur

### 5.1 File FIFO à Modale Unique

```typescript
interface Presentation {
  activeId: string | null;  // Nœud actuellement affiché
  queue: string[];          // File d'attente des nœuds déverrouillés
}
```

**Règles** :
- Un seul nœud `ACTIVE` à la fois
- Si le nœud `ACTIVE` reste déverrouillé, il reste affiché (latch)
- Les nouveaux nœuds déverrouillés vont dans la file FIFO
- Au relock, la file s'adapte (éviction des nœuds relockés)

### 5.2 Évaluation des Conditions

**GEOFENCE** : Vérifie la présence dans le rayon, le prédicat (enter/exit/dwell/through), l'accuracy GPS, le dwell.

**TIMER** : Se déclenche après un délai minimum depuis `GAME_START` ou la completion d'un nœud `NODE_COMPLETION`.

**POOL_DRAWN** : Le pool a été tiré (le tirage persiste en SQLite).

**NODE_COMPLETED** : Un nœud spécifique a été complété.

**PROXIMITY_MASTER** : L'animateur est à portée BLE/WiFi.

---

## 6. Validation (validate.ts)

### 6.1 Double Couche

**Couche 1** (AJV Draft-07) : Validation formelle du JSON
- Types, champs requis, `additionalProperties: false`
- `global.holdMode` enum valide
- `operator` obligatoire si `requires` ≥2
- `isEnding` présent
- Enum des conditions fermé

**Couche 2** (applicative) : Validation logique
- Cycles inter-nœuds (hors `allowCycle:true`)
- Atteignabilité d'au moins un `isEnding`
- Chaque candidat de pool vers un `isEnding`
- `drawCount <= candidates.length`
- Unicité des candidats inter-pools
- AND-exclusif direct (candidats distincts d'un même pool `drawCount:1`)
- Ordre topologique des pools `ON_GAME_START`
- Cohérence HOLD : `holdExit` présent, `needsLock` ↔ `holdMode != "none"`

### 6.2 Sortie de Validation

```typescript
interface LayerReport {
  layer: 1 | 2;
  errors: string[];
}

function validateGame(game: unknown): { ok: boolean; layers: LayerReport[] }
```

- `ok: true` si les deux couches sont sans erreur
- `layers` contient les erreurs de chaque couche séparément
- Si couche 1 échoue, couche 2 n'est pas exécutée

---

## 7. Registre de Modules

### 7.1 Structure (`modules.ts`)

```typescript
interface ModuleRegistryEntry {
  type: string;
  render?: (data: Record<string, unknown>) => unknown;
  needsLock?: boolean;
}
```

### 7.2 Types Enregistrés

| Type | Besoins | Rendu | Fallback |
|------|---------|-------|----------|
| `QUIZ` | `needsGPS` optionnel | Formulaire + timer | Non |
| `DIFFERENCE_GAME` | `needsCamera` | Overlay polygones % + dilatation | Non |
| `PUZZLE` | `needsMap` | Grille tactile/clavier | Non |
| `AR_MARKER` | `needsCamera`, `needsLock` optionnel | ARKit/ARCore + modèle 3D | Fallback 2D |
| `BOUSSOLE` | `needsCompass` | Flèche nord + distance + haptique | Non-capteur |
| `INFO` | — | Écran texte | Non |
| `RANDOM_POOL` | — | Nœud structurel (invisible joueur) | Non |

---

## 8. i18n et Glossaire (`i18n-ui.ts`)

Le Studio contient un glossaire français interne :
- `MODULES_FR` : libellés des modules (Quiz, 7 erreurs, Puzzle, etc.)
- `CONDITIONS_FR` : libellés des conditions (Zone GPS, Tirée au sort, etc.)
- `FAMILLES` : catégories de l'interface (Épreuve, Déclenchement, etc.)
- `PRESETS_RAYON` : préréglages de rayon GPS (Piéton, Parc, Vélo, Forêt)
- `MILIEUX` : recommandations par milieu (extérieur, forêt, bâtiment)
- `erreurFR()` : traduction des messages d'erreur de validation

---

## 9. Configuration du Studio

### 9.1 StudioMeta (Métadonnées Studio)

```typescript
interface StudioMeta {
  provenance: Record<string, { providerId: string; license: string; sourceUrl: string }>;
  status: Record<string, { state: ReviewStatus; reviewedBy?: string }>;
  overrides: Record<string, Record<string, { difficulty?: string; mode?: string; patch: Record<string, unknown> }>>;
  i18n: { key: string; value: string; locked: boolean }[];
  milieu: Record<string, "exterieur" | "foret" | "batiment-cave">;
}
```

### 9.2 ReviewStatus

| Statut | Signification |
|--------|---------------|
| `draft` | Brouillon (pas jouable hors mode animateur) |
| `reviewed` | Relu (jouable) |
| `published` | Publié (distribué) |
