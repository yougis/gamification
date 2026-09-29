## ADDED Requirements

### Requirement: Machine a etats avec latch et sans ACTIVE

Le système SHALL implementer `LOCKED -> UNLOCKED -> COMPLETED`. `UNLOCKED` signifie eligible et presentable au joueur, sans etat intermediaire ni modale imposee ni file d'attente : plusieurs noeuds peuvent etre `UNLOCKED` simultanement et le joueur choisit librement lequel ouvrir.

#### Scenario: Latch conserve l'eligibilite hors zone
- **GIVEN** un POI `latch:true` devenu `UNLOCKED` en geofence
- **WHEN** le joueur sort du rayon avant d'ouvrir l'ecran
- **THEN** le Noeud reste `UNLOCKED` et presentable

#### Scenario: Suivi desactive hors zone
- **GIVEN** un POI `latch:false` devenu `UNLOCKED` en geofence
- **WHEN** le joueur sort du rayon avec hysteresis depassee
- **THEN** le Noeud retourne `LOCKED`

#### Scenario: Ecran ouvert survit a la sortie
- **GIVEN** un Quiz ouvert par le joueur (ecran affiche)
- **WHEN** le joueur recule de 3 m et sort du rayon
- **THEN** l'ecran reste affiche jusqu'a abandon ou completion

#### Scenario: Concurrence sans empilement impose
- **GIVEN** un Quiz ouvert et un second geofence qui devient vrai
- **WHEN** le moteur evalue les activations
- **THEN** le second Noeud devient `UNLOCKED` et le joueur choisit librement, sans file imposee

## REMOVED Requirements

### Requirement: Machine a etats avec latch et file ACTIVE
**Reason**: Plus d'etat `ACTIVE`, plus de modale imposee, plus de file d'attente (voir Requirement Machine a etats avec latch et sans ACTIVE).
**Migration**: Les scenarios modale/file sont remplaces par leurs equivalents sans `ACTIVE` ci-dessus.
