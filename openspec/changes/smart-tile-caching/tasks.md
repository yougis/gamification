## 1. Types et schéma

- [ ] 1.1 Ajouter le type `TileStrategy = "fixed" | "viewport" | "radius" | "none"` dans `types.ts` et vérifier `tsc --noEmit` passe
- [ ] 1.2 Ajouter `tileStrategy?: TileStrategy`, `tileRadiusMeters?: number` et `tilePackId?: string` dans le type `GlobalMap` et vérifier `game-5poi.json` compile sans changement
- [ ] 1.3 Étendre `game-schema.json` avec `tileStrategy` (enum optionnel), `tileRadiusMeters` (number optionnel) et `tilePackId` (string optionnel) dans `global.map`, avec `if/then` radius exige rayon, et vérifier `game-5poi.json` reste accepté
- [ ] 1.4 Ajouter le type `TilePackMeta {id, nom, config, taille, nbTuiles, date, statut}` dans `types.ts` et vérifier son import dans le menu

## 2. Calcul bbox

- [ ] 2.1 Implémenter `computeBboxFromPoi(game, radiusMeters): {minLat, minLng, maxLat, maxLng}` dans `mcp.ts` et vérifier sur 3 POI + 300m le test bbox couvre tous les POI
- [ ] 2.2 Implémenter `computeBboxFromStrategy(game): {minLat, minLng, maxLat, maxLng}` dans `mcp.ts` (dispatch fixed/viewport/radius/none) et vérifier chaque stratégie retourne la bbox attendue
- [ ] 2.3 Intégrer le calcul dans `buildManifest` lors de l'export et vérifier le manifest contient la bbox calculée

## 3. Menu Packs de carte

- [ ] 3.1 Créer le menu « Packs de carte » exposant provider, bbox, tileRadiusMeters, minZoom/maxZoom, attribution, estimation tuiles/taille et progression, et vérifier toute option modifie `global.map` sans JSON manuel
- [ ] 3.2 Lancer la génération des tuiles depuis le menu avec progression % et état explicite, et vérifier succès + fichier fautif nommé en cas d'échec
- [ ] 3.3 Afficher l'estimation (nombre de tuiles, taille totale) avant génération depuis la config courante, et vérifier l'estimation correspond au pack généré (±10 %)

## 4. Cache serveur et multi-cache

- [ ] 4.1 Persister chaque pack généré côté serveur (id, snapshot config, manifest SHA-256, taille, date, statut) et vérifier le pack est re-téléchargeable avec le `game.json`
- [ ] 4.2 Lister les packs du projet (nom, config, taille, date, statut, actif) dans le menu, et vérifier N packs s'affichent avec le bon actif
- [ ] 4.3 Supprimer un pack avec confirmation (sans casser le JSON ; supprimer l'actif retire `tilePackId`, repli fond uni), et vérifier la suppression est effective serveur + UI
- [ ] 4.4 Désigner le pack actif via `setActiveTilePack` (`global.map.tilePackId`, undo possible) et vérifier l'export embarque les tuiles du pack actif

## 5. Liaison widget map et validation

- [ ] 5.1 Lier le Fond existant `"tuiles du pack"` au pack actif (aucune nouvelle valeur), et vérifier le widget rend les tuiles du pack actif offline
- [ ] 5.2 Vérifier le repli fond uni (marqueurs + position lisibles, zéro réseau) quand aucun pack actif n'est désigné
- [ ] 5.3 Ajouter la vérification `tileRadiusMeters > 0` si `tileStrategy: "radius"` dans `validate.ts` et vérifier un rayon invalide est rejeté
- [ ] 5.4 Ajouter l'avertissement si `tileStrategy: "none"` mais `global.map` avec tuiles est présent, et vérifier l'export reste possible après confirmation
- [ ] 5.5 Ajouter l'avertissement si des tuiles hors bbox calculée sont incluses, et vérifier les 20 tuiles hors zone de la fixture sont signalées
- [ ] 5.6 Ajouter `setTileStrategy(game, strategy, radius?): Game` et `computeOptimalBbox(game): {bbox, strategy, tileCount}` dans `mcp.ts`, et vérifier les deux opérations passent undo/redo
