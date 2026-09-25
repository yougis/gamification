## Why

Le player (les 3 canaux) ignore les écrans composés dans le Studio : ni le modèle KMP ne parse `node.screen`, ni l'UI partagée ne sait le rendre (`GeoPlayNav` = liste d'étapes + quiz brut, `openNode` = QUIZ seul), et la PWA n'offre aucun moyen de jouer sans GPS (pas de triche/bypass). Résultat : un jeu habillé dans le Studio est injouable et méconnaissable côté joueur.

## What Changes

- Le modèle partagé (`shared/commonMain`) parse `node.screen` et `global.screen` (miroir du schéma Draft-07 existant, champs optionnels, jeux sans screen inchangés) et résout l'écran effectif (global → nœud, héritage des styles).
- Nouveau renderer Compose partagé des écrans : fond, zones (header/content/footer/overlay), widgets texte/image/bouton/progress/spacer, slot module branché sur les renderers existants (QUIZ) puis les autres types via registre ; `openNode` ouvre tout nœud ACTIVE selon son type.
- Panneau triche dans la coquille PWA : bypass GEOFENCE, `forceDraw` par branche, position simulée, chaque event simulé flagué triche (même règle que natif et preview Studio).
- Profite aux 3 players d'un coup (renderer et modèle dans le `shared`).

## Capabilities

### New Capabilities

- `player-screen-render`: rendu des écrans auteur (`ScreenDefinition`) dans le player partagé — parse, résolution global→nœud, renderer Compose des zones/widgets, slot module.

### Modified Capabilities

- `viewer-orchestrator`: la coquille PWA SHALL offrir le panneau triche (bypass capteurs, `forceDraw`, position simulée), tout event simulé portant le flag triche ; le mode triche reste une simulation locale, jamais une écriture dans le JSON.

## Impact

- `player/shared` (modèle + UI commune) — consommé par les 3 shells, aucun fork.
- `player/web` (panneau triche `RunScreen`) — PWA uniquement.
- Aucune modification du schéma Draft-07 (`screen` y existe déjà), du graphe, du registre ou du manifest : aucun consommateur existant n'est impacté en lecture (champs optionnels).
- Aucune valeur réservée `CONDITIONAL`/`WINDOW` touchée, aucun module ajouté.
- Réseau : aucun au runtime joueur (la triche PWA est une simulation locale) — offline-first préservé.
- Dépendance : fait suite au change archivé `player-pwa-ci-pages` (URL PWA live), sans le rouvrir.
