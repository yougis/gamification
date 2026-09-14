# Guide Créateur — GeoPlay Studio

Ce guide accompagne les créateurs dans la composition de jeux GeoPlay à l'aide du Studio et de son interface MCP.

## 1. Introduction au Studio

Le Studio GeoPlay est un éditeur visuel qui permet de composer des jeux géolocalisés sans écrire de JSON à la main. Chaque modification du graphe garantit un export JSON conforme au schéma.

### 1.1 Canvas graphe

Le canvas affiche les nœuds comme des boîtes draggables et les arêtes d'activation comme des flèches entre eux. Chaque nœud porte un module (QUIZ, DIFFERENCE_GAME, PUZZLE, AR_MARKER, BOUSSOLE) et des conditions d'activation.

- **Glisser-déposer** : déposez un `RANDOM_POOL` puis reliez les POI candidats
- **Connexions** : les arêtes représentent `activation.requires[]` avec un `operator` (`AND|OR`)
- **Validation en temps réel** : l'export est bloqué si le graphe est cassé (cycles non autorisés, prérequis sans opérateur)

### 1.2 Types de modules

| Module | Description | Besoins |
|--------|-------------|---------|
| `QUIZ` | Questions, options, index correct, temps limité | `needsGPS` optionnel |
| `DIFFERENCE_GAME` | 7-erreurs avec polygones % et dilatation tactile | `needsCamera` |
| `PUZZLE` | Image + découpage, tactile et clavier | `needsMap` |
| `AR_MARKER` | Marqueur + modèle 3D + fallback 2D | `needsCamera`, `needsLock` optionnel |
| `BOUSSOLE` | Heading nord vrai, validation interne, fallback non-capteur | `needsCompass` |

### 1.3 Configuration globale

Le jeu est configuré via `global` :
- **Carte** : provider, bbox, minZoom, maxZoom, attribution, fond uni de fallback
- **Branding** : objet de données (global + surcharge par nœud)
- **Modes système** : triche/test, preview Studio, HOLD kiosque
- **Rayon GPS global** : par défaut pour les GEOFENCE

## 2. Utilisation du MCP

Le Studio expose un ensemble d'opérations MCP pour composer, valider et exporter des jeux. Toutes sont validées AJV contre le même schéma que le runtime.

### 2.1 Opérations principales

| Opération | Description |
|-----------|-------------|
| `composeNodes` | Créer et relier des nœuds sur le canvas |
| `setActivation` | Configurer les conditions d'activation d'un nœud |
| `registerAsset` | Ajouter un asset au manifest (chemin, version, SHA-256) |
| `validateGame` | Lancer la double couche de validation (norme JSON + applicative) |
| `buildManifest` | Générer le manifest SHA-256 par fichier |
| `exportPack` | Exporter le pack de jeu (refusé si validation échoue) |

### 2.2 Configuration HOLD via MCP

Pour les jeux en mode kiosque (flotte fournie) :

```
setHoldMode(gameId, "guidedAccess")  → global.holdMode
setHoldExit(gameId, {method: "adminPin", pin: "1234"})  → global.holdExit
getHoldConfig(gameId)  → configuration HOLD active
```

- Si `holdMode != "none"`, `holdExit` est **obligatoire**
- L'export est refusé si `holdMode` est configuré sans `holdExit`
- `getHoldConfig` retourne la configuration actuelle

### 2.3 Règles d'validation

**Couche 1 — Norme JSON** :
- `operator` obligatoire si `requires` a ≥2 conditions (`if/then`)
- `isEnding` présent au moins une fois
- Enum des conditions fermé (incluant `PROXIMITY_MASTER`)
- `withReplacement` exclu dans `randomPool`
- `global.holdMode` enum valide, `holdExit.method` requis si `holdMode != "none"`

**Couche 2 — Applicative** :
- Cycles inter-nœuds rejetés (hors `allowCycle:true`)
- Atteignabilité d'au moins un `isEnding` sous hypothèse favorable
- `drawCount <= candidates.length` pour chaque pool
- Pas d'AND-exclusif direct entre candidats d'un même pool `drawCount:1`
- Ordre topo des pools `ON_GAME_START`
- Cohérence HOLD : `holdExit` présent, `needsLock` ↔ `holdMode != "none"`

## 3. Modes système

### 3.1 Mode triche/test

Le mode triche in-app permet de bypasser des conditions pour le test :
- **Bypass `GEOFENCE`** : force la validation géographique
- **Auto-validation Quiz** : répond automatiquement aux questions
- **`forceDraw`** : force le tirage d'un candidat de pool spécifique

Chaque event de triche porte le flag `triche`. Le scoring distingue les parcours terrain des parcours triche.

### 3.2 Preview Studio

Le simulateur pas-à-pas permet de :
- Bypass capteurs (position simulée, heading simulé)
- `forceDraw` par branche
- Injection `sessionId`
- Chaque event simulé porte le flag triche

**Preview HOLD** : en plus, `forceHoldLock` et `forceHoldExit` avec flags `triche` et `holdMode`.

### 3.3 Mode HOLD kiosque

Pour flotte fournie (pas BYOD). Le terminal est verrouillé :
- `global.holdMode` : `"none"`, `"guidedAccess"`, `"screenPinning"`, `"lockTask"`
- `global.holdExit` : `{method: "adminPin"|"adminGesture"|"adminQR"|"animateurCode"}`
- Le verrouillage OS est activé avant la première interaction joueur
- L'exit est réservé à l'animateur via le panneau admin
- Tous les events portent le flag `holdMode`

**Important** : un jeu en `draft` avec `holdMode != "none"` est refusé au runtime. Le statut `reviewed` est requis pour activer le kiosque.

## 4. Validation et export

### 4.1 Processus de validation

```
validateGame() →
  1. Validation norme JSON (forme locale)
  2. Validation applicative (graphe, topo, HOLD)
  3. Si erreur → export refusé, nœud fautif surligné
  4. Si succès → pack prêt
```

### 4.2 Erreurs courantes

| Erreur | Cause | Solution |
|--------|-------|----------|
| "Opérateur manquant" | ≥2 conditions sans `operator` | Ajouter `operator: AND` ou `OR` |
| "Cycle inter-pools" | Pool `ON_GAME_START` dépendant d'un candidat de pool `ON_POOL_ACTIVATION` | Réorganiser les dépendances |
| "holdExit manquant" | `holdMode != "none"` sans `holdExit.method` | Configurer `holdExit` |
| "Module X nécessite holdMode != none" | Module `needsLock: true` avec `holdMode: "none"` | Configurer `holdMode` ou retirer `needsLock` |
| "AND-sur-branches-exclusives" | `FIN operator:AND` sur candidats distincts d'un pool `drawCount:1` | Utiliser `operator:OR` |
| "Ancien moteur" | `schemaVersion` > `minEngineVersion` du runtime | Mettre à jour le moteur |

### 4.3 Non-régression

L'example `game-5poi.json` (START → POOL 1/5 → A\|B\|C\|D\|E → FIN) est la fixture de référence. Toute évolution du schéma doit revalider cet example.

## 5. Exemple : création d'un jeu 5 POI

### 5.1 Workflow complet

1. **Nouveau jeu** : créer avec `gameId`, `schemaVersion`, `nodes[]`
2. **Ajouter START** : nœud `ON_GAME_START`, pas de prérequis
3. **Créer POOL** : `RANDOM_POOL` avec `candidates: [a,b,c,d,e]`, `drawCount: 1`, `drawTiming: ON_POOL_ACTIVATION`
4. **Ajouter les POI** : 5 nœuds avec `activation.requires: [{type: POOL_DRAWN, poolNodeId}]`
5. **Ajouter FIN** : `isEnding: true`, `operator: OR` sur `A COMPLETED` ... `E COMPLETED`
6. **Configurer la carte** : `global` avec provider, bbox, zoom
7. **Valider** : `validateGame()` — les 5 branches doivent atteindre FIN
8. **Exporter** : `exportPack()` — le pack est prêt

### 5.2 Vérification

Chaque candidat A..E doit individuellement atteindre un `isEnding`. Le validateur vérifie cette atteignabilité sous hypothèse d'environnement favorable (GEOFENCE supposé pouvoir devenir vrai).

---

📖 **Glossaire complet** : [docs/glossary.md](../glossary.md)
