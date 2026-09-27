## 1. Validation : cas HOME-seul

- [x] 1.1 C1 : `nodes: []` + levée `isEnding` ssi `HOME` (`if/then` dans `game-schema.json`) ; vérifier : HOME+vide accepté, MAP+vide rejeté, jeux existants inchangés
- [x] 1.2 C2 : saut `isEnding`/atteignabilité ssi `HOME` + vide (+ mention session sans fin) ; vérifier : HOME+vide 0 erreur, suppression de HOME du jeu vide → rejet nommé

## 2. Studio : créer et prévisualiser le vide

- [x] 2.1 Suppression du dernier nœud autorisée sous HOME (confirmation + rappel), refusée sinon (inchangé) ; vérifier : suppression → `nodes: []` valide, canvas aide à la création
- [x] 2.2 Bouton ▶ Mode Jeux actif sous HOME sans file ni actif (terminal sur tableau) ; vérifier : lancement → tableau qui tourne, sans HOME ni file → désactivé comme avant
- [x] 2.3 Import d'un JSON HOME-seul via le pipeline existant ; vérifier : chargé, éditable, exportable

## 3. Non-régression

- [x] 3.1 Sherlock + fixture C1+C2 (0 erreur), smokes Studio, `tsc`, tests players ; `evaluate` sur zéro nœud prouvé ; vérifier et consigner
