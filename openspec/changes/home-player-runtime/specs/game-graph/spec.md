## MODIFIED Requirements

### Requirement: Machine a etats avec latch et file ACTIVE

Le système SHALL implementer `LOCKED -> UNLOCKED -> COMPLETED` en une ecriture sur Valider. `UNLOCKED` signifie eligible et ouvrable en mode jouable, `COMPLETED` signifie valide. La file d'eligibles SHALL etre une suggestion d'ouverture (tete proposee), jamais une modale imposee. Aucun etat `ACTIVE` SHALL exister ; toute reference a `ACTIVE` dans les scenarios ci-dessous se lit comme `etape ouverte en mode jouable`.

#### Scenario: Latch conserve l'eligibilite hors zone
- **GIVEN** un POI `latch:true` devenu `UNLOCKED` en geofence
- **WHEN** le joueur sort du rayon avant d'ouvrir l'etape
- **THEN** le Noeud reste `UNLOCKED` et presentable

#### Scenario: Suivi desactive hors zone
- **GIVEN** un POI `latch:false` devenu `UNLOCKED` en geofence
- **WHEN** le joueur sort du rayon avec hysteresis depassee
- **THEN** le Noeud retourne `LOCKED` et sort de la file de suggestion

#### Scenario: Modale ouverte survit a la sortie
- **GIVEN** un Quiz ouvert en mode jouable
- **WHEN** le joueur recule de 3 m et sort du rayon
- **THEN** l'etape reste ouverte jusqu'a validation ou abandon (snapshot `t0` + droit a finir, flag `hors-delai` si expire)

#### Scenario: Concurrence sans empilement
- **GIVEN** un Quiz ouvert en mode jouable et un second geofence qui devient vrai
- **WHEN** le moteur evalue les activations
- **THEN** le second Noeud reste suggere en file sans ouverture auto, jamais deux etapes a la fois

### Requirement: Cycles bornes et rejeu anti-farming

`allowCycle` est une propriete d'arete (condition a `nodeId`), defaut `false`, verifiee a la construction. `onReentry` est une propriete de noeud (`ignore` defaut | `replay`), verifiee a chaque execution. `replay` SHALL exiger `maxReentries` (nombre de rejeux apres la 1ere completion) et `scoreOnReplay` (defaut false : seule la 1ere completion score). Abandonner une tentative jouable SHALL consommer le budget. Les effets SHALL s'appliquer une seule fois par defaut. Une fois `maxReentries` epuise, tout retrigger retombe en relecture sans ecriture.

Le graphe de progression SHALL pouvoir représenter des relations de progression au-delà des simples dépendances d'activation. Les arêtes de progression peuvent être conditionnelles (dépendant d'objets, de variables, de découverte).

#### Scenario: Cycle logique non autorise rejete
- **GIVEN** `A requires B` et `B requires A`, tous deux `allowCycle:false`
- **WHEN** le validateur construit le graphe de dependances
- **THEN** le build est refuse (aucun des deux ne pourrait demarrer)

#### Scenario: Boucle gamebook bornee type Salle du Sage
- **GIVEN** `sage onReentry:replay maxReentries:3 scoreOnReplay:false` et une arete retour `enigme -> sage allowCycle:true`
- **WHEN** le joueur echoue 4 fois et revient une 4e fois
- **THEN** les 3 premiers retours rejouent sans scorer et le 4e est en relecture sans ecriture

#### Scenario: Rejeu physique pur sans allowCycle
- **GIVEN** un POI `GEOFENCE` seul sans `nodeId` reference, `onReentry:ignore`
- **WHEN** le joueur quitte puis re-rentre apres `COMPLETED`
- **THEN** la vue s'ouvre en relecture sans ecriture, jamais en rejeu

#### Scenario: Progression conditionnelle par objet
- **GIVEN** un nœud "C" dépendant de l'obtention de la clé via progression
- **WHEN** le joueur obtient la clé
- **THEN** le nœud "C" devient accessible dans la progression
