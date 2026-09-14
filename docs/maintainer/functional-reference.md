# Référence fonctionnelle — GeoPlay framework

Document de référence exhaustif pour les mainteneurs du framework GeoPlay.

## 1. Conditions d'activation

### 1.1 Enum des conditions

| Type | Champs | Description |
|------|--------|-------------|
| `GEOFENCE` | `lat`, `lng`, `radiusMeters`, `predicate`, `dwellMs`, hystérésis, `maxAccuracyM` | Zone géographique |
| `NODE_COMPLETED` | `nodeId` | Un nœud spécifique est `COMPLETED` |
| `TIMER` | `anchor` (`GAME_START`\|`NODE_COMPLETION`), `anchorNodeId`, `delai` | Délai minimum avant éligibilité |
| `POOL_DRAWN` | `poolNodeId` | Un candidat a été tiré du pool |
| `PROXIMITY_MASTER` | `masterId`, `transport` (`ble`\|`wifi`), `minRssiDbm`, `dwellMs` | Proximité physique (MASTER temporaire) |
| `CONDITIONAL` | (réservé) | Branchement gamebook |
| `WINDOW` | `from`, `to`, `timezone`, `onMiss` | Fenêtre horaire absolue |

### 1.2 GEOFENCE

- `predicate: enter|exit|dwell|through`
- `dwellMs` : anti-traversée (le joueur doit rester dans le rayon)
- `through` : corridor sans arrêt requis
- Hystérésis de sortie distinct de l'entrée
- Gating `maxAccuracyM` + `dwell` + hystérésis depuis le JSON

### 1.3 TIMER

- `anchor` obligatoire : `GAME_START` ou `NODE_COMPLETION` + `anchorNodeId`
- Le temps limite de réponse interne d'un module (`timeLimitSeconds`) ne peut **jamais** être une condition d'activation du graphe

### 1.4 PROXIMITY_MASTER

- MASTER temporaire (téléphone animateur, Arduino BLE)
- `transport` : `ble` ou `wifi`
- Revocable comme `GEOFENCE` : `latch`, hystérésis, `dwell`, file ACTIVE
- Aucun identifiant sensible dans `masterId`

### 1.5 RANDOM_POOL

- `{candidates[], drawCount, drawTiming ON_POOL_ACTIVATION|ON_GAME_START}`
- Tirage sans remise au socle (`withReplacement` supprimé)
- `ON_POOL_ACTIVATION` : tire quand le pool devient `UNLOCKED`
- `ON_GAME_START` : tire à l'init de session, ordre topo si dépendance
- Un `nodeId` ne peut apparaître que dans un seul pool
- `randomDraws[sessionId][poolNodeId]` persisté immédiatement

## 2. États de nœuds et transitions

### 2.1 Machine à états

```
┌──────────┐    conditions    ┌──────────┐    déclencheur    ┌──────────┐
│  LOCKED  │ ──────────────→ │ UNLOCKED │ ───────────────→ │  ACTIVE  │
│          │    satisfaites  │ (éligible│    (modale)      │(presenté)│
└──────────┘                 └──────────┘                  └──────────┘
                                    ↓
                              ┌──────────┐
                              │COMPLETED │
                              └──────────┘
```

### 2.2 Latch et OnReentry

| Propriété | Valeur | Comportement |
|-----------|--------|-------------|
| `latch` | `true` (défaut) | Reste `UNLOCKED` une fois débloqué, même si condition revocable retombe |
| `latch` | `false` | Retour `LOCKED` si conditions revocables retombent (avec hystérésis) |
| `onReentry` | `ignore` (défaut) | La modale ne se rouvre pas si le joueur quitte et revient |
| `onReentry` | `replay` | La modale se rouvre, jusqu'à `maxReentries` fois |
| `scoreOnReplay` | `false` (défaut) | Seule la 1ère completion score |

**Seules `GEOFENCE` et `WINDOW` sont revocables.**

### 2.3 Concurrence

- Au plus 1 modale `ACTIVE` à la fois
- File FIFO pour les déclencheurs multiples simultanés
- `ACTIVE` latché : la modale ouverte ne se ferme pas à la sortie de zone

## 3. Registre de modules

### 3.1 Module socle

| Type | Description | Besoins | Rendu |
|------|-------------|---------|-------|
| `QUIZ` | Questions, options, temps | — | Formulaire + timer |
| `DIFFERENCE_GAME` | 7-erreurs, polygones % | `needsCamera` | Overlay polygones |
| `PUZZLE` | Image + découpage | `needsMap` | Grille tactile/clavier |
| `AR_MARKER` | Marqueur + 3D + fallback | `needsCamera` | ARKit/ARCore + 2D |
| `BOUSSOLE` | Heading nord vrai | `needsCompass` | Flèche + distance |

### 3.2 Besoins optionnels

Chaque module peut déclarer :
- `needsGPS` : nécessite le GPS
- `needsCompass` : nécessite la boussole
- `needsCamera` : nécessite la caméra
- `needsMap` : nécessite la carte
- `needsLock` : nécessite `holdMode != "none"`

### 3.3 Besoins et validation

Un module `needsLock: true` ne peut être joué que si `global.holdMode != "none"`. Le validateur applicatif rejette si `needsLock` est présent avec `holdMode: "none"`.

## 4. Règles de validation

### 4.1 Double couche

**Couche 1 — Norme JSON** :
- `operator` obligatoire si `requires` ≥2 (`if/then` pur), interdit si ≤1
- `isEnding` présent au moins une fois
- Enum des conditions fermé (`GEOFENCE|NODE_COMPLETED|TIMER|POOL_DRAWN|PROXIMITY_MASTER|CONDITIONAL|WINDOW`)
- `withReplacement` exclu dans `randomPool`
- `additionalProperties:false` à chaque niveau
- `global.holdMode` enum valide
- `global.holdExit.method` requis si `holdMode != "none"`

**Couche 2 — Applicative** :
- Construction du graphe en ignorant `allowCycle:true`, rejet de cycles résiduels
- Atteignabilité d'un `isEnding` sous hypothèse favorable
- `RANDOM_POOL` et `OR` comme chemins alternatifs
- Chaque candidat de pool vers un `isEnding`
- Détection AND-sur-branches-exclusives (cas direct uniquement)
- Ordre topo des pools `ON_GAME_START`
- `drawCount <= candidates.length`
- Unicité d'un `nodeId` dans un seul pool

### 4.2 Cohérence HOLD

- `holdExit` présent si `holdMode != "none"`
- Format PIN/geste valide
- Tout module `needsLock: true` a un `holdMode` actif
- Mode HOLD nécessite le statut `reviewed` (pas `draft`)

### 4.3 Hypothèse environnementale

Le validateur ne prouve jamais qu'un GPS entrera dans un rayon. La garantie est libellée comme **atteignabilité structurelle sous hypothèse d'environnement favorable**.

## 5. Modes système

### 5.1 Enum des modes

| Mode | Description |
|------|-------------|
| `none` | Mode normal (défaut) |
| `triche/test` | Bypass GEOFENCE, auto-validation Quiz, forceDraw |
| `preview Studio` | Même mécanisme de bypass, entrée Studio |
| `guidedAccess` | Verrouillage terminal iOS |
| `screenPinning` | Verrouillage écran Android |
| `lockTask` | Lock Task Mode Android |

### 5.2 HOLD

- `global.holdMode` : `"none"|"guidedAccess"|"screenPinning"|"lockTask"`
- `global.holdExit` : `{method: "adminPin"|"adminGesture"|"adminQR"|"animateurCode"}`
- Verrouillage OS immédiat avant première interaction joueur
- Exit réservé à l'animateur (panneau admin uniquement)
- Tous les events portent le flag `holdMode`

### 5.3 Triche

- Bypass `GEOFENCE` + auto-validation Quiz + `forceDraw`
- Chaque event porte le flag `triche`
- Distingué du parcours terrain dans le scoring

## 6. Offline-first

### 6.1 Manifest

```json
{
  "files": [
    {"path": "game.json", "version": "1.0.0", "size": 1024, "sha256": "abc..."},
    {"path": "assets/map.png", "version": "1.0.0", "size": 204800, "sha256": "def..."}
  ]
}
```

- Un fichier corrompu = pack non lançable (état explicite avec progression %)
- Différentiel : ne re-télécharge que les fichiers dont la `version` a changé

### 6.2 SQLite

- `randomDraws[sessionId][poolNodeId]` : tirages persistés
- Progression, états de nœuds, journal d'événements
- Reprendre = même `sessionId` relit ; nouvelle partie = nouveau `sessionId`

## 7. Historique des changes

| # | Change | Contenu |
|---|--------|---------|
| 0 | `000-framework-architecture` | Socle : lexique, graphe, conditions, états, validation 2 couches |
| 1 | `100-define-game-schema` | Schéma de validation JSON + registre + branding + exemple 5 POI |
| 2 | `200-studio-mcp-authoring` | Studio MCP, provenance, statuts, overrides, i18n |
| 3 | `300-offline-native-engine` | Moteur natif : SQLite, manifest SHA-256, packs offline |
| 4 | `400-map-viewer-orchestrator` | Viewer + orchestrateur : états, latch, boussole, trace GPX |
| 5 | `500-minigames-modules-registry` | Registre modules : QUIZ, 7-erreurs, PUZZLE, AR_MARKER, BOUSSOLE |
| 710 | `710-hold-kiosk-mode` | Verrouillage terminal kiosque, sortie animateur, journalisation I/O |
| 800 | `800-add-framework-docs` | Documentation créateur, développeur, mainteneur |

### Changes différés

`600-sync-scoring-master`, `610-branding-system-modes`, `620-i18n-difficulty-validation`, `630-window-conditional`, `640-a11y-battery-sos-tests`

## 8. Sources de vérité

- **Specs** : `openspec/specs/` (chaange 000 et suivants)
- **Schema** : `studio/src/game/schema/game-schema.json`
- **Exemple** : `game-5poi.json` (fixture neutre 1/5→FIN)
- **Config** : `openspec/config.yaml`
- **Feuille de route** : `ROADMAP.md`

Toute modification du schéma doit être propagée au Studio MCP, au runtime natif, à l'orchestrateur et aux modules du registre.

---

📖 **Glossaire complet** : [glossary.md](../glossary.md)
