## Why

Signer des builds avec des secrets en dur ou transmis par message expose a la perte de cle (impossibilite de mettre a jour l'app) et bloque tout second developpeur. La M1 exige une signature d'equipe reproductible des le debut, avant toute distribution interne.

## What Changes

- Android : `signingConfigs.release` lisant `keystore.properties`/variables CI (jamais de valeurs en dur) ; Play App Signing active ; cle d'upload d'equipe en secrets CI chiffres + copie en gestionnaire de secrets d'equipe ; procedure documentee de rotation/perte.
- iOS : fastlane `match` (depot prive chiffre) pour certificats/profils.
- `*.jks` et `keystore.properties` dans `.gitignore` ; scan de secrets en CI.
- Depend de `900-ci-build-android-ios`. Aucun changement de schema de jeu.

## Capabilities

Aucune (tooling/secrets pur). `skip_specs: true` pose dans `.openspec.yaml`.

## Impact

- Configs de build Android/iOS, CI, gestionnaire de secrets d'equipe, documentation de rotation.
- Pre-requis de `902-internal-distribution` (Firebase App Distribution + TestFlight).

## Impact CodeGraph

- Inventaire exact a completer a l'apply via CodeGraph : fichiers de signing, workflows CI, `.gitignore`.
- Aucun impact `commonMain` ni registre de modules.
