## 1. Strates Studio (canvas + terminal)

- [x] 1.1 Déclarer l'assignation de strate (fond vs breakout actuel) au schéma Draft-07 et vérifier `pleinEcran` seul garde le comportement actuel sans le flag
- [x] 1.2 Rendre la strate fond sous le flottant dans le canvas (carte plein cadre interactive, contenu par-dessus, overlay au sommet) et vérifier visuellement l'ordre et la visibilité dans les creux
- [x] 1.3 Ajouter le sélecteur de calque auteur (fond / flottant / overlay + œil, persistance locale) et vérifier la sélection/édition à travers les couches sans toucher au JSON
- [x] 1.4 Répliquer dans le terminal simulé et vérifier navigation, volet et Ouvrir inchangés dans le nouveau stacking

## 2. Parité players + validation

- [x] 2.1 Implémenter les strates dans le partagé KMP (fond navigable, flottant transparent sauf widgets) et vérifier drag-dans-creux vs touch-widget sans event
- [x] 2.2 Constater l'héritage PWA via le partagé (compilation wasmJs verte avec les strates, Geolocation/fallback vérifiés, aucun renderer propre) et reporter le rendu PWA visible en prévisualisation au change preview-pwa-iframe
- [x] 2.3 Exécuter le test de parité (même écran, rendus Studio et partagé comparés : ordre, fond visible, drag résiduel ; PWA couverte par construction + compile wasmJs) et vérifier `openspec validate` passe
