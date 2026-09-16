## 1. Setup et types

- [x] 1.1 Ajouter `maplibre-gl` aux dépendances du Studio et vérifier l'installation (`npm install maplibre-gl && npm run build`)
- [x] 1.2 Ajouter les types dans `types.ts` : `IndoorPlan { id, name, floor, image, origin, scale, sizeMeters }`, `NodePosition { planId, x, y }`, `CalibrationState { pointA?, pointB?, distanceMeters? }`
- [x] 1.3 Ajouter `indoorPlans?: IndoorPlan[]` au type `Game.global` et `position?: NodePosition` au type `GameNode`

## 2. MCP operations

- [x] 2.1 Ajouter `computeBbox(game): {minLat, minLng, maxLat, maxLng}` dans `mcp.ts` — calcul bbox depuis les GEOFENCE + buffer 200m
- [x] 2.2 Ajouter `setNodePosition(game, nodeId, position): Game` dans `mcp.ts` — met à jour lat/lng (outdoor) ou position (indoor)
- [x] 2.3 Ajouter `detectGeofenceOverlaps(game): Array<{a: string, b: string}>` dans `mcp.ts` — détection géométrique (distance < somme des rayons)

## 3. Composant MapView — outdoor

- [x] 3.1 Créer `src/components/MapView.tsx` avec skeleton : composant React recevant `game`, `sel`, `onSelect`, `onPositionChange`, rendu conditionnel outdoor/indoor
- [x] 3.2 Implémenter le rendu MapLibre outdoor : fond de carte avec tuiles du pack (`global.map`), fallback sur OSM en dev
- [x] 3.3 Ajouter les marqueurs POI : extraire lat/lng depuis les conditions GEOFENCE de chaque nœud, rendre un marker par POI
- [x] 3.4 Ajouter les cercles de géofence : overlay GeoJSON `Circle` avec `radiusMeters` depuis chaque condition GEOFENCE
- [x] 3.5 Ajouter le rendu de la trace GPX : polyline depuis le fichier GPX du pack (si disponible)

## 4. Composant MapView — indoor

- [x] 4.1 Implémenter le rendu du plan indoor : image `indoorPlans[].image` en fond, conversion (x,y) → pixels via `scale`
- [x] 4.2 Ajouter les marqueurs nœuds indoor : markers aux positions (x, y) du plan actif
- [x] 4.3 Implémenter le sélecteur d'étages : tabs pour basculer entre les indoorPlans, afficher le plan correspondant
- [x] 4.4 Ajouter l'outil de calibration indoor : mode calibration, 2 clics + saisie distance en mètres, calcul du scale

## 5. Interaction

- [x] 5.1 Implémenter le click-to-place : click sur la carte/plan définit les coordonnées du nœud sélectionné
- [x] 5.2 Implémenter le drag-to-reposition : drag d'un marqueur met à jour lat/lng ou x/y en temps réel
- [x] 5.3 Synchroniser la sélection entre vue graphe et vue carte (sel bidirectionnel)

## 6. Validation visuelle

- [x] 6.1 Implémenter l'avertissement chevauchement géofence : overlay jaune sur les pairs de géofences qui se chevauchent
- [x] 6.2 Implémenter le calcul automatique du bbox : bouton "Calculer le bbox" → modal de confirmation → application à `global.map.bbox`

## 7. Intégration Composer

- [x] 7.1 Ajouter le toggle Carte/Graphe dans la barre d'outils du Composer (visible si `global.map` ou `global.indoorPlans` configuré)
- [x] 7.2 Rendu conditionnel : si toggle "Carte" actif → MapView, sinon → canvas graphe existant
- [x] 7.3 Ajouter la section "Position" dans l'inspecteur de nœud : champs lat/lng (outdoor) ou planId/x/y (indoor)
- [x] 7.4 Synchroniser l'édition de la section Position avec la vue carte (modification manuelle → mise à jour du marqueur)
