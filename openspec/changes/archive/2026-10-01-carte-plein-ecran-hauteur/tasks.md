## 1. Hauteur pleine en breakout

- [x] 1.1 Propager `h-full` dans la chaîne breakout (wrapper PhoneCanvas → `WidgetRenderer` en contexte → `MapWidgetRenderer` / `CarteInteractiveSimu` au lieu de `h-40`) et vérifier `tsc` passe sans nouvelle erreur
- [x] 1.2 Vérifier au rendu qu'une carte `pleinEcran` occupe toute la hauteur du cadre en édition (fantômes dessous) comme dans le terminal (navigable, sans bandeau ni zone vide)

## 2. Grille et non-régression

- [x] 2.1 Réévaluer le seuil `zoomApercu` pour le grand cadre et vérifier tuiles nettes sans explosion du nombre de requêtes
- [x] 2.2 Relancer les smokes Studio existants et snapshots SSR du rendu en flux, et vérifier 100 % verts (flux `h-40` inchangé, empilement et overlay intacts)
