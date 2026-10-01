## Why

Le player Android affiche une implémentation legacy (fragments View : liste, dashboard texte, écran module réduit à un titre) alors que le renderer de référence existe en `commonMain` (HOME, carte, écrans, quiz) et qu'iOS l'utilise déjà. Résultat : ouvrir un jeu sur Android n'a rien à voir avec le simulateur ni avec iOS, malgré le moteur partagé. Le renderer de référence pour la parité visuelle est le `commonMain` ; le simu React reste un miroir d'essai.

## What Changes

- **BREAKING** : l'app Android héberge l'UI partagée (`GeoPlayApp` : HOME, carte, écrans, quiz) via `ComposeView` dans des fragments coquilles, exactement comme iOS héberge `ComposeView`. Les fragments legacy (`rvQueue` texte, `ModuleFragment` titre) sont supprimés.
- Périmètre v1 : HOME + carte + écrans + quiz. AR/boussole et modules avancés suivent via providers natifs (change dédié si besoin).
- Bascule en une fois, sans feature-flag ni cohabitation.
- Les tuiles suivent ce qu'iOS fait aujourd'hui : fond schématique partagé (les tuiles natives viendront par-dessus quand les shells les fourniront, des deux côtés en même temps).
- Moteur, sessions, SQLite, import/catalogue local : inchangés.

## Capabilities

### New Capabilities
Aucune.

### Modified Capabilities
- `kmp-runtime`: l'app Android consomme l'UI Compose partagée (comme iOS), fragments réduits à coquilles + providers natifs.
- `player-screen-render`: rendu natif Android des écrans via le renderer partagé (mêmes zones, widgets, overlay, branding résolu).

## Impact

- Code : `player/app` (dépendances Compose, fragments coquilles, providers natifs GPS/fichiers), suppression `ModuleFragment` titre et dashboard/queue legacy ; `shared` inchangé sauf ajouts strictement nécessaires exposés en `commonMain`.
- Aucun changement schéma, moteur, validation, offline-first ; clutch progression/sessions inchangé.
- Non-couvert : tuiles natives (les deux shells, change dédié), AR/boussole natifs au-delà des stubs, simu React (miroir d'essai inchangé).
