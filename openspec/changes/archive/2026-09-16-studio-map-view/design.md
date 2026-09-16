## Context

Le Composer (`App.tsx`) offre actuellement une seule vue : le canvas graphe avec des nœuds positionnés en coordonnées écran (positions x/y). Les nœuds portent déjà des lat/lng dans leurs conditions GEOFENCE, mais aucune vue ne les visualise sur une carte réelle. Pour les jeux indoor, aucun mécanisme de positionnement sur plan n'existe.

Le Studio est un app React + TypeScript, MCP purement fonctionnel (`mcp.ts`), pas de dépendance carte actuelle. MapLibre Native est déjà le choix retenu pour le Player (offline-pack spec).

## Goals / Non-Goals

**Goals:**
- Ajouter un toggle Carte/Graphe dans le Composer pour visualiser les nœuds sur une carte réelle (outdoor) ou un plan (indoor)
- Permettre le positionnement interactif (click + drag) des nœuds
- Fournir un outil de calibration indoor en 2 clics
- Détecter les chevauchements de géofences
- Calculer le bbox automatiquement

**Non-Goals:**
- Édition du graphe depuis la vue carte (la vue carte est complémentaire, pas un remplacement)
- Création de nœuds depuis la vue carte (uniquement positionnement de nœuds existants)
- Rendu des modules mini-jeux dans la vue carte
- Prévisualisation terrain (c'est le rôle de l'écran Prévisualiser)
- Support indoor sans `indoorPlans` configuré (pas de détection automatique)

## Decisions

### D1: Composant MapView comme sous-composant du Composer

**Choix:** `MapView` est un composant React interne au Composer, rendu conditionnellement selon l'état du toggle. Pas de nouvel écran dans la navigation latérale.

**Raison:** La vue carte est une perspective sur les mêmes données, pas un workflow séparé. L'auteur doit pouvoir basculer rapidemenent entre graphe et carte sans perdre la sélection ni l'historique undo/redo.

**Alternatives considérées:**
- Nouvel écran séparé → rejeté : rupture de workflow, perte de contexte
- Overlay flottant → rejeté : trop petit pour être utile, chevauche l'inspecteur

### D2: Composant MapView avec bibliothèque Carte

**Choix:** Utiliser une bibliothèque React pour la carte. Pour le Studio (web), MapLibre GL JS (`maplibre-gl`) est le choix naturel (même provider que le Player natif via MapLibre Native).

**Raison:** MapLibre GL JS est open-source, offline-friendly, supporte les tuiles Vector Tiles, et a une API cohérente avec MapLibre Native. Le Studio peut charger les mêmes tuiles que le Player.

**Alternatives considérées:**
- Leaflet → rejeté : stacks web exclues par la spec offline-pack
- Mapbox GL JS → rejeté : licence incompatible offline
- Canvas natif → rejeté : réinventer la roue, pas de support tiles

### D3: Synchronisation de la sélection entre vues

**Choix:** L'état de sélection (`sel`, `selMulti`) est partagé entre vue graphe et vue carte. La sélection dans une vue est immédiatement visible dans l'autre.

**Raison:** L'auteur doit pouvoir identifier un nœud sur la carte et l'éditer dans l'inspecteur (ou inversement). La désynchronisation causerait de la confusion.

### D4: Calibration indoor en 2 clics

**Choix:** L'outil de calibration fonctionne en mode "calibration" :
1. L'auteur active le mode calibration (bouton dédié)
2. Clique sur point A sur l'image du plan
3. Clique sur point B
4. Saisit la distance en mètres dans un champ modal
5. Le scale est calculé : `scale = distancePixels / distanceMetres`

**Raison:** Simple, intuitif, ne nécessite pas de connaître les coordonnées GPS. L'auteur connaît physiquement la distance entre deux points du plan.

**Alternative considérée:**
- Calibration par lat/lng de deux points → rejeté : trop complexe, nécessite de connaître les coordonnées GPS exactes

### D5: Avertissement chevauchement géofence

**Choix:** Calcul géométrique pur (distance entre centres < somme des rayons) réalisé à chaque rendu de la vue carte. Pas de validation applicative — c'est un avertissement visuel uniquement.

**Raison:** Le chevauchement n'est pas une erreur (deux POI proches sont valides), mais l'auteur doit en être conscient. Pas besoin de bloquer l'export.

### D6: Calcul bbox automatique

**Choix:** Fonction MCP pure `computeBbox(game)` qui retourne `{minLat, minLng, maxLat, maxLng}` à partir de :
- Toutes les positions lat/lng des GEOFENCE
- La bbox de la trace GPX (si parsing disponible)
- Buffer de 200m par défaut

Le résultat est proposé à l'auteur via un modal de confirmation avant application.

**Raison:** Évite à l'auteur de calculer manuellement le bbox. Le modal de confirmation respecte le principe "jamais d'action silencieuse".

## Risks / Trade-offs

- **[Poids de maplibre-gl]** → Le Studio est une app web, maplibre-gl ajoute ~200KB gzippé. Mitigation : lazy loading du composant MapView uniquement quand le toggle est activé.

- **[Tuiles non disponibles en dev]** → En développement local, les tuiles du pack ne sont peut-être pas pré-chargées. Mitigation : fallback sur fond uni + OpenStreetMap en dev (pas en production).

- **[Performance drag sur carte]** → Le drag sur une carte avec tuiles peut être saccadé. Mitigation : utiliser `requestAnimationFrame` pour le rendu, debounce la mise à jour des coordonnées.

- **[Dépendance à indoor-plan-schema]** → La vue indoor dépend des types `indoorPlans` et `node.position` définis dans le change `indoor-plan-schema`. Mitigation : le change `studio-map-view` peut être implémenté en premier pour le mode outdoor, puis étendu au indoor après `indoor-plan-schema`.

## Open Questions

- Le composant MapView doit-il être lazy-loaded (React.lazy) ou toujours monté mais masqué ? Le lazy loading réduit le bundle initial mais complique la synchronisation de la sélection.
- Pour la calibration indoor, le scale doit-il être stocké en pixels/mètre ou en mètres/pixel ? Les deux sont équivalents, mais px/m est plus intuitif pour l'auteur.
