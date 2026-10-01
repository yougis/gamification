## 1. Android

- [ ] 1.1 Brancher `signingConfigs.release` sur `keystore.properties`/variables CI et constater un build release signe sans valeur en dur dans le repo.
- [ ] 1.2 Activer Play App Signing, stocker la cle d'upload en secrets CI + gestionnaire d'equipe, puis faire produire par un second developpeur un build signe identique sans echange de fichier.

## 2. iOS

- [ ] 2.1 Configurer fastlane `match` (depot prive chiffre) et constater qu'un poste vierge signe apres `match` seul.
- [ ] 2.2 Ajouter `*.jks` et `keystore.properties` au `.gitignore`, activer le scan de secrets en CI et constater le rouge sur un faux secret de test (retire ensuite).

## 3. Documentation

- [ ] 3.1 Ecrire la procedure rotation/perte et la faire executer une fois a blanc (reset d'upload documente).
