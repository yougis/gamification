## 1. Toggle et entrée dans le volet

- [x] 1.1 Bouton « activer home » à côté des ajouts (`NodeList`, même opération `setPresentation` que les cases, état actif + infobulle, inopérant en lecture seule) ; vérifier : toggle → `HOME` écrit/effacé (undo OK), entrée apparaît/disparaît
- [x] 1.2 Section épinglée « écran global — Accueil » + pseudo-sélection exclusive + mini-aperçu statique t=0 ; vérifier : clic sans nœud créé (graphe inchangé, validation/export ignorants), t=0 affiché

## 2. Aperçu simu en Prévisualiser

- [x] 2.1 Rendu visuel branché sur l'état d'essai (`done`, tirages, `dtMin`, file, actif) via `timerRemainingMs`/`evaluate` existants, lecture seule ; vérifier : rebours défilent au tick, POI passent « fait » aux complétions, proposition = tête de file réelle
- [x] 2.2 Garde-fous : test « aucun id accueil dans `nodes[]` » + `tsc` ; vérifier et consigner

## 3. Non-régression

- [x] 3.1 Sherlock + fixture C1+C2 (0 erreur), smokes Studio, undo/redo du toggle ; vérifier et consigner
