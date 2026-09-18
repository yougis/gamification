## 1. Autosave du brouillon

- [x] 1.1 Persister `{ game, meta }` sous `geoplay-draft-v1` avec debounce ~500 ms après chaque `st.present` modifié ; vérifier en éditant un nœud puis en lisant `localStorage.getItem("geoplay-draft-v1")` dans la console (JSON contenant le nœud modifié).
- [x] 1.2 Restaurer le brouillon comme état initial du reducer (try/catch, validation minimale `game.nodes` tableau, fallback `jeuVide()`) ; vérifier en rechargeant la page : le jeu édité réapparaît à l'identique.
- [x] 1.3 Remplacer le brouillon à l'import réussi et à la création d'un nouveau jeu ; vérifier : importer un JSON valide puis recharger — c'est le jeu importé qui est restauré, pas l'ancien.
- [x] 1.4 Ajouter l'action « Effacer le brouillon » (suppression de la clé + reset sur `jeuVide()`) ; vérifier : après confirmation, un rechargement affiche un jeu vide.
- [x] 1.5 Dégrader proprement si `localStorage` indisponible/plein (try/catch, bandeau non bloquant, session en mémoire intacte) ; vérifier en simulant `setItem` qui lève : l'édition continue et l'avertissement s'affiche.
- [x] 1.6 Verrouiller l'export sans trace du brouillon (le JSON exporté ne contient ni clé ni horodatage d'autosave) ; vérifier en comparant l'export avant/après rechargement : contenus identiques.

## 2. Thème clair complet

- [x] 2.1 Auditer les couleurs sombres codées en dur hors branding (`#08090b`, `#111318`, `#181c24`, `#1e2228`, `#e8eaed`, `#6b7280`, tokens `bg-canvas/bg-panel/bg-surface*/text-snow/text-fog/border-rule`) dans `studio/src` ; vérifier : liste d'usages produite, chaque usage classé (token Tailwind, CSS ReactFlow, style inline).
- [x] 2.2 Surcharger les tokens Tailwind sombres sous `.theme-light` dans `tailwind.css` (valeurs claires miroir de `theme.css`) sans renommer les tokens ; vérifier : en thème clair, aucun panneau/bouton/bordure n'affiche les hex sombres listés en 2.1.
- [x] 2.3 Piloter le graphe par `colorMode` lié au thème et styler nœuds, libellés, arêtes, fond, contrôles et minimap via les variables CSS dans `theme.css` (deux thèmes) ; vérifier : bascule sombre→clair avec 5 nœuds — fond clair, nœuds à fond clair/texte sombre, arêtes visibles, sélection conservée.
- [x] 2.4 Corriger les styles inline résiduels à fond/texte sombres (`App.tsx`, `NodeList.tsx`, `MapView.tsx`) vers les variables de thème ; vérifier avec `grep` : plus aucun hex sombre en dur hors branding jeu et assets SVG.
- [ ] 2.5 Revue visuelle de non-régression : bascule clair→sombre pixel-identique au sombre d'origine, et jeu avec `branding.primaryColor: "#ff4400"` inchangé dans les deux thèmes ; vérifier par capture/contrôle visuel des deux thèmes.

## 3. Vérification finale

- [x] 3.1 `tsc --noEmit` passe sans erreur dans `studio/` ; vérifier par la commande.
- [ ] 3.2 Parcours manuel complet : éditer → recharger (brouillon restauré) → basculer clair (graphe clair) → exporter (JSON sans trace) → rebasculer sombre (identique) ; vérifier chaque étape observable.
