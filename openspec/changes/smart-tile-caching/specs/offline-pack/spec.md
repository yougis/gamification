## MODIFIED Requirements

### Requirement: Carte configurable avec fallback

Le fond SHALL être configuré `{provider, bbox, minZoom, maxZoom, attribution, tileStrategy, tileRadiusMeters}` (MapLibre Native), la trace GPX et la boussole SHALL rester utilisables sur
fond uni, et une image statique SHALL servir de fallback si les tuiles manquent.
Stacks web exclues (Leaflet, WebXR), Mapbox par défaut exclu (licence offline).

`tileStrategy` SHALL valoir `fixed` (bbox statique, défaut), `viewport` (auto selon viewport), `radius` (bbox autour des POI avec `tileRadiusMeters`), ou `none` (pas de carte, jeux indoor/purement indoor).

#### Scenario: Tuiles manquantes en grotte

- **GIVEN** une zone sans tuiles pré-chargées
- **WHEN** le joueur ouvre la carte
- **THEN** trace + position + flèche restent lisibles sur fond uni

#### Scenario: Jeu indoor sans téléchargement de tuiles

- **GIVEN** un jeu avec `tileStrategy: "none"` et `global.indoorPlans` configuré
- **WHEN** le pack est généré
- **THEN** aucune tuile n'est téléchargée, le Player affiche uniquement le plan indoor

#### Scenario: Jeu BASIC avec cache radius

- **GIVEN** un jeu avec `tileStrategy: "radius"` et `tileRadiusMeters: 200`
- **WHEN** le pack est généré
- **THEN** seules les tuiles dans un rayon de 200m autour des POI sont pré-chargées

## ADDED Requirements

### Requirement: Calcul bbox automatique

Le Studio SHALL calculer automatiquement la bbox optimale pour le téléchargement des tuiles en fonction de la stratégie sélectionnée :

- `fixed` : bbox statique définie dans `global.map.bbox` (comportement actuel)
- `viewport` : bbox dynamique basée sur la position du joueur au runtime
- `radius` : bbox calculée depuis les positions des POI avec `tileRadiusMeters` de buffer
- `none` : aucune bbox, pas de téléchargement

Le calcul SHALL être réalisé par le Studio lors de l'export (MCP) et le résultat SHALL être inclus dans le manifest du pack.

#### Scenario: bbox calculée automatiquement en mode radius
- **GIVEN** un jeu avec 3 POI aux positions (48.8566, 2.3522), (48.8600, 2.3550), (48.8580, 2.3500) et `tileRadiusMeters: 300`
- **WHEN** le Studio calcule la bbox
- **THEN** la bbox couvre tous les POI avec un buffer de 300m

### Requirement: Pré-chargement adaptatif selon navigation

Le Player SHALL adapter la stratégie de pré-chargement selon le `navigationModel` du jeu :

- `BASIC` : large bbox (tous les POI + 500m buffer) — le joueur se déplace librement
- `GUIDED` : bbox linéaire (séquence des POI + 300m) — le joueur suit un parcours
- `TREASURE_HUNT` : bbox dynamique (POI discoverable + 400m) — le joueur cherche
- `ESCAPE_GAME` : bbox compact (POI + 200m) — le joueur est en zone limitée
- `OPEN_EXPLORATION` : bbox large (tous les POI + 1000m) — exploration libre

#### Scenario: Pré-chargement GUIDED
- **GIVEN** un jeu GUIDED avec 5 POI en séquence
- **WHEN** le Player calcule la bbox de pré-chargement
- **THEN** la bbox est une bande linéaire suivant la séquence des POI avec 300m de buffer

### Requirement: Exclusion des tuiles non nécessaires

Le validateur applicatif SHALL vérifier que les tuiles téléchargées correspondent à la zone pertinente du jeu. Les tuiles hors de la bbox calculée ne SHALL pas être incluses dans le pack.

#### Scenario: Tuiles hors zone exclues
- **GIVEN** un pack avec 100 tuiles dont 20 hors de la bbox calculée
- **WHEN** le validateur controle le pack
- **THEN** les 20 tuiles hors zone sont signalées comme inutiles
