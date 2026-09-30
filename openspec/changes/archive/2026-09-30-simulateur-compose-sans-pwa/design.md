## Context

Voir proposal.md (Why). Etat actuel : `player/shared` expose moteur + UI Compose en `commonMain` avec `expect/actual` (`Providers.kt` / `WebProviders.kt`), `player/web/.../Main.kt` (840 lignes) emballe ce rendu en coquille PWA (manifest, service worker, `?game/?cheat/?session` via `PwaEmulation.kt`), et le Studio l'embarque en iframe via `/emulate/snapshot` (`emulate-plugin.js`, bloc `ciblePwa` dans `App.tsx`). Le cycle moteur comporte `ACTIVE` (modale unique + file FIFO) en specs, `config.yaml` et 3 fichiers `commonMain`. Contrainte : un seul renderer (`commonMain` via `geoplay-compose-engine`), appel direct, zero session dans le simulateur.

## Goals / Non-Goals

**Goals:**
- Un seul renderer auteur et joueur natif : `commonMain`, sans duplication React/Compose.
- Simulateur appel direct : jeu en memoire, etat simule injecte, interactions sans ecriture.
- Retrait total d'`ACTIVE` (specs, config, code) et de la PWA (specs, coquille, endpoint, protocole URL).

**Non-Goals:**
- Nouveau protocole Studio <-> wasm (l'appel direct suffit en local).
- Refonte du moteur au-dela d'`ACTIVE` (pools, latch, reentry inchanges).
- Sort flotte/MDM (a traiter dans un change dedie si besoin).

## Decisions

- **Appel direct plutot que postMessage** : le simulateur tourne dans le process Studio (dev local) ; un pont messages n'apporte d'isolation qu'au prix d'un protocole a maintenir. Alternative rejetee : garder postMessage sans iframe (complexite sans benefice).
- **REMOVED + ADDED plutot que MODIFIED pour les gros blocs** (preview, FIFO, matrice PWA) : les blocs sont reecrits, pas ajustes ; la trace archive reste lisible.
- **`home-player-runtime` archive sans appliquer** : l'idee retrait-ACTIVE est reprise ici, l'idee PlayerShell/Valider-Abandon est abandonnee avec le change.
- **Regle iframe de `config.yaml` reecrite vers appel direct** : la regle actuelle impose l'iframe ; ce change la remplace, pas d'exception silencieuse.
- **wasmJs = cible instrumentale** : le module `shared` garde la compilation wasm pour le simulateur mais ne produit plus de livrable web.

## Risks / Trade-offs

- [Risk] Perte de la parite "vrai player" qu'offrait l'iframe (carte navigable, quiz reel) → Mitigation : le simulateur rend le meme `commonMain`, et la tache de non-regression rejoue la fixture 2pts dans le simulateur.
- [Risk] Residus `ACTIVE`/PWA manques dans specs volumineuses (`studio-screen-builder`, `game-navigation`, `game-validation`, `sherlock-holmes`) → Mitigation : tache de balayage lexical explicite avec rejet `ACTIVE`/`PWA`/`modale`/`FIFO` sauf historique assume.
- [Risk] `preview-pwa-iframe` in-progress entre en conflit → Mitigation : clore sa marche 1 comme remplacee, abandonner la marche 2 postMessage dans ce change.

## Migration Plan

1. Specs d'abord (ce change), archive `home-player-runtime` sans appliquer.
2. Code : supprimer coquille web + `/emulate` + `PwaEmulation.kt`, purger `ACTIVE` (3 fichiers + `config.yaml`), brancher le simulateur appel direct.
3. Rollback : revert du change ; aucun etat persistant n'est migre (le simulateur n'en cree pas).

## Open Questions

Aucune : le perimetre FIFO (ordre des eligibles sans file) est tranche dans les specs.
