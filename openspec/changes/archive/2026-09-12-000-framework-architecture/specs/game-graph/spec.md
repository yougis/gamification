## Purpose

Definit le graphe de jeu GeoPlay (noeuds, activation, etats, latch, cycles, terminaison) que tout Jeu doit respecter.

## ADDED Requirements

### Requirement: Lexique graphe fige

Le systeme SHALL modeliser un Jeu comme un graphe oriente de Noeuds : un Noeud
est une instance d'un Module enregistre, porte ses donnees propres si besoin,
et porte un objet unique `activation {requires[], operator}`. Les donnees
globales (carte, branding, trace GPX display) ne dupliquent jamais les Noeuds
et aucun registre POI parallele ne SHALL exister.

#### Scenario: Noeud lieu+jeu en un

- **GIVEN** un createur definit "POI Parc — Quiz Epoque"
- **WHEN** le Studio exporte le Jeu
- **THEN** le JSON contient un seul Noeud combinant coordonnees d'activation et donnees Quiz, sans noeud LIEU conteneur ni entree POI dupliquee

### Requirement: Activation par noeud avec operateur strict

Le systeme SHALL exiger `activation.requires` (tableau >=1 condition) et
`activation.operator` (`AND|OR`) obligatoire des que `requires` contient >=2
conditions et interdit si <=1. Un JSON a >=2 prerequis sans operateur SHALL
etre invalide a la validation, jamais interprete par defaut.

#### Scenario: Prerequis double sans operateur rejete

- **GIVEN** un Noeud avec 2 conditions et aucun `operator`
- **WHEN** le validateur controle le Jeu
- **THEN** le Jeu est rejete avec une erreur operateur manquant

#### Scenario: Fan-in OU débloque sur une branche

- **GIVEN** un Noeud `FIN` avec `operator: OR` sur `A COMPLETED` et `B COMPLETED`
- **WHEN** `A` passe `COMPLETED` seul
- **THEN** `FIN` devient `UNLOCKED`

### Requirement: Machine a etats avec latch et file ACTIVE

Le systeme SHALL implementer `LOCKED -> UNLOCKED -> ACTIVE -> COMPLETED`.
`UNLOCKED` signifie eligible, `ACTIVE` signifie presente au joueur, avec une
seule modale `ACTIVE` a la fois et une file d'attente. Les declencheurs
environnementaux (`GEOFENCE`, `TIMER`) passent auto en `ACTIVE`, les
declencheurs graphe (`NODE_COMPLETED`, `POOL_DRAWN`) multiples simultanes se
presentent comme un choix, jamais empiles. `activation.latch` par noeud
MUST exister : `true` (defaut propose) = reste `UNLOCKED` une fois debloque
meme si la condition revocable retombe, `false` = retour `LOCKED` des que les
conditions revocables ne sont plus reunies (ex. sortie de geofence). Seules
`GEOFENCE` et le futur `WINDOW` sont revocables. `ACTIVE` SHALL toujours
latcher : une modale ouverte ne se ferme jamais a la sortie de zone.

#### Scenario: Latch conserve l'eligibilite hors zone

- **GIVEN** un POI `latch:true` devenu `UNLOCKED` en geofence
- **WHEN** le joueur sort du rayon avant d'ouvrir la modale
- **THEN** le Noeud reste `UNLOCKED` et presentable

#### Scenario: Suivi desactive hors zone

- **GIVEN** un POI `latch:false` devenu `UNLOCKED` en geofence
- **WHEN** le joueur sort du rayon avec hysteresis depassee
- **THEN** le Noeud retourne `LOCKED` et sort de la file d'attente

#### Scenario: Modale ouverte survit a la sortie

- **GIVEN** un Quiz `ACTIVE` (modale ouverte)
- **WHEN** le joueur recule de 3 m et sort du rayon
- **THEN** la modale reste ouverte jusqu'a abandon ou completion

#### Scenario: Concurrence sans empilement

- **GIVEN** un Quiz `ACTIVE` et un second geofence qui devient vrai
- **WHEN** le moteur evalue les activations
- **THEN** le second Noeud reste en file `UNLOCKED` sans ouvrir de seconde modale

### Requirement: Cycles bornes et rejeu anti-farming

`allowCycle` est une propriete d'arete (condition a `nodeId`), defaut `false`,
verifiee a la construction. `onReentry` est une propriete de noeud
(`ignore` defaut | `replay`), verifiee a chaque execution. `replay` SHALL
exiger `maxReentries` (nombre de rejeux apres la 1ere completion) et
`scoreOnReplay` (defaut false : seule la 1ere completion score). Une fois
`maxReentries` epuise, tout retrigger retombe en `ignore`.

#### Scenario: Cycle logique non autorise rejete

- **GIVEN** `A requires B` et `B requires A`, tous deux `allowCycle:false`
- **WHEN** le validateur construit le graphe de dependances
- **THEN** le build est refuse (aucun des deux ne pourrait demarrer)

#### Scenario: Boucle gamebook bornee type Salle du Sage

- **GIVEN** `sage onReentry:replay maxReentries:3 scoreOnReplay:false` et une
  arete retour `enigme -> sage allowCycle:true`
- **WHEN** le joueur echoue 4 fois et revient une 4e fois
- **THEN** les 3 premiers retours rejouent sans scorer et le 4e est ignore

#### Scenario: Rejeu physique pur sans allowCycle

- **GIVEN** un POI `GEOFENCE` seul sans `nodeId` reference, `onReentry:ignore`
- **WHEN** le joueur quitte puis re-rentre apres `COMPLETED`
- **THEN** la modale ne se rouvre jamais

### Requirement: Terminaison explicite avec isEnding

Le Jeu SHALL contenir au moins un Noeud `isEnding:true` et est termine
exactement quand un `isEnding` passe `COMPLETED`, jamais par absence de
noeuds activables. Le validateur SHALL verifier l'atteignabilite d'au moins
un `isEnding` depuis le depart sous hypothese explicite d'environnement
favorable (GEOFENCE/TIMER supposes pouvoir devenir vrais, jamais une preuve
d'execution). `RANDOM_POOL` et `operator:OR` comptent comme chemins
alternatifs. Chaque candidat de pool SHALL individuellement atteindre un
`isEnding`.

#### Scenario: Reference 5 POI valide

- **GIVEN** START -> POOL (1/5 parmi A|B|C|D|E, GEOFENCE si tire) -> FIN `isEnding`
- **WHEN** le validateur controle chaque candidat A..E vers FIN
- **THEN** le Jeu est accepte car les 5 chemins existent

#### Scenario: AND sur branches exclusives direct rejete

- **GIVEN** `FIN operator:AND` sur `A COMPLETED` et `B COMPLETED`, A et B
  candidats distincts d'un meme pool `drawCount:1`
- **WHEN** le validateur controle la terminaison
- **THEN** le Jeu est rejete comme structurellement inatteignable (cas direct)
