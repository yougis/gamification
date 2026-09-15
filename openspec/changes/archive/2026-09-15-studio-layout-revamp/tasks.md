# Tâches — Refonte des écrans du Studio

## Tâches

- [x] T1. Diagnostiquer l'affichage du graphe — reproduire avec `game-5poi.json` et `game-sherlock-holmes.json`, identifier la cause (hauteur conteneur, positions, `fitView`), consigner avant/après. Fichiers : `studio/src/App.tsx` (lecture seule à ce stade).
- [x] T2. Corriger le conteneur du graphe — hauteur garantie, `fitView` après chargement/import, jitter des positions initiales, `MiniMap`/`Controls` vérifiés. Fichiers : `studio/src/App.tsx`.
- [x] T3. Menu de gauche rétractable — état `menuReplie` persisté (`localStorage`), rail d'icônes 56px avec `title`/`aria-label`, bouton plier/déplier. Fichiers : `studio/src/App.tsx`, `studio/src/styles/theme.css`.
- [x] T4. Panneaux redimensionnables — poignées de séparation au pointeur (`col-resize`), largeurs bornées persistées (`geoplay-layout-v1`), bouton « réinitialiser la mise en page ». Fichiers : `studio/src/App.tsx` (+ nouveau `studio/src/components/Splitter.tsx` si pertinent).
- [x] T5. Sections pliables — palette, graphe, liste, détail, essai : bouton plier/déplier, état mémorisé. Fichiers : `studio/src/App.tsx`.
- [x] T6. Drill-down workflow → section — `onAller` fait défiler + surligne la section correspondante via une table étape → section. Fichiers : `studio/src/App.tsx`, `studio/src/components/WorkflowStepper.tsx`.
- [x] T7. Boutons « molette » par section — mini-panneau : plier/déplier, réinitialiser la taille, recentrer (graphe). Réutiliser `Icon name="engrenage"`. Fichiers : `studio/src/App.tsx`.
- [x] T8. Sélection nœud → détail — clic graphe/liste ouvre et surligne la section détail. Fichiers : `studio/src/App.tsx`.
- [x] T9. Non-régression petit écran + tactile — onglets inchangés, cibles ≥ 44px, poignées utilisables au tactile (`touch-action: none`). Fichiers : `studio/src/App.tsx`, `studio/src/styles/theme.css`.
- [x] T10. Vérification finale — `tsc --noEmit`, `lint`, smokes (`dev:smoke`, `test:runtime`, `test:modules`, `test:pack`), chargement des deux jeux démo. Aucun changement JSON/validation.

## Priorité

| Priorité | Tâches |
|----------|--------|
| Haute | T1, T2, T3, T4 |
| Moyenne | T5, T6, T7, T8 |
| Basse | T9, T10 |
