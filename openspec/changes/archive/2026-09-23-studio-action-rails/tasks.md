## 1. Rail générique + toolbar conditionnelle

- [x] 1.1 Étendre `RailReplie` (prop `actions` : icône + tooltip + état actif + handler, boutons focusables) et retirer son chevron (l'icône panneau déplie tel quel) — Vérifier : rendu isolé (icône + 2 actions + tooltips + `aria-current`), `tsc --noEmit` sans nouvelle erreur
- [x] 1.2 Adapter les 3 call sites (graphe/liste/détail) à la nouvelle API sans changer leur comportement — Vérifier : repli/dépli identiques à avant, `tsc --noEmit` sans nouvelle erreur
- [x] 1.3 Conditionner Recentrer/Aligner H/V à `vueCentrale === "graphe"` (pastille + chevron toujours visibles) — Vérifier : toolbar complète en vue graphe, réduite en vue carte/screen, Aligner désactivé + tooltip si < 2 sélectionnés

## 2. Actions par rail

- [x] 2.1 Rail liste : icône panneau + 4 créations (Étape/Lieu/Tirage/Fin) qui agissent sans déplier — Vérifier : clic Lieu rail replié crée et sélectionne un lieu, liste restée repliée
- [x] 2.2 Rail graphe : icône panneau + 3 vues (déplier + commuter) + pastille (naviguer sans déplier) — Vérifier : clic Carte rail replié déploie en vue carte ; clic pastille ouvre Valider, graphe resté replié
- [x] 2.3 Remonter `activeFamille`/`setActiveFamille` de l'`Inspecteur` vers `App` (2 call sites, navigation clavier inchangée) — Vérifier : tabs clic + flèches identiques, `tsc --noEmit` sans nouvelle erreur
- [x] 2.4 Rail détail : icône panneau + 9 familles (déplier + activer) si nœud sélectionné, icône seule sinon — Vérifier : clic Effets rail replié déploie sur la famille Effets ; sans sélection, rail à icône unique

## 3. Vérification globale

- [x] 3.1 Revue : rails pleins/vides, 3 vues graphe, thèmes sombre + clair, clavier seul, smokes verts — Vérifier : aucune régression 5.1 du change `studio-composer-ux` (grep Replier/molette/footer-composer vides), `tsc --noEmit` au baseline, smokes dev/runtime/pack/screen verts
