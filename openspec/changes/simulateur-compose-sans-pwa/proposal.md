## Why

Le Studio previsualise aujourd'hui via une iframe vers une PWA deployee (`preview-pwa-iframe`) : un vrai player avec session, stockage et offline, pilote par URL (`?game`, `?cheat`, `?session`) et serveur `/emulate`. Le besoin auteur est plus simple : voir l'ecran courant et interagir avec (cliquer, naviguer, saisir, mocker GPS/boussole au clavier/souris), sans jamais faire une vraie partie. Le web n'a plus a etre un canal joueur.

## What Changes

- **BREAKING** : suppression du canal PWA comme player distribuable et comme support de simulation. Plus de coquille installable, plus de service worker, plus de manifest web, plus d'iframe, plus d'endpoint `/emulate`, plus de protocole `?game/?cheat/?session`.
- Nouveau simulateur Compose web : un seul renderer, celui de `commonMain` (via `geoplay-compose-engine`), consomme en appel direct par le Studio (jeu en memoire, etat simule injecte, interactions retournees sans session).
- **BREAKING** : retrait d'`ACTIVE` partout (specs, `config.yaml`, code). Le cycle devient `LOCKED -> UNLOCKED -> COMPLETED`, sans modale ni file FIFO imposee.
- Descriptions `geoplay-compose-engine` / `geoplay-wasm-architect` renseignees dans `AGENTS.md`, retrait des entrees `codegraph-search` / `codegraph-analyze` (outils MCP, pas des skills).
- Le change `home-player-runtime` est rendu obsolete par celui-ci (idee PlayerShell/Valider-Abandon abandonnee, idee retrait-ACTIVE reprise ici).

## Capabilities

### New Capabilities
- `compose-web-simulator`: simulateur auteur Compose-wasm sans PWA (voir + interagir, appel direct, mocks capteurs, budget d'interaction ferme).

### Modified Capabilities
- `game-graph`: cycle sans `ACTIVE` (retrait modale unique, file FIFO, latch ACTIVE).
- `player-install`: suppression de la coquille PWA installable et offline.
- `player-compatibility`: suppression du canal PWA de la matrice et des verdicts.
- `viewer-orchestrator`: suppression du panneau triche PWA et des references modale/file ACTIVE.
- `studio-authoring`: previsualisation sans iframe (simulateur appel direct).
- `kmp-runtime`: cibles Android + iOS (+ wasm non distribuable comme instrument Studio, jamais comme player).
- `game-catalog`: recuperation par code cote player natif uniquement.
- `game-navigation`: cycle et transitions sans `ACTIVE`, sans modale.
- `game-progression`: cycle de reference sans `ACTIVE`.
- `player-screen-render`: ecrans des noeuds `UNLOCKED` (ouverts) au lieu de `ACTIVE`.
- `minigame-modules`: timeout et hints sans vocabulaire `ACTIVE`.
- `game-triggers`: WINDOW sans modale ni file.
- `proximity`: PROXIMITY_MASTER sans file `ACTIVE`.
- `studio-map-view`: indicateur d'etat sans `ACTIVE`.
- `studio-screen-builder`: `poiStyle` et volet sans `ACTIVE`.
- `sherlock-holmes`: habillage sans vocabulaire `ACTIVE`.

## Impact

- Schema graphe modifie (retrait `ACTIVE`) : consommateurs Studio MCP, runtime natif, orchestrateur, modules du registre, packaging offline, validation double couche.
- Ne touche pas aux valeurs reservees `CONDITIONAL`/`WINDOW`, n'ajoute aucun module au registre (compat inchangee : type inconnu ignore gracieusement).
- Aucun reseau ajoute cote joueur ; le simulateur Studio reste online-only par nature (outil auteur local), les players natifs restent offline-first stricts.
- Code : `player/web/.../Main.kt` (coquille), `shared/web/PwaEmulation.kt`, `manifest.webmanifest`, `sw.js`, `emulate-plugin.js`, bloc `ciblePwa` de `studio/src/App.tsx`, 3 fichiers `commonMain` avec `ACTIVE`, specs PWA (5 fichiers), `AGENTS.md`, `openspec/config.yaml` (regle iframe a reecrire vers appel direct).
- Dependance : rend obsolete `home-player-runtime` (a archiver sans appliquer) et clot `preview-pwa-iframe` marche 1 (la marche 2 postMessage est abandonnee).
