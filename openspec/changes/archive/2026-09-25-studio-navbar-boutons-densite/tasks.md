## 1. Navigation rétractable

- [x] 1.1 Ajouter le contrôle « Replier le menu » (chevron `ChevronRepli` + `basculerMenu` existants) dans le menu ouvert et vérifier le repli vers le rail puis le dépliage, avec persistance `geoplay-menu-replie` après rechargement
- [x] 1.2 Vérifier que le rail replié conserve écrans + créations et que la vue étroite `<lg` est inchangée

## 2. Densité compacte du Composer

- [x] 2.1 Créer la variante `.btn-compact` dans `styles/theme.css` (limitée à `lg+`) et vérifier visuellement le cran de densité sans changement de libellés ni tooltips
- [x] 2.2 Appliquer la variante aux boutons d'action du Composer (toolbar centrale, en-têtes liste/détail, rails, chevrons ; formulaires et autres écrans exclus) et vérifier qu'aucune action ni opération MCP n'a changé
- [x] 2.3 Vérifier `tsc --noEmit` dans `studio/` et les cibles tactiles >= 44 px en vue étroite `<lg`

## 3. Non-régression

- [x] 3.1 Vérifier les scénarios spec : repli/dépliage persistant du menu, toolbar centrale compacte commutant les vues, tactile non dégradé
- [x] 3.2 Archiver `studio-composer-3-colonnes` d'abord puis re-valider ce change (`openspec validate`) avant implémentation, et vérifier l'absence de conflit sur `studio-authoring`
