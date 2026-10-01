## 1. Carte simu navigable

- [x] 1.1 Poser la capture du pointeur sur le cadre (`currentTarget`) dans `CarteInteractiveSimu` et vérifier qu'un glissé démarré sur une tuile panne la carte
- [x] 1.2 Ajouter `touch-action: none` au cadre carte et vérifier que le glissé tactile panne sans faire défiler la zone

## 2. Marqueurs ouvrables

- [x] 2.1 Transmettre `lignesApercu` jusqu'au terminal (`PlayerTerminal` → `PhoneCanvas` → carte simu) et vérifier qu'un POI éligible propose Ouvrir et qu'un POI verrouillé reste désactivé
- [x] 2.2 Vérifier le repli sans lignes d'essai (tout verrouillé, comportement historique inchangé)

## 3. Viewports cohérents

- [x] 3.1 Appliquer le calcul de mise à l'échelle plein-cadre à `ApercuAccueil` (helper partagé) et vérifier qu'un même viewport rend la même taille dans Screen, terminal et aperçu du tableau

## 4. Puzzle avec image

- [x] 4.1 Résoudre l'image source dans `PuzzlePlayerRenderer` via `urlAssetSession` et vérifier que les 9 tuiles 3×3 s'affichent mélangées et jouables, avec état vide sans image

## 5. Validation croisée

- [x] 5.1 Lancer `tsc --noEmit`, les smokes Studio (`test:runtime`, `test:screen`, `compat.smoke`) et vérifier zéro régression (le `test:modules` pré-existant en échec `React is not defined` reste hors périmètre)
- [x] 5.2 Rejouer la fixture 2pts dans le simulateur (carte pannable, marqueur → Ouvrir, quiz, puzzle imagé) et vérifier zéro écriture JSON/session/event

## 6. Suivi : carte interactive du tableau de bord

- [x] 6.1 Câbler `carteSimu` dans `ApercuAccueil` (position simu + éligibles `elus` + `onOuvrir` existants) et vérifier que la carte du tableau panne, zoome et ouvre comme celle du terminal
