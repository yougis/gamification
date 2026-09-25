## Context

Voir `proposal.md` pour la motivation. État technique (vérifié dans les sources KGP 2.2.21 et les logs daemon) :
- `player/settings.gradle.kts:14` force `repositoriesMode PREFER_SETTINGS` (google + mavenCentral).
- Le plugin Kotlin ajoute ses dépôts Ivy de toolchain **à l'exécution** (`AbstractSetupTask.withUrlRepo`, puis retrait) : `yarnpkg/yarn`, `nodejs.org/dist`, `WebAssembly/binaryen`. Sous `PREFER_SETTINGS`, ces dépôts projet ne sont pas consultés pour `detachedConfiguration1` → `Could not find com.yarnpkg:yarn:1.22.17` sur `:kotlinWasmYarnSetup`, en local comme en CI.
- Le contournement local (`~/.gradle/init.d/wasm-local.gradle`) est cassé (mauvaise extension ciblée, `MissingPropertyException`) et, étant machine-local, ne peut de toute façon pas servir la CI.
- `.github/workflows/player.yml` couvre Android (ubuntu) et iOS (macos) mais aucun job web. Le `dist/` existant (`player/web/build/dist/wasmJs/productionExecutable/`) date du 23/09 et n'est plus reproductible.
- Le `dist/` est 100 % statique à chemins relatifs (`index.html`, `web.js`, `.wasm`, `manifest.webmanifest`, `sw.js`) : servable tel quel depuis un sous-chemin. Repo public → GitHub Pages gratuit.

## Goals / Non-Goals

**Goals:**
- `:web:wasmJsBrowserDistribution` vert sur machine vierge et en CI, sans état local.
- Job CI `web` + déploiement Pages automatique, URL publique documentée.

**Non-Goals:**
- Réparer ou maintenir les scripts `~/.gradle/init.d` (le fix repo les rend obsolètes ; leur suppression locale reste manuelle, hors change).
- Héberger le catalogue (serveur Node, incompatible Pages statique).
- Faire évoluer les `actuals` capteurs (stubs conservés).

## Decisions

### D1 — Dépôts Ivy toolchain déclarés en settings (pas de changement de mode)

Déclarer explicitement les trois dépôts Ivy de distribution dans `player/settings.gradle.kts` (bloc `dependencyResolutionManagement.repositories`), en miroir des patterns du plugin :
- yarn : `https://github.com/yarnpkg/yarn/releases/download`, pattern `v[revision]/[artifact](-v[revision]).[ext]`, `metadataSources { artifact() }`, `content { includeModule("com.yarnpkg", "yarn") }`.
- node : `https://nodejs.org/dist` (pattern à reprendre du plugin, layout direct).
- binaryen : `https://github.com/WebAssembly/binaryen/releases/download` (pattern à reprendre du plugin).

Rationale : les dépôts settings sont **toujours** consultés quel que soit le mode, donc le fix est insensible aux subtilités `PREFER_*` ; le mode strict est préservé (les filtres `includeModule` empêchent tout détournement des deps applicatives) ; hermétique en CI sans outil système.
Alternative écartée (fallback) : `repositoriesMode PREFER_PROJECT` — 1 ligne, mais dépend d'une sémantique Gradle incertaine sur les dépôts ajoutés à l'exécution, et affaiblit l'intention supply-chain documentée. À n'utiliser que si les patterns Ivy s'avèrent instables.

### D2 — Job CI `web` miroir des jobs natifs

Nouveau job `web` dans `player.yml` : `ubuntu-latest`, `setup-java` temurin 17, `./gradlew :web:wasmJsBrowserDistribution`, `upload-artifact` du `dist/`. Mêmes déclencheurs que les autres jobs (`player/**`, PR). Pas de `setup-node` : le plugin provisionne node lui-même (HTTP direct, déjà fonctionnel).

### D3 — Déploiement Pages via `deploy-pages`, artefact-only

Job `deploy` séparé (`needs: [web]`, permissions `pages: write` + `id-token: write`, environnement `github-pages`) : `upload-pages-artifact` (chemin = `dist/`) puis `actions/deploy-pages`. Déclenchement : push `master` (même convention qu'`android-debug`). Le `dist/` n'est jamais committé. Activation manuelle unique : source Pages = « GitHub Actions » dans les réglages du repo.

### D4 — URL documentée, pas de code modifié

Aucun changement dans `player/web` (chemins déjà relatifs) ni dans le `shared`. Seule la doc flotte (`docs/user/player-pwa-fleet.md`) reçoit l'URL publique + rappel du pré-remplissage `?code=&service=`.

## Risks / Trade-offs

- [Changement de version KGP] → les URLs/patterns Ivy peuvent changer. Mitigation : patterns commentés avec la version KGP visée ; la CI casse franchement (pas de dérive silencieuse).
- [Pages sans headers custom] → pas de COOP/COEP ; si le wasm exigeait `SharedArrayBuffer`, blocage. Mitigation : vérifié au premier déploiement (risque jugé faible, Compose web tourne couramment sur Pages).
- [Premier déploiement] → activer la source « GitHub Actions » dans Settings > Pages, une fois, à la main (ne peut pas être codé dans le repo).
- [Catalogue toujours auto-hébergé] → l'import par code depuis la PWA publique exige un catalogue en HTTPS public, hors scope (import fichier/URL inchangé).

## Migration Plan

1. Merger le fix dépôts + job `web` (build vert en CI sur PR, sans déploiement).
2. Activer la source Pages dans les réglages (manuel, une fois).
3. Merger le job `deploy` + doc URL ; vérifier `https://yougis.github.io/gamification/` (installabilité, import fichier, offline).
4. Rollback : revert du commit (Pages conserve la dernière version déployée, aucun état à nettoyer).

## Open Questions

Aucune bloquante. Point à confirmer à l'implémentation : patterns exacts des dépôts node/binaryen (lus dans les sources du plugin version pinnée) — n'impacte ni specs ni découpage.
