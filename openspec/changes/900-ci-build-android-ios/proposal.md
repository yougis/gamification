## Why

Aucune equipe ne peut jouer sur de vrais telephones sans builds reproductibles : aujourd'hui il n'existe pas de pipeline CI construisant `shared` KMP + apps natives a chaque PR, ni d'artefacts installables. C'est le premier verrou du jalon M1 et la condition d'entree de tout le reste (matrice devices, distribution, parite iOS).

## What Changes

- Pipeline CI construisant `shared` + app Android (APK/AAB) et app iOS (IPA via runner macOS) a chaque PR.
- Execution des tests unitaires du moteur et validation C1/C2 des jeux de reference (`game-5poi.json`, `sherlock-holmes`) a chaque PR, en echec bloquant.
- Publication des artefacts installables par PR/tag, duree cible < 20 min.
- Aucun changement de schema de jeu, aucune modification runtime/Studio fonctionnelle.

## Capabilities

Aucune (tooling pur, aucun comportement specifie ne change). `skip_specs: true` pose dans `.openspec.yaml`.

## Impact

- CI (GitHub Actions ou equivalent) : nouveaux workflows, runners macOS pour iOS.
- Build KMP : taches `shared` Android (AAR) + iOS (framework) ; frontiere `kmp-native-boundary` inchangee.
- Jeux de reference comme garde-fous (validateur TS et KMP doivent converger, cf. 908).

## Impact CodeGraph

- Inventaire exact des fichiers de build a completer a l'apply via CodeGraph (outil MCP non disponible dans ce client) : scripts Gradle/Xcode, workflows CI, jeux de reference.
- Aucun fichier `commonMain` fonctionnel touche ; frontiere native uniquement verifiee, pas modifiee.
