## 1. Aperçus statiques avec images

- [x] 1.1 Auditer les 7 `editorPreview` (quiz, puzzle, 7-erreurs, RA, boussole, cadenas + générique) et purger tout élément interactif ou état de jeu, et vérifier que chaque aperçu rend les images configurées sans mécanique
- [x] 1.2 Vérifier les scénarios spec : image puzzle visible sans déplacement, source 7-erreurs visible sans validation au clic

## 2. Paysage plein cadre et suppression de zone

- [x] 2.1 Mesurer le conteneur hôte du `PhoneCanvas` (ResizeObserver) et alimenter le prop `scale` en viewport paysage pour un plein cadre sans ascenseur, et vérifier 667×375 intégralement visible sans scroll, portrait inchangé
- [x] 2.2 Ajouter l'opération MCP `removeScreenZone` (refus `content`) + bouton « Supprimer la zone » avec confirmation, et vérifier suppression/undo et réapparition du fantôme « + Surimpression »

## 3. Arbre des widgets et non-régression

- [x] 3.1 Ajouter le sous-arbre dépliable zones → widgets dans chaque ligne `NodeList` (replié par défaut) avec sélection synchronisée canvas + panneau détail, et vérifier les scénarios spec (dépliage, sélection widget depuis l'arbre)
- [x] 3.2 Vérifier `tsc --noEmit` dans `studio/`, l'export JSON inchangé (screens validés Draft-07) et l'absence de régression des vues portrait, fantômes et drag-and-drop existants
