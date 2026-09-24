## 1. Correctifs à cause racine

- [x] 1.1 Ajouter `activeFamille` aux deps du memo `detail` (familles figées après remontée 2.3) — Vérifier : clic sur chaque tab famille change le contenu, flèches clavier OK, pas de re-rendu pendant le drag, `tsc --noEmit` sans nouvelle erreur
- [x] 1.2 Rendre la pile Valider textuelle et navigable : texte `erreurFR` + fautif résolu (logique `listeErreurs` réutilisée) + clic vers Composer avec surlignage, badges C1/C2 et compte C1 calculés — Vérifier : chaque carte affiche sa règle corrompue en clair et son clic ouvre le nœud fautif, `tsc --noEmit` sans nouvelle erreur
- [x] 1.3 `terminer` rouvre le premier Nœud éligible de `file` au lieu de `null` (abandon inchangé, chute attente si aucun) + audit du câblage `onComplete` par type socle (QUIZ d'abord, fallback conservé) — Vérifier : partie rejouable de bout en bout en mode Jeux sans rester bloqué, flags SIMULÉ intacts, smokes runtime verts

## 2. Réagencements

- [x] 2.1 Intégrer Recentrer/Aligner H/V aux `Controls` natifs ReactFlow (`showFitView` + 2 `ControlButton`, règle < 2 + tooltips repris), supprimer la toolbar flottante (chevron seul en overlay) — Vérifier : contrôles visibles en vue graphe uniquement, Aligner désactivés + tooltip si < 2 sélectionnés, `tsc --noEmit` sans nouvelle erreur
- [x] 2.2 Recomposer l'entête : pastille déplacée (même composant) à côté nom/compteurs, nom auto-largeur (`size` dynamique + `max-width` ellipsis), Undo/Redo en icônes `annuler`/`retablir` (disabled, tooltips et aria conservés) — Vérifier : titre long non tronqué, pastille cliquable, flèches fonctionnelles, `tsc --noEmit` sans nouvelle erreur
- [x] 2.3 Consolider AJOUTER dans le header `NodeList` (prop callback), supprimer rangées App-memo, conserver icônes nav repliée et rail replié — Vérifier : un seul groupe de 4 boutons panneau ouvert, création+sélection+bascule inspecteur inchangées, `tsc --noEmit` sans nouvelle erreur

## 3. Vérification globale

- [x] 3.1 Revue des 8 points (familles cliquables, pile lisible+navigable, avance auto, contrôles natifs, entête, AJOUTER unique, rails/pastille/onglets intacts) + `tsc --noEmit` au baseline + smokes dev/runtime/pack/screen verts + revue visuelle sombre/clair et clavier seul
