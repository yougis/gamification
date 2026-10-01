## 1. Phase 1 — pastille auteur

- [x] 1.1 Retirer le `<span puce>` « Pack actif » de `MapWidgetRenderer` (titre et badge conservés) et vérifier le canvas Screen et l'aperçu Home n'affichent plus la pastille
- [x] 1.2 Amender le delta `studio-screen-builder` de `pack-tuiles-effectif` (retrait de l'exigence pastille), mettre à jour le smoke tuiles et vérifier `openspec validate` passe sur les deux changes

## 2. Phase 2 — player navigable + GPS

- [x] 2.1 Ajouter l'état viewport (pan drag + pinch, boutons +/-, recentrage) à `MapWidgetBlock` et vérifier marqueurs, cercles et volet suivent sans event ni transition
- [x] 2.2 Alimenter `position` depuis la source plateforme (`LocationProvider` natif, Geolocation PWA) dans les deux appelants et vérifier le point s'affiche, se déplace, et s'absente gracieusement sans GPS
- [x] 2.3 Étendre `MapWidgetCommonTest` (viewport sans event, GPS absent sans crash, tap-vs-drag) et vérifier les tests communs passent

## 3. Phase 3 — prévisualisation Studio

- [x] 3.1 Rendre le widget carte interactif dans `PlayerTerminal` (tuiles proxy `/tiles`, position simulée de l'état d'essai, badge SIMULÉ) et vérifier clic POI affiche le volet
- [x] 3.2 Câbler Ouvrir simulé (éligible → présentation d'étape + event SIMULÉ, verrouillé → sans effet) et vérifier le JSON source reste inchangé et le journal distingue le simulé
- [x] 3.3 Vérifier navigation (pan/zoom/fermeture) sans event même simulé et sortie du terminal sans perte d'état d'essai
