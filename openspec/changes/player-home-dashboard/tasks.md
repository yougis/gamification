## 1. Schéma et moteur

- [ ] 1.1 Ajouter `HOME` à l'enum `global.presentation` (`game-schema.json`, types TS + Kotlin) ; vérifier : `["HOME", "TOOLBOX"]` accepté C1, `["DASHBOARD"]` rejeté, jeux existants inchangés
- [ ] 1.2 Calculs purs partagés : temps restant par POI depuis les `TIMER` (`GAME_START` vs `NODE_COMPLETION`, ancre absente → null) ; vérifier : 600s − 240s écoulées → 360s, ancre future → null, multi-TIMER → premier non satisfait (Kotlin + miroir TS)

## 2. Tableau de bord

- [ ] 2.1 UI partagée (temps écoulé, comptes à rebours par POI, états fait/à faire, entrée inventaire via la règle existante, bouton d'ouverture tête de file) + natif Android (même règle, même contenu) ; vérifier : Sherlock affiche ses POI avec états et rebours, ouvrir → même file sans event ajouté, fermer → reprise exacte
- [ ] 2.2 Câbler `HOME` comme vue par défaut sans modale ACTIVE (combinable : `HOME + MAP + TOOLBOX`) ; vérifier : `HOME` seul → tableau seul jamais vide, sans `HOME` → comportement actuel inchangé

## 3. Non-régression

- [ ] 3.1 Revalider Sherlock et la fixture C1+C2 (0 erreur), `tsc`, smokes, tests players NATIVE/PWA ; vérifier et consigner (limites d'épreuve absentes du tableau par construction)
