## 1. Taille relative et plein écran des widgets

- [x] 1.1 Déclarer `largeurPct`/`hauteurPct` (0-100) et `pleinEcran` dans les variantes visuelles du schéma (image, carte), et vérifier : carte plein écran acceptée, taille hors bornes rejetée, jeux existants inchangés
- [x] 1.2 Rendre taille %, breakout plein écran sous l'overlay et ordre de peinture = ordre du tableau dans le canvas auteur et le terminal simulé, exposer les champs + monter/descendre dans le panneau propriétés, et vérifier : `tsc` sans nouvelle erreur, carte plein écran + titre overlay sur les 4 viewports, undo restaure
