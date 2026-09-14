# Documentation développeur — architecture moteur GeoPlay

Ce document décrit l'architecture technique du moteur natif GeoPlay pour les développeurs et architectes.

## 1. Vue d'ensemble

GeoPlay est un framework de jeux géolocalisés offline pour iOS et Android. Le moteur est composé de plusieurs couches :

```
┌─────────────────────────────────────────────┐
│            Interface Utilisateur             │
│  (Carte, modales, flèche POI, trace GPX)     │
├─────────────────────────────────────────────┤
│          Orchestrateur d'Activation          │
│  (Boucle d'évaluation, file FIFO, latch)     │
├─────────────────────────────────────────────┤
│           Moteur de Runtime                  │
│  (Machine à états, capteurs, HOLD kiosque)   │
├─────────────────────────────────────────────┤
│           Couche Persistance                 │
│  (SQLite : progression, randomDraws, journal)│
├─────────────────────────────────────────────┤
│           Pack Offline                       │
│  (Manifest SHA-256, diff, background dl)     │
└─────────────────────────────────────────────┘
```

**Langages** : Kotlin natif (iOS/Android) pour le runtime, TypeScript pour le Studio MCP
**Base de données** : SQLite (progression, journal, tirages)
**Format de jeu** : JSON conforme à la norme de validation JSON Schema

## 2. Orchestrateur d'activation

### 2.1 Boucle d'évaluation continue

L'orchestrateur évalue les `activation` en continu (position GPS, horloge, graphe). Les pools `ON_GAME_START` sont résolus en ordre topologique à l'init avant toute évaluation. Chaque tirage est persisté immédiatement en SQLite.

**En mode HOLD** : la boucle continue, mais les signaux `onPause`/`onStop` ne provoquent pas de pause de l'évaluation (sauf kill OS).

```
BOUCLE ÉVALUATION:
  1. Résoudre pools ON_GAME_START en ordre topo
  2. Pour chaque nœud LOCKED :
     a. Évaluer activation.requires[]
     b. Si toutes satisfaites → UNLOCKED
  3. Pour chaque nœud UNLOCKED :
     a. Si GEOFENCE/TIMER auto → ACTIVE
     b. Si NODE_COMPLETED/POOL_DRAWN → choix modale (FIFO)
  4. Persister les tirages en SQLite
```

### 2.2 File FIFO à modale unique

Le runtime présente au plus **1 modale `ACTIVE`** à la fois :
- Passage auto pour `GEOFENCE`/`TIMER`
- Choix (menu/carte) pour `NODE_COMPLETED`/`POOL_DRAWN` multiples
- File d'attente FIFO, `ACTIVE` latché
- Sortie de file si relock

### 2.3 Machine à états

```
LOCKED → UNLOCKED → ACTIVE → COMPLETED
  ↑          ↑          ↑
  └── latch ←──┘
```

- **LOCKED** : nœud éligible mais pas encore satisfait
- **UNLOCKED** : conditions satisfaites, nœud présentable
- **ACTIVE** : modale ouverte, présentée au joueur
- **COMPLETED** : étape terminée

**Latch** : `activation.latch` (défaut `true`) = reste `UNLOCKED` une fois débloqué. `false` = retour `LOCKED` si conditions revocables retombent.

**OnReentry** : `ignore` (défaut) ou `replay` avec `maxReentries` et `scoreOnReplay`.

## 3. Interface MCP

### 3.1 Operations MCP

Le Studio MCP expose les opérations suivantes, toutes validées AJV :

```kotlin
// Configuration HOLD
setHoldMode(gameId, mode: HoldMode)  // none|guidedAccess|screenPinning|lockTask
setHoldExit(gameId, exitConfig: HoldExit)  // method + pin/adminPanel
getHoldConfig(gameId): HoldConfig  // configuration active

// Game operations
composeNodes(gameId, nodes: List<Node>)
setActivation(gameId, nodeId, activation)
registerAsset(gameId, asset: Asset)
validateGame(gameId): ValidationResult  // double couche
buildManifest(gameId): Manifest
exportPack(gameId): Pack  // refusé si validation échoue
```

### 3.2 HoldConfig

```kotlin
data class HoldConfig(
    val holdMode: HoldMode,       // "none"|"guidedAccess"|"screenPinning"|"lockTask"
    val holdExit: HoldExit?,      // method + pin/adminPanel si holdMode != none
    val needsLockModules: List<String>  // modules nécessitant holdMode != none
)
```

**Règles de cohérence** :
- `holdMode != "none"` → `holdExit.method` obligatoire
- Module `needsLock: true` → `holdMode != "none"`
- `holdExit` présent si `holdMode != "none"`

### 3.3 Validation JSON Schema

Le schéma racine contient :
- `global.holdMode` : enum `"none"|"guidedAccess"|"screenPinning"|"lockTask"`
- `global.holdExit` : objet avec `method` requis si `holdMode != "none"` (via `allOf` if/then)
- `additionalProperties: false` à chaque niveau
- `if/then` norme JSON pure pour `operator` obligatoire si `requires` ≥2

## 4. Capteurs

### 4.1 GPS

- Fréquence adaptative (ralentie hors épreuve)
- Gating `maxAccuracyM` + `dwell` + hystérésis depuis le JSON
- En mode HOLD : gating identique, mais position vérifiée même en kiosque
- Capteur absent/interféré = flèche masquée + message discret

### 4.2 Boussole

Service moteur non-validant :
- Heading nord vrai lissé + accuracy
- Flèche POI + distance texte + haptique (jamais couleur seule)
- Utilisable par le module BOUSSOLE pour validation interne

### 4.3 Caméra AR

- Ne s'ouvre qu'à la demande d'un module AR (`AR_MARKER`)
- Fallback 2D obligatoire si caméra/WebGL indisponible

## 5. Persistance SQLite

### 5.1 Tables principales

```kotlin
// Progression joueur
sessionId, nodeId, status (LOCKED|UNLOCKED|ACTIVE|COMPLETED), timestamp

// Tirages de pools
sessionId, poolNodeId, drawnNodeIds[] (persistés immédiatement, jamais recalculés)

// Journal d'événements
eventType (sessionStart|sessionPause|sessionResume|sessionEnd|
           holdLock|holdUnlock|holdExit|holdBlock|holdForceExit|
           holdExitAttempt),
timestamp, sessionId, method?, success?, data?
```

### 5.2 Comportement

- Écriture immédiate (pas de batch)
- Reprendre = même `sessionId` relit l'état
- Nouvelle partie = nouveau `sessionId`
- `randomDraws[sessionId][poolNodeId]` écrit immédiatement

## 6. Offline-first

### 6.1 Manifest

Chaque asset référencé `{path, version, size, sha256}`. Le manifest est la seule source de vérité pour l'intégrité.

### 6.2 Téléchargement

- Vérification SHA-256 par fichier
- Différentiel : ne re-télécharge que les `version` changées
- Reprise après coupure
- Background download
- Pack partiel/corrompu = **non lançable** (état explicite avec progression %)

### 6.3 Carte

- MapLibre Native (pas de Leaflet/WebXR, pas de Mapbox)
- Fond uni si tuiles absentes
- Trace GPX + boussole utilisables sur fond uni
- Image statique de fallback

## 7. Registre de modules

### 7.1 Types enregistrés

| Type | Besoins | Rendu |
|------|---------|-------|
| `QUIZ` | — | Questions + timer |
| `DIFFERENCE_GAME` | `needsCamera` | Polygones % + dilatation |
| `PUZZLE` | `needsMap` | Image découpable |
| `AR_MARKER` | `needsCamera`, `needsLock` optionnel | AR + fallback 2D |
| `BOUSSOLE` | `needsCompass` | Heading + distance |

### 7.2 Extension

Ajouter un module = ajouter une entrée au registre avec son sous-schema versionné. Ne touche jamais au schéma Noeuds/Liens. Le moteur ignore gracieusement un type inconnu.

## 8. Structure du projet

```
geoplay/
├── studio/                    # TypeScript
│   └── src/game/
│       ├── schema/            # JSON Schema (norme de validation)
│       ├── types.ts           # Types TypeScript
│       ├── runtime.ts         # Runtime TypeScript
│       ├── mcp.ts             # MCP server
│       ├── validate.ts        # Double couche validation
│       └── modules.ts         # Registre de modules
├── player/                    # Kotlin natif
│   └── app/src/main/java/
│       └── com/geoplay/player/
│           ├── model/         # GameModels, HoldMode, HoldExit
│           ├── game/          # GameEngine, GameMcp
│           ├── data/          # GameDao, GameDatabase
│           └── ui/            # Interface native
└── docs/                      # Documentation (créée par ce change)
    ├── user/
    ├── dev/
    └── maintainer/
```

## 9. Tests et validation

- `smoke.ts` et `runtime.smoke.ts` : validation des specs via AJV
- `game-5poi.json` : fixture neutre 1/5→FIN (non-régression)
- `openspec validate --changes` et `openspec validate --specs` : validation des specs OpenSpec

---

📖 **Glossaire complet** : [glossary.md](../glossary.md)
