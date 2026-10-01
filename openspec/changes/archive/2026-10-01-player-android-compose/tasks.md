## 1. Hébergement Compose dans :app

- [x] 1.1 Ajouter les dépendances Compose à `:app` et héberger `GeoPlayApp` via `ComposeView` dans `GameFragment`, et vérifier que HOME s'affiche depuis un pack installé
- [x] 1.2 Brancher les providers natifs (position GPS, lecture fichiers/assets) à la frontière `expect/actual` et vérifier que la carte affiche la position et que les images du pack se chargent

## 2. Écrans et modules

- [x] 2.1 Rendre les écrans de nœuds (zones, widgets, overlay, branding) via le renderer partagé et vérifier un écran quiz-focus complet contre iOS/simu
- [x] 2.2 Rendre le quiz interactif (sélection, feedback, score, complétion) et vérifier la progression `UNLOCKED → COMPLETED` avec events
- [x] 2.3 Supprimer les fragments legacy (`rvQueue` texte, `ModuleFragment` titre, dashboard texte) et vérifier qu'aucune référence ne subsiste

## 3. Parité et non-régression

- [x] 3.1 Rejouer la fixture 2pts sur Android (HOME, carte + volet Ouvrir, quiz, tirage) et vérifier la parité visuelle et moteur avec iOS et le simulateur
- [x] 3.2 Rejouer import URL + catalogue local sur tablette et vérifier zéro régression, puis `assembleDebug` + tests verts
