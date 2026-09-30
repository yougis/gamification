## 1. AGENTS.md et skills

- [x] 1.1 Renseigner les descriptions `geoplay-compose-engine` / `geoplay-wasm-architect` et retirer les lignes `codegraph-search` / `codegraph-analyze`, et verifier qu'aucune entree skill n'est sans description
- [x] 1.2 Corriger le cycle du principe 7 si besoin et verifier la coherence avec le retrait d'`ACTIVE`

## 2. Retrait d'ACTIVE (specs, config, code)

- [x] 2.1 Purger `ACTIVE`, `modale` et `FIFO` de `openspec/config.yaml` (contexte + regles specs) et verifier `grep -rn ACTIVE openspec/config.yaml` vide
- [x] 2.2 Purger `ACTIVE` des 3 fichiers `commonMain` (`GeoPlayNav.kt`, `ToolboxOverlay.kt`, `Navigation.kt`) et verifier `commonTest` vert
- [x] 2.3 Balayer les specs residuelles (`studio-screen-builder`, `game-navigation`, `game-validation`, `game-progression`, `minigame-modules`, `sherlock-holmes`, `kmp-runtime`, `player-screen-render`, `studio-map-view`, `game-triggers`, `proximity`) et verifier `grep -rni "ACTIVE\|modale\|FIFO" openspec/specs` ne rend que l'historique assume

## 3. Suppression PWA (specs et code web)

- [x] 3.1 Supprimer la coquille web (`Main.kt`, `PwaEmulation.kt`, `manifest.webmanifest`, `sw.js`, `emulate-plugin.js`, bloc `ciblePwa` de `App.tsx`) et verifier qu'aucune reference `?game`, `/emulate`, `ciblePwa` ne subsiste dans `player` et `studio/src`
- [x] 3.2 Reecrire la regle iframe de `config.yaml` vers l'appel direct et verifier `grep -rni "iframe\|PWA" openspec/config.yaml` vide

## 4. Simulateur Compose web appel direct

- [x] 4.1 Brancher le renderer `commonMain` en appel direct dans l'ecran Previsualiser (jeu en memoire, etat simule injecte) et verifier qu'aucune iframe ni snapshot serveur n'est monte
- [x] 4.2 Implementer les mocks capteurs clavier/souris via injection et verifier qu'ils ne fuient pas vers les builds natifs
- [x] 4.3 Rejouer la fixture 2pts dans le simulateur (navigation, carte, volet Ouvrir, quiz sans score, mocks) et verifier zero ecriture JSON/session/event

## 5. Validation croisee

- [x] 5.1 Archiver `home-player-runtime` sans appliquer et verifier qu'aucune tache ne reste in-progress
- [x] 5.2 Lancer `openspec validate`, `commonTest`/`jvmTest` et smokes Studio et verifier zero regression
