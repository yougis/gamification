## 1. Index tiles.json (Studio)

- [x] 1.1 Générer `tiles.json` (bornes, zooms, stratégie, liste `{z,x,y}`) à l'export et l'inscrire au manifest, et vérifier la cohérence croisée avec refus du fichier fautif
- [x] 1.2 Consommer `tiles.json` pour le chargement intelligent (viewport/radius) et le calcul ajouts/retraits, et vérifier sur un pack 200→210 tuiles (20 ajoutées, 10 retirées, 190 intactes)

## 2. Pack .zip transférable (Studio)

- [x] 2.1 Assembler le `.zip` (game.json + manifest + tiles.json + assets + tuiles, octets identiques) en streaming avec taille annoncée et confirmation, et vérifier l'import offline du zip sur téléphone (jeu jouable, manifest vert)

## 3. Mise à jour différentielle (player)

- [x] 3.1 Comparer manifests installé/nouveau et n'appliquer que la différence (copie des modifiés, suppression des retirés, vérification, bascule atomique, progression préservée), et vérifier qu'une image modifiée seule voyage et que l'ancien pack survit à un échec
- [x] 3.2 Proposer la mise à jour (pas de seconde entrée) à l'import zip/service d'un `gameId` installé, avec contrôle de taille du delta, et vérifier l'entrée unique et la progression préservée

## 4. Validation croisée

- [x] 4.1 Lancer `openspec validate`, tests Studio/KMP/app et smokes, et vérifier zéro régression
