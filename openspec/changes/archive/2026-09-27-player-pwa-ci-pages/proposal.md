## Why

Le player PWA (`player/web`, cible `wasmJs`) est le seul des trois canaux joueur sans build reproductible : `:web:wasmJsBrowserDistribution` échoue sur toute machine sans contournement local (`Could not find com.yarnpkg:yarn:1.22.17`), et aucun job CI ne le construit. Sans build PWA fiable, l'objectif « mêmes JSON, mêmes mécaniques sur Android, iOS et PWA » n'est pas vérifiable de bout en bout.

## What Changes

- Résolution de la toolchain web (node/yarn/binaryen) rendue hermétique au niveau repo : le build `:web:wasmJsBrowserDistribution` passe sans script local `~/.gradle/init.d`, en local comme en CI.
- Nouveau job CI `web` dans `.github/workflows/player.yml` : build du `dist/` PWA + upload en artefact, déclenché sur les mêmes chemins que les jobs natifs.
- Publication du `dist/` sur GitHub Pages (repo public) via `actions/deploy-pages` : URL publique stable en HTTPS, sans committer le `dist/` dans le repo.
- Documentation de l'URL PWA dans `docs/user/player-pwa-fleet.md` (installation flotte, pré-remplissage `?code=&service=`).
- Hors scope explicite : hébergement du service catalogue (serveur Node, impossible sur Pages statique) ; maturité des `actuals` capteurs iOS/wasm (stubs actuels conservés) ; QA iPad terrain.

## Capabilities

### New Capabilities

Aucune — pas de comportement joueur nouveau, le canal PWA existe déjà dans les specs.

### Modified Capabilities

- `player-install`: le canal PWA SHALL se construire de façon reproductible (même commande, sans état machine local) et SHALL être publié sur une URL publique stable en HTTPS. Le contenu servi SHALL être le `dist/` issu du build CI, vérifié comme aujourd'hui (manifest SHA-256, refus du partiel/corrompu, revérification au lancement).

## Impact

- `player/settings.gradle.kts` (gestion des dépôts : `PREFER_SETTINGS` vs dépôts Ivy du plugin Kotlin) — outillage build uniquement, aucun impact runtime.
- `.github/workflows/player.yml` (nouveaux jobs `web` + `deploy-pages`) — CI uniquement.
- `docs/user/player-pwa-fleet.md` (URL publique) — doc uniquement.
- Aucune modification du schéma graphe (Noeuds/activation/registre/branding/manifest) : aucun consommateur (Studio MCP, runtime natif, orchestrateur, modules, packaging offline) n'est impacté.
- Aucune valeur réservée `CONDITIONAL`/`WINDOW` touchée, aucun module ajouté au registre.
- Réseau : uniquement au build (téléchargement toolchain, déploiement Pages). Le parcours joueur reste strictement offline-first après import — aucune exception à justifier.
- Dépendance : aucune (change autonome ; fait suite aux constats du change archivé `player-pwa-shell`, sans le rouvrir).
