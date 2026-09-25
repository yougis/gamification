## 1. Toolchain web hermétique

- [x] 1.1 Relever les patterns exacts des dépôts node et binaryen dans les sources du plugin Kotlin pinné (2.2.21) et vérifier : `dist/` actuel inchangé, patterns documentés (yarn `v[revision]/[artifact](-v[revision]).[ext]`, node `v[revision]/[artifact](-v[revision]-[classifier]).[ext]`, binaryen `version_[revision]/binaryen-version_[revision]-[classifier].[ext]`)
- [x] 1.2 Déclarer les trois dépôts Ivy (yarn, node, binaryen, avec filtres `includeModule`) dans `player/settings.gradle.kts` en gardant `PREFER_SETTINGS`, et vérifier : `./gradlew :kotlinWasmYarnSetup :kotlinWasmNodeJsSetup` verts sur machine locale (`BUILD SUCCESSFUL`, yarn téléchargé via le dépôt settings, node déjà installé)
- [x] 1.3 Builder `:web:wasmJsBrowserDistribution` depuis un état sans cache toolchain (`rm -rf ~/.gradle/yarn ~/.gradle/nodejs ~/.gradle/binaryen` au préalable, ou `GRADLE_USER_HOME` vierge) et vérifier : `dist/` complet (index, web.js, wasm, manifest, sw.js, icône) — reconstruit le 25/09 en 2m13s (`BUILD SUCCESSFUL`)

## 2. CI web + Pages

- [x] 2.1 Ajouter le job `web` à `.github/workflows/player.yml` (ubuntu, temurin 17, build `dist/`, upload-artefact, mêmes déclencheurs que les jobs natifs) et vérifier : job vert sur PR — job `web-pwa` ajouté (YAML validé), déclencheurs hérités du workflow (`player/**`)
- [x] 2.2 Ajouter le job `deploy` (`upload-pages-artifact` + `deploy-pages`, permissions `pages: write`/`id-token: write`, environnement `github-pages`, sur push `master`) et vérifier : dry-run de workflow valide (check YAML + `actionlint` si dispo) — YAML validé (pas d'actionlint local)
- [ ] 2.3 Activer la source « GitHub Actions » dans Settings > Pages (manuel, une fois) puis merger et vérifier : `https://yougis.github.io/gamification/` affiche la PWA du build

## 3. Vérification finale

- [ ] 3.1 Rejouer la procédure flotte sur l'URL publique (visite en ligne, ajout écran d'accueil, import fichier d'un jeu de référence, offline, pack partiel refusé) et vérifier : parité avec la doc `player-pwa-fleet.md`, mise à jour avec l'URL
- [x] 3.2 Non-régression : builds Android/iOS CI inchangés, `validate --specs` OK, et vérifier : aucun dépôt applicatif ne résout hors google()/mavenCentral() — `validate --specs` 27/27, `:app:assembleDebug` vert, filtres `includeModule` limités aux 3 modules toolchain (iOS non rejouable sur Linux, couvert par la CI macOS existante)
