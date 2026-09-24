## Why

Gérer une flotte interne d'iPad (et toucher le public sans installation) exige un canal web : ni Xcode, ni compte Apple par appareil, mise à jour par simple redéploiement. Le moteur de jeu existe déjà en double (TS côté Studio, Kotlin côté `shared`) mais aucun player navigateur installable n'existe, et rien ne dit aujourd'hui si un jeu donné tourne sur tel player (GPS de fond impossible en PWA, AR indisponible, etc.).

## What Changes

- **Coquille PWA** : player navigateur installable (« Ajouter à l'écran d'accueil » / Web Clip MDM) adossé au moteur `shared` (cible wasm, UI Compose commune), offline-first (service worker + manifest SHA-256 vérifié au lancement, persistance locale), import de pack par fichier/URL/QR comme le natif.
- **Export compatible multi-player** : le même JSON de jeu s'exporte vers natif et PWA sans fork (même schéma, même manifest, même validation AJV des deux côtés) ; le canal devient un attribut de distribution, pas une variante du jeu.
- **Validation de compatibilité par cible** : un système évalue chaque jeu + ses modules contre les capacités de chaque player (`NATIVE`/`PWA`) — GPS de fond, AR, boussole, cartes, verrouillage — et rend un verdict par cible (compatible / dégradé avec replis / refusé avec motif), affiché à l'export et au lancement.

## Capabilities

### New Capabilities

- `player-compatibility`: matrice capacités par player, évaluation jeu×modules→verdicts par cible, affichée à l'export et au lancement.

### Modified Capabilities

- `player-install`: coquille PWA installable et offline (import vérifié, persistance locale, guidance Guided Access), export multi-player sans fork du jeu.

## Impact

- **Code** : `player/shared` (cible wasmJs, `actuals` web : Geolocation, DeviceOrientation, fichier/URL), nouvelle coquille web (`player/web` ou équivalent : manifest PWA, service worker, écran d'import), Studio (sélecteur de canal à l'export + verdicts de compatibilité), validateur (couche compatibilité par cible).
- **Schéma graphe** : aucune modification — même JSON, même manifest ; la compatibilité est une lecture des champs existants (conditions, `needs*`, `holdMode`), jamais un nouveau champ.
- **Valeurs réservées** : `CONDITIONAL`/`WINDOW` non touchés, aucun module ajouté au registre (la matrice lit `needsGPS/needsCompass/needsCamera/needsMap/needsLock` existants).
- **Réseau** : PWA visitée une fois en ligne puis offline-first (même contrat que le natif : pack non lançable si partiel) ; aucune donnée joueur transmise.
- **Dépendance** : s'appuie sur `player-kmp-migration` (moteur/UI `shared`, import, persistance) sans le rouvrir ; limite connue actée : pas de GPS de fond ni de verrouillage OS en PWA (repli : Guided Access + procédure animateur).
