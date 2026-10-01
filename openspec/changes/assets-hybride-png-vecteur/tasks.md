## 1. Contenu raster

- [ ] 1.1 Rasteriser les images de contenu Sherlock en PNG (écrans, moriarty source/derivee, holmes marker/fallback) à côté des SVG et basculer les refs JSON, et vérifier l'affichage navigateur + Android
- [ ] 1.2 Générer 2 visuels neutres pour `game-5poi` (puzzle + marqueur) et remplacer les liens morts, et vérifier la validité C1+C2 inchangée (0 erreur)

## 2. Icônes vectorielles

- [ ] 2.1 Convertir les 6 icônes d'objets en `VectorDrawable` et mapper `.svg` → drawable dans le loader Android (repli bitmap), et vérifier la netteté sur device haute densité

## 3. Manifests et preuves

- [ ] 3.1 Régénérer les manifests (SHA-256 réels des PNG), revalider C1+C2, rejouer `SherlockParityJvmTest`, et vérifier le transfert pack `.zip` avec images visibles offline sur téléphone
