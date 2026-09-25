## 1. Règle de découpage partagée

- [x] 1.1 Implémenter `paginateContent` côté Studio (TS) + côté `shared` (Kotlin) avec scénarios miroir, et vérifier : [texte, module, texte, image] → 3 sous-pages ; contenu sans média → 1 page — `screen.smoke` + `ScreenResolveCommonTest` verts (spec corrigé : au plus un média par page)
- [x] 1.2 Brancher le widget `progress` (`steps`) sur l'index de page dans le canvas et le renderer partagé, et vérifier : 2/4 affiché en page 2 — `contextePage` threadé (Zone→Widget→Progress, échantillon inchangé sans), `pageIndex/pageTotal` en Compose (fraction explicite prioritaire), `jvmTest` + `tsc` verts

## 2. Canvas auteur

- [x] 2.1 Afficher onglets/pastilles + Suivant/Précédent avec navigation active (état local, sélection suivant la page) et auto-création visible à l'ajout d'un widget `module`/`image`, et vérifier : 3 sous-pages navigables sans modification JSON — onglets + ←/→, mapping global/local des indices (sélection, commit, DnD), reset au changement de nœud, `tsc` vert
- [x] 2.2 Passer les widgets `image`/`module` en fit (`contain` + bornes viewport, ratio conservé) sur les 4 viewports, texte long en scroll, et vérifier : panoramique 2:1 entière en portrait, puzzle entier en paysage — défaut image `cover`→`contain` + `hauteurMaxMedia` (cadre−220, plancher 140) threadé jusqu'aux rendus, aperçu module en scroll borné, contrat Fit documenté côté seam partagé, `tsc` + 3 cibles OK

## 3. Joueur

- [ ] 3.1 Paginer le contenu dans le prévisualisateur Studio et le renderer partagé (swipe ±40 px + Suivant/Précédent/Terminer + compteur, un module par page), et vérifier : étape 3 sous-pages parcourue jusqu'à complétion normale
- [ ] 3.2 Rejouer Sherlock (8 écrans) comme oracle de non-régression parité, et vérifier : découpage identique Studio/joueur, `validate --specs` OK

## 4. Vérification finale

- [ ] 4.1 Rejouer sur la PWA déployée (portrait + paysage, swipe et boutons) et vérifier : module entier sans rognage, progression cohérente
- [ ] 4.2 Non-régression : tests verts, builds inchangés
