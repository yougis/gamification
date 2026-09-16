## 1. Types

- [ ] 1.1 Ajouter le type `IndoorPlan { id, name, floor, image, origin: {lat, lng}, scale, sizeMeters: {w, h} }` dans `types.ts`
- [ ] 1.2 Ajouter le type `NodePosition { planId, x, y }` dans `types.ts`
- [ ] 1.3 Ajouter `indoorPlans?: IndoorPlan[]` au type `Game.global` dans `types.ts`
- [ ] 1.4 Ajouter `position?: NodePosition` au type `GameNode` dans `types.ts`

## 2. Schéma Draft-07

- [ ] 2.1 Étendre `game-schema.json` avec la définition `indoorPlans` dans `global` (tableau optionnel, propriétés obligatoires par plan)
- [ ] 2.2 Étendre le schéma nœud avec `position` comme objet optionnel (`planId`, `x`, `y` requis si position présent)
- [ ] 2.3 Valider que `game-5poi.json` (outdoor) reste accepté avec les nouveaux champs optionnels

## 3. Validation applicative

- [ ] 3.1 Ajouter la règle d'exclusion mutuelle `map` ↔ `indoorPlans` dans `validate.ts`
- [ ] 3.2 Ajouter la vérification `planId` valide pour tout nœud avec `position`
- [ ] 3.3 Ajouter la vérification `scale > 0` et `origin` dans les bornes pour chaque plan
- [ ] 3.4 Ajouter l'avertissement nœud indoor + GEOFENCE dans `validate.ts`
- [ ] 3.5 Créer un jeu test indoor (`game-indoor.json`) et vérifier qu'il passe les deux couches de validation

## 4. MCP

- [ ] 4.1 Ajouter `addIndoorPlan(game, plan): Game` dans `mcp.ts`
- [ ] 4.2 Ajouter `removeIndoorPlan(game, planId): Game` dans `mcp.ts`
- [ ] 4.3 Ajouter `setNodePosition(game, nodeId, position): Game` dans `mcp.ts`
- [ ] 4.4 Ajouter `computeBbox(game): {minLat, minLng, maxLat, maxLng}` dans `mcp.ts`
