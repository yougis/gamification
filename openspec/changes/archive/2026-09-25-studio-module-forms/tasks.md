## 1. Surface commune dans l'Inspecteur

- [x] 1.1 Rendre `PanneauModule` sous le dropdown « Mini-jeu » de la famille épreuve (mêmes props que le WYSIWYG : défauts globaux, dépôt fichier, lecture seule, opération `modifierNoeud`) et vérifier que les panneaux QUIZ/PUZZLE/CODE_INPUT s'affichent et persistent sans JSON ni WYSIWYG
- [x] 1.2 Retirer l'inline questions QUIZ historique de l'Inspecteur au profit du panneau registre unique et vérifier qu'un seul formulaire questions subsiste avec persistance inchangée (undo/redo compris)

## 2. Plugin boussole

- [x] 2.1 Créer `plugins/boussole.tsx` (tolérance, stabilisation, secours, essais/temps via défauts globaux ; aperçu rose des vents statique) et le brancher dans `modules.ts`, et vérifier la saisie de `toleranceDeg` sans JSON avec C1 passante sur ce champ

## 3. Plugin RA

- [x] 3.1 Créer `plugins/ar-marker.tsx` (marqueur + fallback 2D via dépôt image avec refus de fallback vide, modèle 3D + taille ; aperçu marqueur + fallback) et le brancher dans `modules.ts`, et vérifier le refus sans fallback avec JSON inchangé

## 4. Plugin 7-erreurs

- [x] 4.1 Créer `plugins/difference-game.tsx` (images source/dérivée via dépôt, dilatation tactile, traceur de polygones % au clic sur la source avec liste + suppression ; aperçu source + overlay) et le brancher dans `modules.ts`, et vérifier une zone tracée persistée en % et l'appel explicite sans source
- [x] 4.2 Vérifier la cohérence avec l'overlay de relecture existant (polygones tracés visibles en Relire avant passage en `reviewed`)

## 5. Non-régression

- [x] 5.1 Passer `tsc --noEmit` sans nouvelle erreur par rapport au baseline, les smokes dev/runtime/pack/screen verts, et rejouer les scénarios spec (formulaire sous dropdown par type, pas de doublon QUIZ, tracé polygone, refus fallback RA, tolérance boussole, comportement inchangé sans plugin) en modes sombre/clair
