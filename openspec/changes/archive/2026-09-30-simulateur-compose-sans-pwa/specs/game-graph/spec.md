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

## MODIFIED Requirements (vocabulaire écran)

### Requirement: Cycles bornes et rejeu anti-farming
`allowCycle` est une propriete d'arete (condition a `nodeId`), defaut `false`, verifiee a la construction. `onReentry` est une propriete de noeud (`ignore` defaut | `replay`), verifiee a chaque execution. `replay` SHALL exiger `maxReentries` (nombre de rejeux apres la 1ere completion) et `scoreOnReplay` (defaut false : seule la 1ere completion score). Une fois `maxReentries` epuise, tout retrigger retombe en `ignore`.

Le graphe de progression SHALL pouvoir représenter des relations de progression au-delà des simples dépendances d'activation. Les arêtes de progression peuvent être conditionnelles (dépendant d'objets, de variables, de découverte).

#### Scenario: Cycle logique non autorise rejete
- **GIVEN** `A requires B` et `B requires A`, tous deux `allowCycle:false`
- **WHEN** le validateur construit le graphe de dependances
- **THEN** le build est refuse (aucun des deux ne pourrait demarrer)

#### Scenario: Boucle gamebook bornee type Salle du Sage
- **GIVEN** `sage onReentry:replay maxReentries:3 scoreOnReplay:false` et une arete retour `enigme -> sage allowCycle:true`
- **WHEN** le joueur echoue 4 fois et revient une 4e fois
- **THEN** les 3 premiers retours rejouent sans scorer et le 4e est ignore

#### Scenario: Rejeu physique pur sans allowCycle
- **GIVEN** un POI `GEOFENCE` seul sans `nodeId` reference, `onReentry:ignore`
- **WHEN** le joueur quitte puis re-rentre apres `COMPLETED`
- **THEN** l'écran ne se rouvre jamais

#### Scenario: Progression conditionnelle par objet
- **GIVEN** un nœud "C" dépendant de l'obtention de la clé via progression
- **WHEN** le joueur obtient la clé
- **THEN** le nœud "C" devient accessible dans la progression
