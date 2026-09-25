## 1. Schéma et test de tap

- [x] 1.1 Étendre `polygons` en union rectangle `{x,y,w,h}` / polygone `{points[]}` (≥ 3 points, `%`, `additionalProperties: false` des deux côtés) dans `difference-game.json`, et vérifier C1 accepte les deux et rejette le polygone à 2 points
- [ ] 1.2 Étendre `hitTest` (+ dilatation) aux polygones côté Studio et porter le miroir côté player KMP, et vérifier tap intérieur/extérieur des deux formes

## 2. Atelier Modules et aperçu

- [ ] 2.1 Créer l'écran « Modules » avec l'éditeur 7-erreurs grand format (ratio naturel, calque %, outils rectangle + polygone, liste + suppression, op nommée), et vérifier tracé des deux formes + undo
- [ ] 2.2 Afficher dans le détail un aperçu réduit au ratio naturel avec compteur + bouton « Éditer les zones » (deep-link écran + nœud), et vérifier fidélité des zones puis navigation
- [ ] 2.3 Rendre l'overlay Relire proportionné en lecture seule (fini le 16:9 imposé), et vérifier clic sans modification

## 3. Non-régression

- [ ] 3.1 Revalider Sherlock (1 zone rectangle) couches 1+2 et rejouer tap ganté, et vérifier 0 erreur et zone toujours valide sans migration
