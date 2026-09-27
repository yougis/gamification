## 1. Canvas global éditable

- [x] 1.1 Brancher `PhoneCanvas` + chaîne d'édition sur `global.screen` quand la pseudo-sélection Accueil est active (zones, widgets, DnD, viewports, bandeau « écran global », retour nœud sans perte) ; vérifier : widget ajouté → `global.screen` (undo OK), étapes sans screen héritent
- [x] 1.2 Opérations d'écriture calquées (`setGlobalScreen` + ajouts widgets) traçées undo/redo ; vérifier : historique nomme les opérations, annulation restaure

## 2. Styles et accès

- [x] 2.1 Base `global.screen.styles` avec témoins Global/Écran/Widget identiques (sémantique surcharge/héritage inchangée) ; vérifier : surcharge visible, effacement retombe sur la base
- [x] 2.2 Blocs d'accès lecture seule (carte si `MAP`, boîte à outils selon la règle, infos) avec badge « aperçu », charte canvas ; vérifier : cocher `MAP`/`TOOLBOX` les fait apparaître/disparaître, clic sans sélection

## 3. Non-régression

- [x] 3.1 Canvas des nœuds inchangé (cas existants), Sherlock + fixture C1+C2 (0 erreur), `tsc`, smokes ; vérifier et consigner
