## Why

Le schéma de jeu GeoPlay supporte uniquement le positionnement GPS (lat/lng) pour les nœuds. Les jeux indoor (musées, châteaux, grottes) n'ont pas de couverture GPS et nécessitent un système de positionnement alternatif : plans d'étage en repère local métrique, activation par BLE (PROXIMITY_MASTER). Sans support indoor dans le schema, il est impossible de créer des jeux entièrement intérieurs.

## What Changes

- Ajout de `global.indoorPlans[]` : tableau de définitions de plans d'étage (id, name, floor, image, origin, scale, sizeMeters)
- Ajout de `node.position` : position optionnelle `{planId, x, y}` pour les nœuds indoor
- Exclusion mutuelle : `global.map` et `global.indoorPlans` ne peuvent pas coexister dans un même jeu
- Validation Draft-07 : `indoorPlans` comme tableau optionnel, `position` comme objet optionnel sur les nœuds
- Validation applicatif : tous les nœuds indoor doivent référencer un planId valide, scale/origin cohérence

## Capabilities

### New Capabilities
- `indoor-plan-schema`: Définition du schéma JSON pour les plans indoor, positionnement métrique des nœuds, et validation Draft-07 + applicative

### Modified Capabilities
- `game-schema`: Ajout de `indoorPlans` dans `global` et `position` sur les nœuds, exclusion mutuelle avec `map`
- `game-validation`: Ajout de règles de validation indoor (planId valide, cohérence scale, exclusion map/indoorPlans)

## Impact

- `studio/src/game/types.ts` : types `IndoorPlan`, `NodePosition`
- `studio/src/game/validate.ts` : règles de validation indoor
- `studio/src/game/schema/game-schema.json` : schéma Draft-07 étendu
- `studio/src/game/mcp.ts` : opérations MCP pour la configuration indoor
- Runtime natif (Android + iOS) : interprétation des plans indoor au Player
- Change `studio-map-view` dépend de ce change pour les types indoor
