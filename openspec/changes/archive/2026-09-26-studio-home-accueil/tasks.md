## 1. Configurateur Studio

- [x] 1.1 Créer `PresentationPanel` dans l'écran Configuration (7 cases via `setPresentation`, rappel preset, avertissement `presentationNeeds`, aperçu HOME statique piloté par les données) et vérifier : cocher écrit le JSON (undo OK), besoin non couvert avertit sans bloquer
- [x] 1.2 Vérifier `tsc --noEmit` côté Studio et les jeux existants inchangés (`["MAP"]` par défaut, aucune case pré-cochée ajoutée)

## 2. Onglet Accueil player

- [x] 2.1 Ajouter l'entrée Accueil dans la route `GRAPH` du shared (même contenu dashboard, règle par défaut inchangée, sans event ni transition) et vérifier : avec `HOME`, l'onglet est toujours visible ; sans `HOME`, comportement actuel inchangé
- [x] 2.2 Vérifier la parité Android (câblage existant conservé) et PWA (héritage via `GeoPlayApp`) : mêmes scénarios rejoués des trois côtés

## 3. Non-régression

- [x] 3.1 Archiver `player-home-dashboard` d'abord puis rebaser ce delta si besoin, revalider (`openspec validate`), rejouer C1+C2 Sherlock/fixture à 0 erreur
