## MODIFIED Requirements

### Requirement: Présentation selon le modèle

Le moteur SHALL supporter différentes présentations pour le Player mobile selon le modèle de navigation.

Les modes de présentation SHALL inclure :
- `MAP` : carte numérique avec position et POIs
- `LIST` : liste des étapes
- `STORY` : récit narratif séquentiel
- `CLUE` : affichage d'indices
- `TOOLBOX` : boîte à outils / inventaire
- `TIMELINE` : frise chronologique de progression
- `HOME` : tableau de bord entre les étapes (temps écoulé, comptes à rebours par POI, états, proposition d'ouverture)

Un jeu peut combiner plusieurs présentations simultanément (ex. `MAP + TOOLBOX + CLUE` pour un escape game géolocalisé, `HOME + MAP + TOOLBOX` pour un jeu d'orientation avec accueil joueur).

Quand `presentation` inclut `HOME`, le player SHALL exposer en permanence une entrée « Accueil » (tab/barre) affichant le tableau de bord, y compris quand une autre vue est ouverte ; l'affichage par défaut (tableau si aucun écran d'étape ouvert) est inchangé. Aller vers ou quitter l'Accueil SHALL ne produire ni transition d'état ni event de progression. Les vues restent exclusives (pas de superposition).

#### Scenario: Présentation MAP pour BASIC
- **GIVEN** un jeu BASIC avec `presentation: ["MAP"]`
- **WHEN** le joueur ouvre l'application
- **THEN** la carte s'affiche avec les POIs éligibles

#### Scenario: Présentation CLUE + MAP pour TREASURE_HUNT
- **GIVEN** un jeu TREASURE_HUNT avec `presentation: ["CLUE", "MAP"]`
- **WHEN** le joueur résout un indice
- **THEN** l'indice suivant s'affiche et la carte révèle la nouvelle zone

#### Scenario: Présentation STORY pour GUIDED
- **GIVEN** un jeu GUIDED avec `presentation: ["STORY"]`
- **WHEN** le joueur complète une étape
- **THEN** l'étape suivante s'affiche dans le récit narratif

#### Scenario: Tableau de bord par défaut avec HOME
- **GIVEN** un jeu avec `presentation: ["HOME", "TOOLBOX"]`
- **WHEN** le joueur est entre deux étapes (aucun écran d'étape ouvert)
- **THEN** le tableau de bord s'affiche par défaut avec le temps écoulé, les POI et l'étape à ouvrir

#### Scenario: Retour à l'Accueil depuis une autre vue
- **GIVEN** un jeu avec `presentation: ["HOME", "MAP"]`, joueur sur la carte avec un écran d'étape refermé
- **WHEN** le joueur touche l'onglet « Accueil »
- **THEN** le tableau de bord s'affiche (temps, POI, étape à ouvrir), sans transition d'état ni event

### Requirement: Navigation dans le Player

Le Player mobile SHALL adapter son interface selon le modèle de navigation configuré.

Le Player SHALL :
- connaître l'état courant du jeu ;
- connaître les étapes accessibles et découvertes ;
- afficher les étapes selon leur état (LOCKED, UNLOCKED, COMPLETED) ;
- afficher l'inventaire lorsqu'il est utilisé ;
- afficher les indices ;
- afficher la carte lorsque le jeu est géographique ;
- lancer le mini-jeu lorsqu'une étape `UNLOCKED` est ouverte par le joueur ;
- afficher les effets produits après une action.

Le Player NE DOIT PAS être obligé d'afficher une carte pour tous les jeux.

#### Scenario: Jeu GUIDED sans carte
- **GIVEN** un jeu GUIDED avec `presentation: ["STORY"]`
- **WHEN** le joueur lance le jeu
- **THEN** aucune carte n'est affichée, seul le récit narratif est visible

#### Scenario: Jeu BASIC avec carte
- **GIVEN** un jeu BASIC avec `presentation: ["MAP"]`
- **WHEN** le joueur ouvre le jeu
- **THEN** la carte s'affiche avec les POIs et le joueur peut se déplacer

## REMOVED Requirements

### Requirement: Compatibilité avec le cycle d'état existant
**Reason**: Le cycle ne comporte plus `ACTIVE` et les transitions ne passent plus par une modale (voir `game-graph` et Requirement ci-dessous).
**Migration**: Voir Requirement Cycle sans ACTIVE par modele.

## ADDED Requirements

### Requirement: Cycle sans ACTIVE par modele

Le cycle `LOCKED → UNLOCKED → COMPLETED` reste valide pour tous les modèles de navigation. La navigation ne SHALL pas imposer un nouveau cycle d'état spécifique à chaque modèle de jeu.

Les mécanismes d'éligibilité changent selon le modèle, mais le cycle conceptuel reste identique :
- BASIC : éligible (`UNLOCKED`) via GEOFENCE
- GUIDED : éligible (`UNLOCKED`) automatique après précédent COMPLETED
- ESCAPE_GAME : éligible (`UNLOCKED`) via ITEM_USED
- TREASURE_HUNT : éligible (`UNLOCKED`) via GEOFENCE après résolution d'indice

#### Scenario: Différents mécanismes, même cycle
- **GIVEN** deux jeux, un BASIC et un GUIDED, avec le même nœud
- **WHEN** le nœud passe de LOCKED à UNLOCKED dans chaque jeu
- **THEN** le cycle d'état est le même, seul le mécanisme d'éligibilité diffère
