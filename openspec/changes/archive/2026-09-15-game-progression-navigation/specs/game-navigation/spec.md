## Purpose

Définit les modèles de navigation et de présentation fonctionnels du moteur GeoPlay. Les modèles de navigation sont des presets fonctionnels qui déterminent comment le joueur se déplace, découvre les étapes et interagit avec le jeu, indépendamment du moteur d'activation sous-jacent.

## ADDED Requirements

### Requirement: Modèles de navigation fonctionnels

Le moteur SHALL supporter des modèles de navigation en tant que configurations fonctionnelles. Ces modèles sont des presets qui combinent discovery, activation, presentation et progression selon un paradigme donné.

Les modèles de navigation SHALL être :
- `BASIC` — course d'orientation / orientation classique
- `GUIDED` — parcours guidé / diaporama
- `TREASURE_HUNT` — chasse au trésor
- `ESCAPE_GAME` — escape game
- `OPEN_EXPLORATION` — exploration libre

Les modèles sont configurés au niveau du jeu (`global.navigationModel`) et peuvent être combinés dans des jeux hybrides.

#### Scenario: Jeu BASIC
- **GIVEN** un jeu avec `global.navigationModel: "BASIC"`
- **WHEN** le joueur lance la session
- **THEN** le joueur voit une carte, se déplace physiquement vers les POIs, et active les mini-jeux via géofence

#### Scenario: Jeu GUIDED
- **GIVEN** un jeu avec `global.navigationModel: "GUIDED"`
- **WHEN** le joueur lance la session
- **THEN** le joueur suit une séquence linéaire d'étapes, la progression est automatique après complétion, le GPS est facultatif

#### Scenario: Jeu ESCAPE_GAME
- **GIVEN** un jeu avec `global.navigationModel: "ESCAPE_GAME"`
- **WHEN** le joueur lance la session
- **THEN** le joueur dispose d'une boîte à outils, les étapes sont révélées par des indices et l'utilisation d'objets

#### Scenario: Jeu hybride
- **GIVEN** un jeu combinant GPS + inventaire + énigmes
- **WHEN** le joueur lance la session
- **THEN** le joueur peut alterner entre déplacement géographique et résolution d'énigmes dans n'importe quel ordre

### Requirement: Présentation selon le modèle

Le moteur SHALL supporter différentes présentations pour le Player mobile selon le modèle de navigation.

Les modes de présentation SHALL inclure :
- `MAP` : carte numérique avec position et POIs
- `LIST` : liste des étapes
- `STORY` : récit narratif séquentiel
- `CLUE` : affichage d'indices
- `TOOLBOX` : boîte à outils / inventaire
- `TIMELINE` : frise chronologique de progression

Un jeu peut combiner plusieurs présentations simultanément (ex. `MAP + TOOLBOX + CLUE` pour un escape game géolocalisé).

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

### Requirement: Préfixes de référence fonctionnels

Le moteur SHALL définir des préfixes de référence pour chaque modèle de navigation. Un préfixe configure une combinaison de 6 dimensions fonctionnelles : progression, discovery, activation, inventory, effects, presentation.

Chaque préfixe définit une configuration de référence que l'auteur peut sélectionner puis modifier individuellement. La sélection d'un préfixe ne verrouille PAS le jeu dans une configuration figée.

Les préfixes de référence SHALL être :

| Dimension | BASIC | GUIDED | TREASURE_HUNT | ESCAPE_GAME | OPEN_EXPLORATION |
|-----------|-------|--------|---------------|-------------|------------------|
| Progression | GRAPH | SEQUENTIAL | CLUE | GRAPH | GRAPH |
| Discovery | MAP | NEXT | CLUE | CONDITIONAL | MAP |
| Activation | GEOFENCE | AUTO | GEOFENCE | ITEM_REQUIRED | GEOFENCE |
| Inventory | OFF | OFF | ITEM_REQUIRED | ON | OFF |
| Effects | NONE | NONE | REVEAL | GIVE_ITEM/REVEAL | NONE |
| Presentation | MAP | STORY | CLUE+MAP | CLUE+TOOLBOX | MAP |

L'auteur sélectionne un préfixe puis modifie individuellement chaque mécanisme. Le préfixe est un point de départ, pas une contrainte. Les jeux hybrides sont supportés en surchargeant les mécanismes du préfixe.

#### Scenario: Auteur sélectionne ESCAPE_GAME puis modifie la progression
- **GIVEN** un auteur sélectionne le preset ESCAPE_GAME
- **WHEN** il modifie la dimension progression de GRAPH à SEQUENTIAL
- **THEN** le jeu utilise la progression SEQUENTIAL avec les mécanismes ESCAPE_GAME pour les autres dimensions

#### Scenario: Auteur modifie une dimension du preset BASIC
- **GIVEN** le preset BASIC avec Inventory=OFF
- **WHEN** l'auteur ajoute un objet dans le preset
- **THEN** le preset BASIC devient un jeu hybride BASIC + inventaire

### Requirement: Configuration du modèle de navigation

Le jeu SHALL définir `global.navigationModel` et `global.presentation` dans son JSON. Le jeu PEUT également définir `global.preset` pour référencer le préfixe de référence sélectionné.

- `global.navigationModel` : le modèle de navigation (`"BASIC"`, `"GUIDED"`, `"TREASURE_HUNT"`, `"ESCAPE_GAME"`, `"OPEN_EXPLORATION"`)
- `global.presentation` : tableau des modes de présentation (`["MAP"]`, `["STORY"]`, `["CLUE", "MAP"]`, etc.)

Si `global.navigationModel` est absent, la valeur par défaut SHALL être `"BASIC"`.

#### Scenario: Jeu BASIC sans configuration navigation
- **GIVEN** un jeu sans `global.navigationModel`
- **WHEN** le moteur charge le jeu
- **THEN** le modèle par défaut `"BASIC"` est appliqué

#### Scenario: Jeu ESCAPE_GAME avec configuration
- **GIVEN** un jeu avec `global.navigationModel: "ESCAPE_GAME"` et `global.presentation: ["TOOLBOX", "CLUE"]`
- **WHEN** le moteur charge le jeu
- **THEN** le player affiche la boîte à outils et les indices

### Requirement: Navigation dans le Player

Le Player mobile SHALL adapter son interface selon le modèle de navigation configuré.

Le Player SHALL :
- connaître l'état courant du jeu ;
- connaître les étapes accessibles et découvertes ;
- afficher les étapes selon leur état (LOCKED, UNLOCKED, ACTIVE, COMPLETED) ;
- afficher l'inventaire lorsqu'il est utilisé ;
- afficher les indices ;
- afficher la carte lorsque le jeu est géographique ;
- lancer le mini-jeu lorsqu'une étape devient ACTIVE ;
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

### Requirement: Jeux hybrides comme cas nominal

Le moteur SHALL permettre de combiner les mécanismes de navigation et de présentation sans nécessiter de nouveau `GAME_MODE` pour chaque combinaison.

Un jeu hybride est considéré comme un cas nominal et non comme une exception. L'ajout d'un nouveau type de jeu NE DOIT PAS nécessiter de créer systématiquement un nouveau moteur de gameplay.

#### Scenario: Hybride GPS + inventaire
- **GIVEN** un jeu avec navigation BASIC + effets d'inventaire + énigmes
- **WHEN** le joueur se déplace vers un POI et résout une énigme pour obtenir un objet
- **THEN** l'objet est dans l'inventaire et peut débloquer de nouvelles zones

#### Scenario: Configuration flexible
- **GIVEN** un jeu avec `navigationModel: "ESCAPE_GAME"` et `presentation: ["MAP", "TOOLBOX", "CLUE"]`
- **WHEN** le joueur est dans une zone géographique avec une énigme
- **THEN** le joueur voit la carte (pour se localiser), la boîte à outils (pour vérifier ses objets), et l'indice (pour résoudre l'énigme)

### Requirement: Compatibilité avec le cycle d'état existant

Le cycle `LOCKED → UNLOCKED → ACTIVE → COMPLETED` reste valide pour tous les modèles de navigation. La navigation ne SHALL pas imposer un nouveau cycle d'état spécifique à chaque modèle de jeu.

Les mécanismes de transition changent selon le modèle, mais le cycle conceptuel reste identique :
- BASIC : UNLOCKED → ACTIVE via GEOFENCE
- GUIDED : UNLOCKED → ACTIVE automatique après précédent COMPLETED
- ESCAPE_GAME : UNLOCKED → ACTIVE via ITEM_USED
- TREASURE_HUNT : UNLOCKED → ACTIVE via GEOFENCE après résolution d'indice

#### Scenario: Différents mécanismes, même cycle
- **GIVEN** deux jeux, un BASIC et un GUIDED, avec le même nœud
- **WHEN** le nœud passe de UNLOCKED à ACTIVE dans chaque jeu
- **THEN** le cycle d'état est le même, seul le mécanisme de transition diffère
