## Why

Le Studio contient des bugs critiques qui cassent le fonctionnement de base (toggle carte/graphe) et des incohérences entre les types TypeScript, le JSON schema et le code UI. Ces bugs bloquent le développement des features indoor et tile, car les fondations sont incompatibles entre elles.

Les principaux problèmes :
1. **MapView reçoit les mauvaises props** — le composant attend `{sel, onSelect, onGameChange}` mais App.tsx passe `{selectedNodeId, onSelectNode, onSetNodePosition}`. Résultat : le toggle carte/graphe est probablement cassé.
2. **NodePosition a deux shapes incompatibles** — le type TypeScript définit `{planId, x, y}` (indoor) mais le code UI traite `{lat, lng} | {indoor: {planId, floor}}`. Ces deux shapes ne sont pas liées.
3. **Le JSON schema ne contient pas `indoorPlans`, `position`, ni `tileStrategy`** — les types TypeScript les définissent mais Draft-07 ne les connaît pas, donc tout jeu utilisant ces fonctionnalités échoue à la validation couche 1.
4. **Le schema `global.map` est vide** — défini comme `{"type": "object"}` sans aucune propriété, alors que les specs demandent `{provider, bbox, minZoom, maxZoom, attribution}`.
5. **`discovery.itemId` manque** dans le schema malgré son support en TypeScript.
6. **Aucune validation indoor** — pas de vérification d'exclusion mutuelle map↔indoorPlans, de planId valide, de scale>0, ni de warning indoor+GEOFENCE.
7. **`global.preset` n'est pas rejeté** — les specs disent qu'il est obsolète, mais le validateur ne le rejette pas.

## What Changes

- **BUGFIX**: Corriger les props de MapView dans App.tsx pour matcher l'interface MapViewProps
- **BREAKING**: Unifier le type `NodePosition` en une seule shape `{planId, x, y}` et corriger le code UI Inspector pour utiliser cette shape
- **Schema**: Ajouter `indoorPlans`, `node.position`, `tileStrategy`, `tileRadiusMeters` au JSON schema Draft-07
- **Schema**: Structurer `global.map` avec ses propriétés réelles (provider, bbox, minZoom, maxZoom, attribution)
- **Schema**: Ajouter `discovery.itemId` au schéma de découverte
- **Validation**: Ajouter les règles indoor (exclusion mutuelle, planId, scale, warning GEOFENCE)
- **Validation**: Ajouter le rejet de `global.preset` obsolète
- **Validation**: Ajouter les règles tileStrategy

## Capabilities

### New Capabilities

_(aucune — ce change ne crée pas de nouveaux concepts, il corrige et complète des existants)_

### Modified Capabilities

- `game-schema`: Compléter le schema Draft-07 avec indoorPlans, node.position, tileStrategy, structure map, discovery.itemId
- `game-validation`: Ajouter les validations indoor, tile, et rejet global.preset

## Impact

- **studio/src/App.tsx**: Correction des props MapView (ligne ~866) et du code position Inspector (lignes ~1895-1931)
- **studio/src/components/MapView.tsx**: Aucune modification nécessaire (le composant est correct, c'est l'appelant qui se trompe)
- **studio/src/game/types.ts**: Vérifier la cohérence de NodePosition (déjà correct)
- **studio/src/game/schema/game-schema.json**: Ajouter les nouvelles définitions
- **studio/src/game/validate.ts**: Ajouter les nouvelles règles
- **Aucun impact runtime natif**: ces changements sont Studio-side uniquement
