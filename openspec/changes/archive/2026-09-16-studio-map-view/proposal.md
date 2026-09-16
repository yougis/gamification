## Why

Le Studio ne propose actuellement qu'une vue graphe (nœuds + arêtes) pour composer un jeu. L'auteur n'a aucun moyen de visualiser la position géographique réelle des POI sur une carte, ni de placer des nœuds indoor sur un plan d'étage. Cela rend impossible la validation de la disposition spatiale, la détection de chevauchements de géofences, et le positionnement intuitif des POI.

## What Changes

- Ajout d'un toggle **Carte/Plan** dans le Composer (même écran, pas nouvel écran)
- **Mode outdoor** : fond MapLibre avec tuiles du pack, marqueurs POI, cercles de géofence, trace GPX
- **Mode indoor** : image de plan en fond, marqueurs nœuds aux positions (x, y), sélecteur d'étages
- Click pour placer/repositionner les coordonnées d'un nœud (lat/lng outdoor, x/y indoor)
- Drag pour repositionner un nœud sur la carte/plan
- Calibration indoor en 2 clics : cliquer point A, cliquer point B, saisir la distance en mètres → calcul automatique de l'échelle (px/m)
- Avertissement de chevauchement de géofences (outdoor)
- Calcul automatique du bbox à partir des positions réelles des POI + trace

## Capabilities

### New Capabilities
- `studio-map-view`: Couche de visualisation carte/plan dans le Composer — rendu MapLibre (outdoor), rendu image de plan (indoor), interaction drag/click pour positionnement, calibration indoor 2 clics

### Modified Capabilities
- `studio-authoring`: Le Composer gère un toggle entre vue graphe et vue carte/plan — une nouvelle section dans le panneau d'inspection pour les coordonnées de position

## Impact

- `studio/src/App.tsx` : composant Composer — ajout du toggle et du panneau carte/plan
- `studio/src/game/types.ts` : types pour indoorPlans, node.position, calibration
- `studio/src/game/mcp.ts` : opérations MCP pour setNodePosition, computeBbox
- Dépendance au change `indoor-plan-schema` pour les types indoor (indoorPlans, position)
- Dépendance au change `smart-tile-caching` pour la disponibilité des tuiles dans le pack
- MapLibre Native déjà mentionné dans offline-pack spec — pas de nouvelle dépendance externe
