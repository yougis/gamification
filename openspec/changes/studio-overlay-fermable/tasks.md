## 1. Schéma et Studio

- [ ] 1.1 Ajouter `fermable?: boolean` à `ZoneContent` (Draft-07, défaut `false`, ignoré hors overlay) et vérifier C1 accepte `fermable: true` sur overlay et que l'absence du champ garde le comportement historique
- [ ] 1.2 Ajouter le toggle « œil » (état local, jamais persisté) + la case « fermable par le joueur » dans les propriétés de la zone overlay, et vérifier masquage/réaffichage sans toucher au JSON (undo inchangé)

## 2. Player natif + PWA (même contrat)

- [ ] 2.1 Implémenter côté natif : clic-fond masque (si `fermable`), écran dessous jouable, icône « message » persistante teintée branding, réaffichage avec état session conservé, et vérifier aller-retour libre sans transition d'état
- [ ] 2.2 Implémenter le même contrat côté PWA et vérifier la parité geste/icône/état avec le natif (mêmes scénarios rejoués des deux côtés)

## 3. Non-régression

- [ ] 3.1 Vérifier `tsc --noEmit` côté Studio, les overlays non `fermable` strictement inchangés (aucune icône, aucun masquage), et la reprise avec overlay affichée
