# studio-map-view Specification

## Purpose

Couche de visualisation carte/plan dans le Composer GeoPlay, permettant à l'auteur de visualiser et positionner les nœuds sur une carte géographique (outdoor) ou un plan d'étage (indoor), avec interaction directe drag/click.

## Requirements

### Requirement: Toggle Carte/Plan dans le Composer

Le Composer SHALL offrir un toggle entre la vue graphe et la vue carte/plan. Le toggle SHALL être visible en permanence dans la barre d'outils du Composer. L'état du toggle SHALL persister pendant la session d'édition (pas entre sessions).

Le mode affiché SHALL déterminer automatiquement :
- **Outdoor** (jeu avec `global.map`) : la vue carte affiche un fond MapLibre avec les tuiles du pack
- **Indoor** (jeu avec `global.indoorPlans`) : la vue plan affiche l'image du plan actif en fond

#### Scenario: Toggle vers vue carte outdoor
- **GIVEN** un jeu avec `global.map` configuré
- **WHEN** l'auteur clique sur le toggle Carte
- **THEN** le fond du Composer affiche MapLibre avec les tuiles du pack, les nœuds sont affichés à leurs positions lat/lng

#### Scenario: Toggle vers vue plan indoor
- **GIVEN** un jeu avec `global.indoorPlans` configuré
- **WHEN** l'auteur clique sur le toggle Plan
- **THEN** le fond du Composer affiche l'image du plan actif, les nœuds sont affichés à leurs positions (x, y)

#### Scenario: Toggle retourne au graphe
- **GIVEN** le Composer en vue carte/plan
- **WHEN** l'auteur clique sur le toggle Graphe
- **THEN** le Composer revient à la vue graphe avec les mêmes nœuds sélectionnés

### Requirement: Rendu outdoor — carte MapLibre

La vue carte outdoor SHALL afficher :
- Fond MapLibre avec les tuiles du pack (provider, bbox, minZoom, maxZoom depuis `global.map`)
- Marqueurs POI aux positions lat/lng des nœuds ayant des conditions GEOFENCE
- Cercles de géofence avec le rayon (`radiusMeters`) de chaque condition GEOFENCE
- Trace GPX en polyline si disponible dans le pack
- Le fond SHALL basculer sur "fond uni" si les tuiles sont absentes (fallback existant dans `selectFond`)

#### Scenario: Affichage des POI sur la carte
- **GIVEN** un jeu outdoor avec 3 nœuds ayant des conditions GEOFENCE
- **WHEN** l'auteur ouvre la vue carte
- **THEN** les 3 POI sont affichés avec leur marqueur et leur cercle de géofence

#### Scenario: Tuiles absentes — fond uni
- **GIVEN** un jeu outdoor sans tuiles pré-chargées
- **WHEN** l'auteur ouvre la vue carte
- **THEN** le fond est uni, les marqueurs et cercles restent visibles

### Requirement: Rendu indoor — plan d'étage

La vue plan indoor SHALL afficher :
- L'image du plan actif (`indoorPlans[].image`) en fond
- Marqueurs nœuds aux positions (x, y) converties en pixels via le `scale` du plan
- Sélecteur d'étages (tabs) si plusieurs plans existent, permettant de basculer entre les étages
- L'indicateur d'étage courant SHALL être visible en permanence

#### Scenario: Affichage des nœuds sur le plan
- **GIVEN** un jeu indoor avec 4 nœuds sur le plan RDC
- **WHEN** l'auteur ouvre la vue plan
- **THEN** les 4 nœuds sont affichés à leurs positions (x, y) sur l'image du plan

#### Scenario: Sélection d'étage
- **GIVEN** un jeu indoor avec 3 étages (RDC, Étage 1, Étage 2)
- **WHEN** l'auteur clique sur l'onglet "Étage 1"
- **THEN** le fond affiche l'image du plan Étage 1 et les nœuds de cet étage

### Requirement: Placement de nœuds par click

L'auteur SHALL pouvoir placer un nœud en cliquant sur la carte/plan. Le click SHALL définir les coordonnées du nœud :
- **Outdoor** : le click définit `lat`/`lng` sur la condition GEOFENCE du nœud sélectionné
- **Indoor** : le click définit `position.x`/`position.y` du nœud sélectionné

Si aucun nœud n'est sélectionné, le click ne fait rien (pas de création automatique de nœud).

#### Scenario: Click outdoor définit lat/lng
- **GIVEN** un nœud sélectionné sans coordinates GEOFENCE
- **WHEN** l'auteur clique sur un point de la carte
- **THEN** les coordonnées lat/lng du click sont appliquées à la condition GEOFENCE du nœud

#### Scenario: Click indoor définit x/y
- **GIVEN** un nœud sélectionné sans position
- **WHEN** l'auteur clique sur un point du plan
- **THEN** les coordonnées (x, y) du click sont appliquées à la position du nœud

### Requirement: Repositionnement par drag

L'auteur SHALL pouvoir déplacer un nœud en le glissant sur la carte/plan. Le drag SHALL mettre à jour les coordonnées en temps réel :
- **Outdoor** : `lat`/`lng` de la condition GEOFENCE
- **Indoor** : `position.x`/`position.y`

Le drag SHALL fonctionner uniquement sur les nœuds affichés (pas sur le fond).

#### Scenario: Drag d'un POI outdoor
- **GIVEN** un nœud avec GEOFENCE à (48.01, 2.01)
- **WHEN** l'auteur glisse le marqueur vers (48.02, 2.02)
- **THEN** les coordonnées GEOFENCE du nœud sont mises à jour à (48.02, 2.02)

#### Scenario: Drag d'un nœud indoor
- **GIVEN** un nœud avec position (5.0, 3.0) sur le plan RDC
- **WHEN** l'auteur glisse le marqueur vers (10.0, 7.0)
- **THEN** la position du nœud est mise à jour à (10.0, 7.0)

### Requirement: Calibration indoor en 2 clics

Le Studio SHALL fournir un outil de calibration pour les plans indoor. L'auteur SHALL :
1. Cliquer sur un premier point connu sur l'image du plan (point A)
2. Cliquer sur un deuxième point connu (point B)
3. Saisir la distance en mètres entre les deux points

Le système SHALL calculer automatiquement le `scale` (pixels par mètre) du plan à partir de la distance entre les deux points cliqués et de la distance en mètres saisie.

#### Scenario: Calibration réussie
- **GIVEN** un plan indoor sans scale défini
- **WHEN** l'auteur clique sur deux points distants de 200 pixels, puis saisit "10 mètres"
- **THEN** le scale est calculé à 20 px/m et appliqué au plan

#### Scenario: Calibration avec points identiques
- **GIVEN** un plan indoor
- **WHEN** l'auteur clique deux fois au même endroit
- **THEN** le système refuse la calibration avec un message d'erreur "Les deux points doivent être distincts"

### Requirement: Avertissement chevauchement géofence

La vue carte outdoor SHALL afficher un avertissement visuel lorsque deux géofences se chevauchent (cercles qui se recoupent). L'avertissement SHALL être persistant (pas seulement au hover) et SHALL identifier les nœuds concernés.

#### Scenario: Deux géofences se chevauchent
- **GIVEN** deux nœuds avec GEOFENCE à (48.01, 2.01, rayon 30m) et (48.015, 2.015, rayon 25m)
- **WHEN** l'auteur ouvre la vue carte
- **THEN** un avertissement jaune s'affiche indiquant que les géofences se chevauchent, avec les IDs des deux nœuds

#### Scenario: Géofences éloignées — pas d'avertissement
- **GIVEN** deux nœuds avec GEOFENCE à (48.01, 2.01) et (48.05, 2.05)
- **WHEN** l'auteur ouvre la vue carte
- **THEN** aucun avertissement de chevauchement

### Requirement: Calcul automatique du bbox

Le Studio SHALL pouvoir calculer automatiquement le `global.map.bbox` à partir des positions réelles des POI et de la trace GPX. Le calcul SHALL inclure :
- Toutes les positions lat/lng des nœuds avec GEOFENCE
- La bbox de la trace GPX (si disponible)
- Un buffer configurable (défaut : 200m)

Le bbox calculé SHALL être proposé à l'auteur avant application (pas appliqué silencieusement).

#### Scenario: Bbox calculé depuis les POI
- **GIVEN** 5 nœuds avec GEOFENCE entre (48.01, 2.01) et (48.05, 2.05)
- **WHEN** l'auteur lance le calcul de bbox
- **THEN** le bbox proposé couvre toutes les positions avec un buffer de 200m, et l'auteur peut confirmer ou annuler

### Requirement: Indicateur d'état des nœuds sur la carte

Les marqueurs de nœuds sur la carte/plan SHALL refléter leur état dans la machine à états :
- `LOCKED` : marqueur gris, désactivé
- `UNLOCKED` : marqueur coloré, prêt
- `ACTIVE` : marqueur animé (pulsation)
- `COMPLETED` : marqueur avec checkmark

L'indicateur d'état SHALL être calculé en temps réel à partir de l'état du jeu (mode preview).

#### Scenario: Nœud completed sur la carte
- **GIVEN** un nœud en état COMPLETED
- **WHEN** l'auteur affiche la vue carte
- **THEN** le marqueur affiche un checkmark vert
