## 1. Sémantique clic / Maj+clic dans le graphe (design D2)

- [x] 1.1 Clic simple sur un nœud remplace la sélection (`choisirNoeud` + vide `selMulti` via garde d'égalité) ; vérifier : 2 nœuds sélectionnés puis clic simple sur un 3e → seul le 3e reste sélectionné, `tsc --noEmit` passe
- [x] 1.2 Maj+clic bascule le nœud dans `selMulti` et promeut l'id en `sel` (détail suit le dernier touché), sans toucher aux autres ; vérifier : Maj+clic ajoute puis retire, `tsc --noEmit` passe
- [x] 1.3 Clic sur le fond vide (`onPaneClick` mémorisé) vide `sel` + `selMulti` via gardes, sans toucher aux positions ni recadrer ; vérifier : sélection active puis clic pane → vide, positions et zoom inchangés

## 2. Action tout sélectionner / désélectionner (design D3)

- [x] 2.1 Fonction unique `toutSelectionner` / `toutDeselectionner` (tous les ids de `game.nodes`, `sel` = dernier id ; vide complet sinon) avec libellé réactif, exposée dans la barre du graphe et l'en-tête de la liste ; vérifier : 5 nœuds → tous sélectionnés des deux côtés puis vidés, libellé bascule, `tsc --noEmit` passe

## 3. Liste reflétant l'union (design D4)

- [x] 3.1 `NodeList` reçoit `selMulti`, marque choisies les lignes de l'union `{sel} ∪ selMulti`, `aria-activedescendant` suit `sel` ; vérifier : sélection graphe → lignes marquées, `tsc --noEmit` passe
- [x] 3.2 Maj+clic (et Maj+Entrée clavier) sur une ligne de la liste bascule le nœud dans la sélection partagée ; vérifier : ajout/retrait depuis la liste reflété sur le canvas

## 4. Vérification finale

- [x] 4.1 Rejouer les 4 nouveaux scénarios du delta spec (clic-remplace, Maj-ajoute-retire, tout sélectionner/désélectionner, liste→canvas) ; vérifier chaque scénario et consigner le résultat
- [x] 4.2 Non-régression : alignement H/V multi-nœuds, undo/redo, drill-down détail, `npx tsc --noEmit` + `npx vite build` dans `studio/` ; vérifier et consigner
