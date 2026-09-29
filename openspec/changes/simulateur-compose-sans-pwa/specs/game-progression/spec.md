## REMOVED Requirements

### Requirement: Séparation des responsabilités
**Reason**: Le corps et les scenarios sont reecrits sans `ACTIVE` (voir Requirement ci-dessous).
**Migration**: Voir Requirement Separation sans ACTIVE.

## ADDED Requirements

### Requirement: Separation sans ACTIVE

La découverte, l'activation, la progression et la présentation SHALL être conceptuellement indépendantes.

- Une étape visible n'est pas nécessairement activable
- Une étape activable n'est pas nécessairement ouverte
- La manière dont une étape est affichée ne SHALL pas déterminer la logique fonctionnelle de son activation
- La navigation ne SHALL pas imposer un nouveau cycle d'état spécifique à chaque modèle de jeu

Le cycle fonctionnel de référence reste `LOCKED → UNLOCKED → COMPLETED`.

#### Scenario: Game narratif — activation automatique
- **GIVEN** un jeu narratif où l'éligibilité suit automatiquement la complétion précédente
- **WHEN** le joueur complète l'étape précédente
- **THEN** la prochaine étape devient `UNLOCKED` sans action physique du joueur

#### Scenario: Escape game — activation par objet
- **GIVEN** un escape game où l'éligibilité nécessite ITEM_USED
- **WHEN** le joueur utilise le bon objet sur le nœud
- **THEN** le nœud devient `UNLOCKED`

## MODIFIED Requirements

### Requirement: Compatibilité avec les jeux existants

Un jeu BASIC existant basé sur `TIMER → POOL_DRAWN → GEOFENCE → NODE_COMPLETED` SHALL continuer à fonctionner sans modification fonctionnelle. Les nouvelles propriétés (discovery, effects, inventory) sont optionnelles et n'affectent pas les jeux qui ne les utilisent pas.

#### Scenario: Jeu BASIC existant inchangé
- **GIVEN** le fichier `game-5poi.json` existant sans propriétés discovery/effects/inventory
- **WHEN** le moteur charge le jeu
- **THEN** tous les nœuds fonctionnent comme avant (GEOFENCE → COMPLETED via UNLOCKED)

#### Scenario: Jeu existant avec discovery par défaut
- **GIVEN** un jeu existant sans configuration `discovery` sur les nœuds
- **WHEN** le moteur charge le jeu
- **THEN** tous les nœuds ont `discovery: {mode: VISIBLE_NOW}` par défaut
