## MODIFIED Requirements

### Requirement: Rendu outdoor — carte MapLibre

La vue carte outdoor SHALL afficher :
- Fond MapLibre avec les tuiles du pack (provider, bbox, minZoom, maxZoom depuis `global.map`)
- Marqueurs POI aux positions lat/lng des nœuds ayant des conditions GEOFENCE
- Cercles de géofence avec le rayon (`radiusMeters`) de chaque condition GEOFENCE
- Trace GPX en polyline si disponible dans le pack
- Le fond SHALL basculer sur "fond uni" si les tuiles sont absentes (fallback existant dans `selectFond`)
- Le fond SHALL basculer sur "fond uni" avec pastille « tuiles indisponibles » quand le chargement des tuiles échoue en boucle (seuil d'erreurs) ou que le contexte WebGL est perdu ; marqueurs et cercles SHALL rester visibles et interactifs dans tous les cas

#### Scenario: Affichage des POI sur la carte
- **GIVEN** un jeu outdoor avec 3 nœuds ayant des conditions GEOFENCE
- **WHEN** l'auteur ouvre la vue carte
- **THEN** les 3 POI sont affichés avec leur marqueur et leur cercle de géofence

#### Scenario: Tuiles absentes — fond uni
- **GIVEN** un jeu outdoor sans tuiles pré-chargées
- **WHEN** l'auteur ouvre la vue carte
- **THEN** le fond est uni, les marqueurs et cercles restent visibles

#### Scenario: Échec de chargement — fond uni avec pastille
- **GIVEN** un jeu outdoor avec tuiles configurées mais un service tuiles en échec répété (ou sans GPU)
- **WHEN** le seuil d'erreurs est atteint ou le contexte WebGL est perdu
- **THEN** le fond bascule sur uni avec pastille « tuiles indisponibles », les 3 POI restent affichés et cliquables
