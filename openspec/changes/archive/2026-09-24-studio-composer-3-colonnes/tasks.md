## 1. Structure 3 colonnes

- [x] 1.1 Réordonner le Composer en `[liste | centre flex-1 | détail]` (sortir la liste du `main`) et vérifier visuellement l'ordre liste-gauche / centre / détail-droite sur grand écran
- [x] 1.2 Rendre le panneau central non repliable (retirer chevron, rail et `repliees.graphe`) et vérifier qu'aucune commande de repli n'existe sur le centre
- [x] 1.3 Câbler les 2 Splitters symétriques (`liste|centre` sur `mep.liste` 220-520, `centre|detail` sur `mep.droite` 280-640) et vérifier le drag + clavier (flèches) dans le bon sens des deux côtés, avec reset par double-clic

## 2. Rails et toolbar

- [x] 2.1 Ancrer le rail liste à gauche (icône + 4 créations sans déplier) avec chevron `<` et vérifier création Lieu sans déplier + tooltip de dépliage
- [x] 2.2 Migrer les vues Graphe/Carte/Screen de l'ex-rail vers la toolbar centrale et supprimer la pastille rail (barre globale fait foi), et vérifier la commutation des 3 vues sans repli
- [x] 2.3 Nettoyer `geoplay-layout-v1` (`repliees.graphe` ignorée puis supprimée, `SectionPliable` à 2 clés, `allerEtape` sans branche graphe) et vérifier qu'un état ancien `graphe: true` affiche un centre visible après rechargement

## 3. Non-régression

- [x] 3.1 Vérifier `tsc --noEmit` dans `studio/`, le drill-down `WorkflowStepper` (`scrollIntoView` vers `section-liste/graphe/detail`) et la vue étroite `<lg` inchangée
- [x] 3.2 Vérifier les scénarios spec : centre fixe + rails `[L]` à gauche / `[D]` à droite, persistance du repli latéral, Aligner masqué en carte / présent en graphe, pastille globale cliquable vers Valider
