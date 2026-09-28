## Why

En développement, la vue carte du Composer tire ses tuiles via le proxy Vite `/tiles` vers OSM. Sous rafale (dizaines de requêtes parallèles MapLibre), le CDN répond 502 et la carte reste en échec silencieux (`console.warn` seul) ; sans GPU, le contexte WebGL est perdu et la carte est morte. Or la spec exige déjà un fond uni de repli — jamais implémenté pour les échecs de chargement.

## What Changes

- `MapView` compte les erreurs de tuiles : passé un seuil, bascule sur fond uni + pastille « tuiles indisponibles », marqueurs et cercles conservés (ils n'en dépendent pas).
- Écoute `webglcontextlost` : même fallback au lieu d'une carte morte.
- Rafale calmée côté MapLibre (`maxParallelImageRequests: 2`, retry/backoff léger), conforme à la politique d'usage OSM.
- Message visible en dev quand le proxy `/tiles` échoue en boucle (aucun changement du chemin tuiles du pack en prod/offline).

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `studio-map-view`: bascule fond uni + pastille sur échec de chargement tuiles ou perte WebGL (étend le fallback existant « tuiles absentes », inchangé).

## Impact

- Code : `studio/src/components/MapView.tsx` seul (compteur d'erreurs, fallback, pastille, parallélisme, listener WebGL).
- Schéma graphe : inchangé ; aucun consommateur impacté.
- Aucune valeur réservée CONDITIONAL/WINDOW touchée, aucun module ajouté au registre.
- Aucun besoin réseau ajouté : moins de requêtes (parallélisme réduit), tuiles pack inchangées.
- Aucune dépendance à un change précédent non archivé.
