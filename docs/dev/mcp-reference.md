# MCP Reference — GeoPlay

Documentation du protocole Model Context Protocol (MCP) utilisé pour l'intégration entre le Studio et le runtime GeoPlay.

---

## 1. Architecture MCP

Le protocole MCP connecte le **Studio** (serveur TypeScript) au **Player** (client Kotlin). Le Studio expose des opérations que le runtime consomme, et le runtime fournit des fonctions de communication.

```
┌──────────────────┐         MCP Protocol          ┌──────────────────┐
│    Studio MCP     │  ◄────── serveur TS ──────► │  Player Runtime   │
│  (TypeScript)     │         JSON messages         │  (Kotlin/Native)  │
│                   │                               │                   │
│ - composeNodes    │                               │ - GameEngine      │
│ - setActivation   │                               │ - GameMcp         │
│ - validateGame    │                               │ - GameDao         │
│ - exportPack      │                               │ - GameDatabase    │
│ - setHoldMode     │                               │ - PackManager     │
└──────────────────┘                               └──────────────────┘
```

**Principe fondamental** : les deux côtés partagent le **même schéma** (`game-schema.json`). Rien ne sort sans validation AJV des deux côtés.

---

## 2. Opérations du Studio MCP (TypeScript)

### 2.1 `composeNodes`

**Description** : Créer et relier des nœuds sur le canvas du Studio.

**TypeScript** (`studio/src/game/mcp.ts`) :
```typescript
function composeNodes(game: Game, nodes: GameNode[]): Game
```

**Paramètres** :
- `game` : le jeu existant
- `nodes` : tableau de nœuds à ajouter

**Retour** : le jeu mis à jour avec les nouveaux nœuds ajoutés à `nodes[]`

**Validation** : AJV couche 1 (forme locale) avant insertion

---

### 2.2 `setActivation`

**Description** : Configurer les conditions d'activation d'un nœud spécifique.

**TypeScript** :
```typescript
function setActivation(game: Game, nodeId: string, activation: Activation): Game
```

**Paramètres** :
- `game` : le jeu existant
- `nodeId` : identifiant du nœud à modifier
- `activation` : nouvelle activation `{ requires[], operator?, latch? }`

**Retour** : le jeu avec le nœud mis à jour

**Règles** :
- `operator` obligatoire si `requires` contient ≥2 conditions
- `operator` interdit si `requires` contient ≤1 condition

---

### 2.3 `registerAsset`

**Description** : Ajouter un asset au manifest SHA-256.

**TypeScript** :
```typescript
function registerAsset(manifest: ManifestFile[], file: ManifestFile): ManifestFile[]
```

**Paramètres** :
- `manifest` : manifest existant
- `file` : nouveau fichier `{ path, version, size, sha256 }`

**Validation** : Le SHA-256 doit être un hexagone de 64 caractères (`/^[0-9a-f]{64}$/`)

**Retour** : manifest mis à jour (remplace l'ancien fichier par le même chemin)

---

### 2.4 `validateGame`

**Description** : Lancer la double couche de validation (AJV + applicative).

**TypeScript** (`studio/src/game/validate.ts`) :
```typescript
function validateGame(game: unknown): { ok: boolean; layers: LayerReport[] }
```

**Couche 1 (AJV Draft-07)** :
- Validation formelle du JSON contre `game-schema.json`
- Types, champs requis, `additionalProperties: false`
- Enum des conditions fermé
- `global.holdMode` enum valide

**Couche 2 (Applicative)** :
- Cycles inter-nœuds (hors `allowCycle:true`)
- Atteignabilité d'au moins un `isEnding`
- `drawCount <= candidates.length`
- Unicité des candidats inter-pools
- AND-exclusif direct
- Ordre topologique des pools `ON_GAME_START`
- Cohérence HOLD : `holdExit` présent si `holdMode != "none"`

**Retour** : `{ ok: boolean, layers: [{ layer: 1|2, errors: string[] }] }`

---

### 2.5 `buildManifest`

**Description** : Générer le manifest SHA-256 par fichier.

**TypeScript** (`studio/src/game/pack.ts`) :
```typescript
async function sha256Hex(s: string | Uint8Array): Promise<string>
```

**Utilisation** : Calcule l'empreinte SHA-256 de chaque fichier pour le manifest

**Format du manifest** :
```json
{
  "files": [
    { "path": "game.json", "version": "1.0.0", "size": 1024, "sha256": "abc..." },
    { "path": "assets/map.png", "version": "1.0.0", "size": 204800, "sha256": "def..." }
  ]
}
```

---

### 2.6 `exportPack`

**Description** : Exporter le pack de jeu (refusé si validation échoue).

**TypeScript** :
```typescript
async function exportPack(
  game: Game,
  meta: StudioMeta,
  manifest: ManifestFile[],
  animatorMode: boolean
): Promise<ExportResult>
```

**Paramètres** :
- `game` : le jeu validé
- `meta` : métadonnées Studio (provenance, statuts)
- `manifest` : manifest SHA-256
- `animatorMode` : si true, les nœuds `draft` sont autorisés

**Logique** :
1. `validateGame(game)` est appelée
2. Si erreurs → `{ ok: false, errors }`
3. Si `animatorMode == false` et nœud `draft` → erreur
4. Si succès → JSON stringifié + manifest avec fichiers SHA-256 recalculés

**Retour** : `{ ok: boolean, errors: string[], gameJson?: string, manifest?: { files: ManifestFile[] } }`

---

### 2.7 `setHoldMode`

**Description** : Configurer le mode kiosque HOLD.

**TypeScript** :
```typescript
function setHoldMode(game: Game, mode: HoldMode): Game
```

**Paramètres** :
- `game` : le jeu existant
- `mode` : `"none"`, `"guidedAccess"`, `"screenPinning"`, `"lockTask"`

**Règles** :
- Si `holdMode != "none"` alors `holdExit.method` est obligatoire
- `setHoldMode` sans `holdExit` → erreur de cohérence lors de l'export

---

### 2.8 `setHoldExit`

**Description** : Configurer la sortie du mode HOLD.

**TypeScript** :
```typescript
function setHoldExit(game: Game, exitConfig: HoldExit): Game
```

**Paramètres** :
- `game` : le jeu existant
- `exitConfig` : `{ method: "adminPin"|"adminGesture"|"adminQR"|"animateurCode", pin?: string, adminPanel?: { enabled: boolean } }`

---

### 2.9 `getHoldConfig`

**Description** : Obtenir la configuration HOLD active.

**TypeScript** :
```typescript
function getHoldConfig(game: Game): { holdMode: HoldMode; holdExit?: HoldExit }
```

**Retour** : Objet contenant le `holdMode` et éventuellement le `holdExit`

---

### 2.10 `addSecoursCode`

**Description** : Ajouter un code de secours (QR/code tournant) à un nœud.

**TypeScript** :
```typescript
function addSecoursCode(game: Game, nodeId: string): Game
```

**Logique** :
- Crée un nœud `secours-{nodeId}` de type QUIZ
- Ajoute une condition `NODE_COMPLETED` vers le secours sur tous les prédécesseurs
- Change leur `operator` en `OR`

---

### 2.11 `setReview`

**Description** : Définir le statut de relecture d'un nœud.

**TypeScript** :
```typescript
function setReview(meta: StudioMeta, nodeId: string, state: ReviewStatus, reviewedBy?: string): StudioMeta
```

**Paramètres** :
- `meta` : métadonnées Studio
- `nodeId` : nœud concerné
- `state` : `"draft"`, `"reviewed"`, `"published"`
- `reviewedBy` : identifiant de la personne ayant relu

---

## 3. Opérations du Player MCP (Kotlin)

### 3.1 `setHoldMode` (Kotlin)

**Fichier** : `player/app/src/main/java/.../game/mcp/GameMcp.kt`

```kotlin
fun setHoldMode(game: Game, mode: HoldMode): Game
```

**Description** : Configure le mode HOLD du jeu côté runtime.

**Retour** : Le jeu copié avec le nouveau `holdMode`

---

### 3.2 `setHoldExit` (Kotlin)

```kotlin
fun setHoldExit(game: Game, exitConfig: HoldExit): Game
```

**Description** : Configure la sortie du mode HOLD côté runtime.

---

### 3.3 `getHoldConfig` (Kotlin)

```kotlin
fun getHoldConfig(game: Game): Pair<HoldMode, HoldExit?>
```

**Description** : Retourne la configuration HOLD active.

---

### 3.4 `addSecoursCode` (Kotlin)

```kotlin
fun addSecoursCode(game: Game, nodeId: String): Game
```

**Description** : Port du même log que la version TypeScript — ajout d'un nœud QUIZ de secours.

---

## 4. Formats de Requête et Réponse

### 4.1 Requête MCP Standard

Toutes les opérations MCP reçoivent le `game` (objet Game) en entrée et retournent un `Game` modifié ou un résultat.

```json
// Exemple de requête composeNodes
{
  "operation": "composeNodes",
  "game": { "gameId": "reference-5poi", "nodes": [], ... },
  "nodes": [
    {
      "id": "poi-1",
      "module": { "type": "QUIZ", "data": { ... } },
      "activation": { "requires": [{ "type": "POOL_DRAWN", "poolNodeId": "pool-1" }], "operator": "OR" }
    }
  ]
}
```

### 4.2 Validation AJV

Chaque opération est validée avant exécution :

1. **Côté Studio** : `validateGame(game)` → `{ ok, layers }`
2. **Côté Player** : Le runtime valide les données reçues contre le schéma
3. Si validation échoue → erreur retournée, aucune modification appliquée

### 4.3 ExportResult

```json
{
  "ok": true,
  "errors": [],
  "gameJson": "{ ... }",
  "manifest": {
    "files": [
      { "path": "game.json", "version": "1.0.0", "size": 2048, "sha256": "abc123..." }
    ]
  }
}
```

---

## 5. Validation AJV

### 5.1 Schéma

Le schéma de validation est défini dans `studio/src/game/schema/game-schema.json` (JSON Schema Draft-07).

**Schemas de modules enregistrés** :
- `quiz.json` : schéma du module QUIZ
- `difference-game.json` : schéma du module DIFFERENCE_GAME
- `puzzle.json` : schéma du module PUZZLE
- `ar-marker.json` : schéma du module AR_MARKER
- `boussole.json` : schéma du module BOUSSOLE

### 5.2 Compilation AJV

```typescript
const ajv = new Ajv({ allErrors: true, strict: false });
ajv.addSchema(quiz, "https://geoplay.example/schemas/modules/quiz.json");
// ... autres modules
const validateFn = ajv.compile(schema);
```

### 5.3 Règles de Validation

**Couche 1** (formelle) :
- `gameId` : string non vide
- `schemaVersion` / `minEngineVersion` : semver
- `nodes` : tableau ≥1
- `global.holdMode` : enum valide
- `global.holdExit.method` : requis si `holdMode != "none"`
- Chaque nœud : `id`, `module`, `activation` présents
- `activation.operator` : requis si `requires` ≥2

**Couche 2** (logique) :
- Pas de cycles (hors `allowCycle:true`)
- Chaque branche mène à un `isEnding`
- `drawCount <= candidates.length`
- Cohérence HOLD

---

## 6. Flux de Communication

### 6.1 Studio → Player (Export)

```
Studio ──exportPack()──► JSON + Manifest SHA-256 ──► Player
```

1. Le Studio génère `game.json` + `manifest.json`
2. Le pack est distribué (QR, lien, fichier)
3. Le Player importe via `PackManager.importPack()`
4. Vérification SHA-256 par fichier
5. Si tous les fichiers OK → lancement
6. Si corrompu → refus avec progression %

### 6.2 Player → Studio (Import)

```
Player ──QR/URL/Fichier──► PackManager.importPack() ──► Vérification SHA-256
```

1. Le Player reçoit le pack (ZIP ou JSON)
2. `PackManager.importPack()` extrait et vérifie
3. Le manifest est la source de vérité (jamais reconstruit)
4. Anti zip-slip : borne associative sur les chemins
5. Pack partiel/corrompu = non lançable

### 6.3 Mode Triche/Test

Le Studio peut injecter des paramètres de simulation dans le `Sim` object :
- `sim.present` : simulation de présence GEOFENCE
- `sim.dwellOk` : simulation de dwell écoulé
- `sim.nowMs` : horloge de session
- `sim.accuracyM` : précision GPS simulée
- `sim.holdMode` : mode kiosque simulé
- `sim.holdExit` : exit animateur simulé
- Chaque event simulé porte `triche: true`

### 6.4 Mode Preview Studio

Le Studio exécute l'évaluation en mode scripté :
1. Le `evaluate()` est appelé avec un `Sim` simulé
2. Chaque branche peut être forcée (`forceDraw`)
3. `sessionId` est injectable pour la reprise
4. Les events portent le flag triche

---

## 7. Types MCP Partagés

Tous les types sont partagés entre Studio et Player via le même schéma :

| Type | TypeScript | Kotlin | Description |
|------|-----------|--------|-------------|
| `Game` | `interface Game` | `data class Game` | Racine du jeu |
| `GameNode` | `interface GameNode` | `data class GameNode` | Nœud du graphe |
| `Activation` | `interface Activation` | `data class Activation` | Conditions d'activation |
| `Condition` | `interface Condition` | `data class Condition` | Condition individuelle |
| `HoldMode` | `type HoldMode` | `enum class HoldMode` | Mode kiosque |
| `HoldExit` | `interface HoldExit` | `data class HoldExit` | Configuration exit |
| `ModuleData` | `interface ModuleData` | `data class ModuleData` | Données module |
| `RandomPool` | `interface` | `data class RandomPool` | Tirage au sort |
| `ManifestFile` | `interface ManifestFile` | `data class ManifestEntry` | Fichier du manifest |
