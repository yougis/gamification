## 1. Types

- [ ] 1.1 Ajouter le type `TileStrategy = "fixed" | "viewport" | "radius" | "none"` dans `types.ts`
- [ ] 1.2 Ajouter `tileStrategy?: TileStrategy` et `tileRadiusMeters?: number` dans le type `GlobalMap` (ou `Game.global`)

## 2. Schéma Draft-07

- [ ] 2.1 Étendre `game-schema.json` avec `tileStrategy` (enum optionnel) et `tileRadiusMeters` (number optionnel) dans `global.map`
- [ ] 2.2 Valider que `game-5poi.json` reste accepté (champs optionnels, pas de rupture)

## 3. Calcul bbox

- [ ] 3.1 Implémenter `computeBboxFromPoi(game, radiusMeters): {minLat, minLng, maxLat, maxLng}` dans `mcp.ts` — calcul depuis les positions GEOFENCE + buffer
- [ ] 3.2 Implémenter `computeBboxFromStrategy(game): {minLat, minLng, maxLat, maxLng}` dans `mcp.ts` — dispatch selon `tileStrategy`
- [ ] 3.3 Intégrer le calcul dans `buildManifest` (ou opération MCP équivalente) lors de l'export du pack

## 4. Validation

- [ ] 4.1 Ajouter la vérification `tileRadiusMeters > 0` si `tileStrategy: "radius"` dans `validate.ts`
- [ ] 4.2 Ajouter l'avertissement si `tileStrategy: "none"` mais `global.map` est présent (incohérent)
- [ ] 4.3 Ajouter l'avertissement si des tuiles hors de la bbox calculée sont incluses dans le pack

## 5. MCP

- [ ] 5.1 Ajouter `setTileStrategy(game, strategy, radius?): Game` dans `mcp.ts`
- [ ] 5.2 Ajouter `computeOptimalBbox(game): {bbox, strategy, tileCount}` dans `mcp.ts` — retourne la bbox et le nombre de tuiles estimé
