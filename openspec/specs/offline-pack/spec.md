# offline-pack Specification

## Purpose

Garantit qu'un pack GeoPlay s'installe intègre, se met à jour au différentiel et fait tourner le Jeu sans aucun réseau après téléchargement.

## Requirements

### Requirement: Manifest par fichier faisant foi

Chaque asset SHALL être référencé `{path, version, size, sha256}`. Le manifest
SHALL être la seule source de version et d'intégrité. L'archive pré-tuilée
SHALL être dézippée en worker vers fichiers app + SQLite.

#### Scenario: Archive corrompue localisée

- **GIVEN** un pack de 20 fichiers dont 1 au SHA-256 faux
- **WHEN** le moteur vérifie à l'installation
- **THEN** seul ce fichier est re-téléchargé, les 19 autres sont conservés

### Requirement: Téléchargement vérifié, différentiel, reprenable

Le moteur SHALL vérifier SHA-256 par fichier, ne re-télécharger que les
`version` changées, reprendre après coupure et supporter le background download.
Un pack partiel ou corrompu SHALL rester **non lançable** avec état explicite
(progression %, fichier fautif). La taille totale SHALL être chiffrée et
affichée **avant** téléchargement.

#### Scenario: Coupure puis reprise

- **GIVEN** un téléchargement interrompu à 60 %
- **WHEN** le joueur relance
- **THEN** seuls les fichiers manquants repartent, sans tout reprendre

#### Scenario: Partiel non lançable

- **GIVEN** un pack à 90 % vérifié
- **WHEN** le joueur tente de lancer
- **THEN** le lancement est refusé avec la progression et le fichier manquant

### Requirement: Carte configurable avec fallback

Le fond SHALL être configuré `{provider, bbox, minZoom, maxZoom, attribution}`
(MapLibre Native), la trace GPX et la boussole SHALL rester utilisables sur
fond uni, et une image statique SHALL servir de fallback si les tuiles manquent.
Stacks web exclues (Leaflet, WebXR), Mapbox par défaut exclu (licence offline).

#### Scenario: Tuiles manquantes en grotte

- **GIVEN** une zone sans tuiles pré-chargées
- **WHEN** le joueur ouvre la carte
- **THEN** trace + position + flèche restent lisibles sur fond uni

### Requirement: Progression SQLite persistée

Progression, `randomDraws[sessionId][poolNodeId]` et tirages SHALL vivre en
SQLite avec écriture immédiate, jamais recalculés. Reprendre = même `sessionId`
relit ; nouvelle partie = nouveau `sessionId`.

#### Scenario: Crash entre intro et POI

- **GIVEN** un tirage `pool->c` persisté puis un crash applicatif
- **WHEN** le joueur rouvre avec le même `sessionId`
- **THEN** le tirage est relu, aucun re-tirage, geofencing inchangé
