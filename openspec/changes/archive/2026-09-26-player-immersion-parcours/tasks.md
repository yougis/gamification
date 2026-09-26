## 1. Règle pure et moteur (lecture seule)

- [x] 1.1 Fonction pure `noeudPrincipal(game, états)` en `commonMain` (start éligible > racine non terminée > tête de file > null) + tests : start, racine, file, reprise, aucun éligible
- [x] 1.2 Miroir TS de la règle (même cas) + preuves smoke ; vérifier : parité des 5 cas des deux côtés

## 2. Arrivée et enchaînement partagés (PWA + iOS héritent)

- [x] 2.1 `GeoPlayApp` : route initiale = écran du nœud principal (ou tableau si `HOME`, liste si null) ; vérifier : pack neuf → écran `start`, reprise → écran en cours, sans éligible → liste
- [x] 2.2 Avance auto à la complétion enregistrée (premier éligible non terminé ; sinon tableau/liste ; `isEnding` → fin ; abandon → retour sans avance) ; vérifier : quiz validé → écran suivant sans liste, sans event ajouté

## 3. Parité natif Android

- [x] 3.1 Même règle d'arrivée + avance dans `GameFragment` (vues) ; vérifier : mêmes 5 scénarios rejoués côté natif

## 4. Non-régression

- [x] 4.1 Sherlock + fixture C1+C2 (0 erreur), tests partagés/natifs, PWA compile, `tsc` ; file FIFO, latch, journal et SQLite inchangés ; vérifier et consigner
