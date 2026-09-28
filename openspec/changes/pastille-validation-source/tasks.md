## 1. Compteur pastille sur diagnostics

- [x] 1.1 Remplacer le calcul `rapport.filter(...)` par un compteur dérivé des diagnostics C1/C2 de niveau erreur (même source que les listes Valider) et vérifier `tsc` passe sans nouvelle erreur
- [x] 1.2 Reproduire le cas fantôme (publication réussie puis lecture du médaillon) et vérifier la pastille affiche `✓ Valide` avec 0 erreur listée

## 2. Libellé manifest et non-régression

- [x] 2.1 Clarifier le libellé du compteur manifest (assets vs `game.json` ajouté à la génération) et vérifier l'affichage sur jeu sans asset et jeu avec assets
- [x] 2.2 Relancer les smokes Studio existants et vérifier 100 % verts (comportement Valider/export/publication inchangé hors compteur)
