## 1. Reproduction et diagnostic

- [x] 1.1 Reproduire la boucle (`Maximum update depth exceeded` au clic/sélection) et classer chaque « graphe vide » (compte NodeList vs Panel vs MiniMap, `repliees.graphe`, `onglet`, largeur viewport) ; consigner le classement et vérifier qu'il distingue vide-données, non-monté et viewport-zéro
- [x] 1.2 Ajouter un log temporaire des types `NodeChange` reçus en dev pour confirmer que `select` transite par `onNodesChange`, puis le retirer en 2.4 ; vérifier que le log montre les types `select` vs `position`

## 2. Stabiliser la sélection (design D1–D3)

- [x] 2.1 Filtrer `onNodesChange` aux changements `position`/`dimensions` et ignorer les changements `select` ; vérifier qu'un clic sans drag ne modifie plus `positions` et que `tsc --noEmit` passe
- [x] 2.2 Ajouter des gardes d'égalité avant `setPositions` (coordonnées identiques) et `setSelMulti` (mêmes ids) ; vérifier qu'une sélection ré-émise à l'identique ne provoque aucun re-render (React DevTools) et que `vite build` passe
- [x] 2.3 Mémoriser les handlers (`useCallback`) et refléter l'union `sel ∪ selMulti` dans `nodes[].selected` ; vérifier clic simple, Shift+clic multi et sélection au clavier sans erreur `Maximum update depth exceeded`
- [x] 2.4 Retirer le log temporaire de 1.2 ; vérifier qu'aucun `console.log` de diagnostic ne subsiste (`grep`)

## 3. Cadrage à la demande (design D4)

- [x] 3.1 Remplacer le `fitView` permanent par un cadrage au montage, à la transition 0→N nœuds et via le bouton `Recentrer` ; vérifier qu'un zoom manuel survit à une sélection et que `Recentrer` cadre tout le graphe
- [x] 3.2 Vérifier que la recherche (`setCenter` animé) n'entre pas en conflit avec un geste en cours ; vérifier qu'Entrée centre le nœud sans yoyo de caméra

## 4. Vide réel vs non monté (design D5)

- [x] 4.1 N'afficher « graphe vide » que si le jeu n'a aucun nœud ; si le canvas n'est pas monté (graphe replié, autre onglet), ne pas présenter de vide ; vérifier les deux scénarios du delta spec
- [x] 4.2 Aligner ou documenter les seuils `etroite` (900 px) vs `lg:` (1024 px) uniquement si le diagnostic 1.1 l'exige ; vérifier la cohérence sur une largeur intermédiaire (ex. 950 px) ou consigner la décision

## 5. Vérification finale

- [x] 5.1 Exécuter `npx tsc --noEmit` et `npx vite build` dans `studio/` ; vérifier les deux commandes passent sans erreur
- [ ] 5.2 Rejouer les scénarios du delta spec (`specs/studio-authoring/spec.md`) ; vérifier que chaque scénario passe et consigner le résultat
- [ ] 5.3 Non-régression : alignement H/V sur sélection Shift+clic ≥ 2 nœuds, undo/redo, export bloqué/débloqué ; vérifier manuellement chaque fonction et consigner le résultat

## 6. Drag initialisé et fluide (design D8)

- [x] 6.1 Préserver `measured`/`dragging` en fusionnant les objets nœuds précédents (via ref) au lieu de reconstruire de zéro ; vérifier un drag immédiat après montage sans warning ReactFlow 015 et sans saccade, puis `tsc --noEmit`
- [x] 6.2 Si le cas « grab avant mesure » se confirme, n'autoriser le drag que sur nœuds initialisés ; vérifier le premier attrapage après ouverture et consigner si cette garde a été nécessaire ou non
- [x] 6.3 Mémoïser les panneaux lourds (`NodeList`, détail, validation) pour que chaque frame de drag ne re-rende plus tout `App` ; vérifier la fluidité au drag et que `vite build` passe

## 7. Dimensions uniformes et liens verticaux (design D7)

- [x] 7.1 Appliquer une largeur fixe aux boîtes et raccourcir les libellés (identifiant, sans statuts concaténés) ; vérifier des boîtes uniformes même avec des identifiants de longueurs variées
- [x] 7.2 Imposer `sourcePosition` bas / `targetPosition` haut sur les nœuds ; vérifier des liens verticaux lisibles sur la grille et que `tsc --noEmit` passe

## 8. Reset style vers la base (design D6)

- [x] 8.1 Supprimer les styles inline des nœuds (fonds, rails, ombres, outlines), convertir les pilules JSX en libellés texte simples, retirer marqueurs/couleurs/pointillés/`labelStyle`/`labelBgStyle` des arêtes, retirer les surcharges `.studio-flow` sur nœuds et textes d'arêtes (chrome contrôles/minimap/fond conservé) ; vérifier un rendu défaut ReactFlow et que `tsc --noEmit` + `vite build` passent
- [x] 8.2 Vérifier que les statuts `draft` restent visibles et bloquants hors canvas (liste des étapes, écran Relire, export bloqué) ; consigner le résultat
