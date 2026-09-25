## 1. Schéma et Studio

- [x] 1.1 Ajouter `fermable?: boolean` à `ZoneContent` (Draft-07, défaut `false`, ignoré hors overlay) et vérifier C1 accepte `fermable: true` sur overlay et que l'absence du champ garde le comportement historique
- [x] 1.2 Ajouter le toggle « œil » (état local, jamais persisté) + la case « fermable par le joueur » dans les propriétés de la zone overlay, et vérifier masquage/réaffichage sans toucher au JSON (undo inchangé)

## 2. Terminal simulé (seul renderer d'écrans existant)

- [x] 2.1 Implémenter dans le terminal simulé : clic-fond masque (si `fermable`), écran dessous jouable, icône « message » persistante teintée branding, réaffichage avec état session conservé, et vérifier aller-retour libre sans transition d'état
- [x] 2.2 Vérifier la parité terminal simulé ↔ spec (mêmes scénarios rejoués dans le terminal) et consigner le suivi renderer natif/PWA (change dédié : aucune couche zones/overlay n'existe dans les players)

## 3. Non-régression

- [x] 3.1 Vérifier `tsc --noEmit` côté Studio, les overlays non `fermable` strictement inchangés (aucune icône, aucun masquage), et la reprise avec overlay affichée
