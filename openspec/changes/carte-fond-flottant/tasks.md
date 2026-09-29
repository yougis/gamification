## 1. Strates Studio (canvas + terminal)

- [x] 1.1 Déclarer l'assignation de strate (fond vs breakout actuel) au schéma Draft-07 et vérifier `pleinEcran` seul garde le comportement actuel sans le flag
- [x] 1.2 Rendre la strate fond sous le flottant dans le canvas (carte plein cadre interactive, contenu par-dessus, overlay au sommet) et vérifier visuellement l'ordre et la visibilité dans les creux
- [x] 1.3 Ajouter le sélecteur de calque auteur (fond / flottant / overlay + œil, persistance locale) et vérifier la sélection/édition à travers les couches sans toucher au JSON
- [x] 1.4 Répliquer dans le terminal simulé et vérifier navigation, volet et Ouvrir inchangés dans le nouveau stacking

## 2. Parité players + validation

- [x] 2.1 Implémenter les strates dans le partagé KMP (fond navigable, flottant transparent sauf widgets) et vérifier drag-dans-creux vs touch-widget sans event
- [ ] 2.2 Implémenter les strates dans la PWA et vérifier le même écran s'affiche dans l'ordre fond → flottant → overlay
- [ ] 2.3 Exécuter le test de parité (même écran, 3 rendus comparés : ordre, fond visible, drag résiduel) et vérifier `openspec validate` passe
