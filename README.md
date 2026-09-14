# GeoPlay

Framework de jeux géolocalisés offline (natif iOS + Android).

- **Créateurs** : composez un jeu dans le Studio, validez-le, exportez un pack vérifié.
- **Intégrateurs** : déployez le runtime natif, installez des packs sur terrain.
- **Développeurs** : contribuez au moteur, aux modules ou au Studio.

---

## 1. Créateur de jeux — Démarrage rapide

### Prérequis

- Node.js 20+ et npm installé
- Un éditeur de code (VS Code recommandé)

### Lancer le Studio

```bash
cd studio
npm install
npm run dev
```

Le Studio s'ouvre sur `http://localhost:5173`.

### Composer un Jeu

1. Ouvrez le Studio et utilisez le MCP pour :
   - `composeNodes` — ajoutez des nœuds au graphe
   - `setActivation` — configurez les conditions (GEOFENCE, TIMER, POOL_DRAWN…)
   - `registerAsset` — référencez les assets du jeu
   - `validateGame` — validation couche 1 (Draft-07) + couche 2 (applicative)
   - `buildManifest` + `exportPack` — générez le manifest SHA-256 et exportez le pack

### Validation créateur

```bash
# Valider un JSON de jeu (les deux couches)
openspec validate <fichier-json>

# Valider un pack exporté
openspec validate --type change <chemin-pack>
```

### Parcours complet créateur

Composer → Remplir les modules → `validateGame` → `exportPack` → Distribuer le pack (QR, lien, fichier).

---

## 2. Intégrateur d'outils — Déploiement du runtime

### Prérequis

- Android SDK installé (avec Android Gradle Plugin 8.7.2)
- Java 17 (temurin recommandé)
- Gradle 8.14

### Lancer le Player (Android)

```bash
cd player
./gradlew assembleDebug
```

Installez l'APK debug sur la tablette ou l'émulateur.

### Modes système

| Mode | Description |
|---|---|
| `none` | Mode normal (pas de verrouillage) |
| `guidedAccess` | Verrouillage écran (iOS) / Screen Pinning |
| `screenPinning` | Pin de l'écran |
| `lockTask` | Lock Task Mode (kiosque Android) |

### Triche et preview

- **Bypass capteurs** : forcez un GEOFENCE en mode triche (flag triche sur les events)
- **forceDraw** : forcez un tirage de pool par branche en preview Studio
- Chaque event triche porte le **flag triche** pour le scoring

### Infrastructure

- **QR codes** : encodez le lien ou fichier du pack pour l'import
- **Manifest SHA-256** : chaque asset référencé `{path, version, size, sha256}` dans le manifest
- **SQLite** : progression, `randomDraws[sessionId]`, events persistés en écriture immédiate

### Validation de pack

```bash
# Valider l'intégrité d'un pack (SHA-256 par fichier)
openspec validate --type change <chemin-pack>
```

Un pack partiel ou corrompu reste **non lançable** avec état explicite (progression %, fichier fautif).

---

## 3. Développeur — Environnement de dev

### Prérequis

- **Node.js** 20+ et **npm** (pour le Studio)
- **Java 17** (temurin) via SDKMAN ou équivalent
- **Android SDK** avec Android Gradle Plugin 8.7.2
- **Gradle** 8.14
- **Kotlin** 2.0.21

### Structure du projet

```
gamification/
├── studio/          # Studio auteur (React + Vite + Tailwind)
├── player/          # Player natif Android (Kotlin + Gradle)
├── openspec/        # Changements, specs, schémas Draft-07
├── docs/            # Documentation technique et de communication
├── ROADMAP.md       # Feuille de route des changes
└── README.md        # Ce fichier
```

### Commandes Studio

```bash
cd studio
npm install          # Installer les dépendances
npm run dev          # Développement (Vite)
npm run build        # Build de production
npm run lint         # Linting (oxlint)
npm run test:runtime # Tests du runtime
npm run test:modules # Tests des modules
npm run test:pack    # Tests de pack
```

### Commandes Player

```bash
cd player
./gradlew assembleDebug   # Build APK debug
./gradlew test            # Tests unitaires
```

### Vérifications

```bash
# Studio
npm run lint
npm run test:runtime
npm run test:modules
npm run test:pack

# Player
./gradlew test
```

---

## 4. Documentation détaillée

- **Spécifications** : `docs/cahier-specifications-geoplay.md`
- **Glossaire** : `docs/glossary.md`
- **Référence fonctionnelle** : `docs/maintainer/functional-reference.md`
- **Guide créateur** : `docs/user/creator-guide.md`
- **Feuille de route** : `ROADMAP.md`

---

## Licence et provenance

Chaque étape et asset porte `providerId`, licence, `sourceUrl` et un statut `draft|reviewed|published`.
