## 1. Socle global et garde-fous

- [x] 1.1 Figer la baseline : rejouer `validateGame` sur le jeu actuel et noter 0 erreur C1+C2 avant toute modification, vérifié par la sortie du script
- [x] 1.2 Ajouter `global.screen` (basic-story, couleurs `#8B0000`/`#DAA520`, styles Georgia) et revalider C1+C2 avec 0 erreur, vérifié par `validateGame`

## 2. Nouveaux assets images

- [x] 2.1 Fournir ou générer 6 visuels (baker scène de crime, strand indice codé, stbarts point de vue, moriarty source, moriarty dérivée, fin) en jpg/svg légers, refus des non-images, vérifié par l'ouverture de chaque fichier et son poids
- [x] 2.2 Déposer les visuels dans `studio/src/game/assets/` et vérifier qu'ils sont lisibles depuis le Studio, vérifié par la prévisualisation de chaque asset

## 3. Écrans des Nœuds joueurs

- [x] 3.1 Habiller `start` (basic-story, fond baker-street, titre + intro + module INFO) et revalider C1+C2, vérifié par `validateGame` à 0 erreur
- [x] 3.2 Habiller `baker` et `fin` (quiz-focus, titres, widget image, module QUIZ rendu en content) et revalider C1+C2, vérifié par `validateGame` à 0 erreur
- [x] 3.3 Habiller `scotland` (clue-focus + scotland-yard.svg) avec `tileRows: 3, tileCols: 3`, et revalider C1+C2, vérifié par `validateGame` à 0 erreur
- [x] 3.4 Habiller `strand` (clue-focus + visuel indice, module CODE_INPUT) et `stbarts` (map-fullscreen + visuel, module BOUSSOLE), et revalider C1+C2, vérifié par `validateGame` à 0 erreur
- [x] 3.5 Habiller `holmes` (basic-story + aperçu marker/fallback, module AR_MARKER) et `moriarty` (clue-focus + source/dérivée, polygones inchangés), et revalider C1+C2, vérifié par `validateGame` à 0 erreur

## 4. Export et jouabilité

- [x] 4.1 Régénérer `manifest.json` (SHA-256 et tailles réels de tous les fichiers) et vérifier chaque entrée par recalcule, vérifié par un script de vérification du manifest
- [x] 4.2 Exporter le pack et vérifier fichier par fichier (aucune image réseau/hors-pack), vérifié par un export accepté sans fichier fautif
- [x] 4.3 Rejouer la partie de bout en bout offline (start → tirage → branche → fin, cycle `LOCKED → UNLOCKED → ACTIVE → COMPLETED`, écrans et images affichés), vérifié par une session de test passante
- [x] 4.4 Faire tourner les smokes Studio concernées (`test:screen`, `test:runtime`, `test:pack`) et constater 0 échec, vérifié par la sortie des commandes
