## 1. Écran Importer scrollable

- [x] 1.1 Envelopper le contenu de `fragment_import.xml` dans un `NestedScrollView` et vérifier que toutes les cartes (QR, URL, catalogue, fichier, catalogue local) sont atteignables sur petit écran

## 2. Ouverture du pack importé

- [x] 2.1 Transmettre l'identifiant du pack installé en argument de navigation après import réussi et vérifier que la partie ouverte porte le `gameId` importé (URL GitHub incluse)
- [x] 2.2 Trier `getInstalledPacks()` par date descendante et vérifier que le démarrage à froid ouvre le plus récent, ou le `reference-5poi` embarqué si vide

## 3. Catalogue local

- [x] 3.1 Lister les packs installés (`gameId`, version, date, état) triés du plus récent au plus ancien et vérifier l'affichage à deux jeux installés
- [x] 3.2 Re-vérifier SHA-256 à l'ouverture depuis le catalogue local et vérifier le refus avec fichier nommé sur pack altéré, sans réseau

## 4. Validation croisée

- [x] 4.1 Lancer les tests app existants et vérifier zéro régression, puis rejouer le parcours (import URL → bon jeu, catalogue local → rejouer sans réimporter)
