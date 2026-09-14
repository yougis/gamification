## Why

Le moteur GeoPlay actuel est principalement orienté vers un modèle de jeu de type **BASIC / course d'orientation** : le joueur se déplace sur une carte, active des POIs via géofence, et lance des mini-jeux. Ce fonctionnement doit être conservé.

Le besoin est d'élargir le moteur afin qu'un même jeu puisse fonctionner selon différents modèles de progression et de navigation : parcours guidé / diaporama, chasse au trésor, escape game, exploration libre, ou jeux hybrides combinant plusieurs mécanismes. Le système actuel confond la navigation avec l'activation, rendant difficile la prise en charge de modèles où le GPS n'est pas le déclencheur principal.

## What Changes

- Ajout d'une couche de **progression** fonctionnelle séparant comment le joueur avance dans le jeu (séquentiel, branché, libre, conditionnel)
- Ajout d'une couche de **discovery** décrivant comment une étape devient connue du joueur (indépendante de l'activation)
- Ajout d'une couche **effects** permettant à une étape de produire des changements d'état (donner/retirer des objets, révéler des étapes, modifier des variables)
- Ajout d'un système d'**inventaire / boîte à outils** pour les objets, outils et indices
- Ajout de **modèles de navigation** en tant que presets fonctionnels (BASIC, GUIDED, TREASURE HUNT, ESCAPE GAME, OPEN EXPLORATION)
- Définition de **préfixes de référence** : chaque preset configure une combinaison de 6 mécanismes (progression, discovery, activation, inventory, effects, presentation) comme point de départ modifiable
- **Select-then-modify** : l'auteur sélectionne un preset puis modifie individuellement chaque mécanisme — un preset ne verrouille pas le jeu dans une configuration figée
- **BREAKING** : Les nœuds du graphe doivent pouvoir porter de nouvelles propriétés (discovery, effects, inventory refs) sans casser les jeux existants
- **BREAKING** : Les nœuds du graphe doivent pouvoir porter de nouvelles propriétés (discovery, effects, inventory refs) sans casser les jeux existants
- Extension des conditions d'activation pour supporter de nouveaux types (ITEM_REQUIRED, ITEM_USED, CODE_INPUT, etc.)
- Extension du player pour supporter différentes présentations (MAP, LIST, STORY, CLUE, TOOLBOX)

## Capabilities

### New Capabilities
- `game-progression`: Modèle fonctionnel de progression, discovery, effects, inventaire et état du jeu — séparation des responsabilités entre comment le joueur avance, découvre, active et produit des effets
- `game-navigation`: Modèles de navigation et présentation (BASIC, GUIDED, TREASURE HUNT, ESCAPE GAME, OPEN EXPLORATION) — presets fonctionnels configurables
- `game-inventory`: Système d'inventaire pour objets, outils et indices — obtention, utilisation, consommation, et vérification de possession

### Modified Capabilities
- `game-graph`: Les nœuds doivent pouvoir porter des propriétés de discovery, effects et références d'inventaire en plus des champs existants (activation, latch, onReentry)
- `game-triggers`: Extension de l'enum des conditions pour inclure de nouveaux types fonctionnels (ITEM_REQUIRED, ITEM_USED, CODE_INPUT, CLUE_RESOLVED)
- `viewer-orchestrator`: Ajout de modes de présentation (MAP, LIST, STORY, CLUE, TOOLBOX) et de la logique de sélection selon le modèle de navigation
- `module-registry`: Les modules doivent pouvoir déclarer leur besoin d'inventaire et leur comportement dans les modèles de navigation non-BASIC

## Impact

- **Studio MCP** : nouvelles opérations pour configurer progression, discovery, effects, inventaire, presets ; le canvas doit pouvoir afficher les relations fonctionnelles entre étapes
- **Runtime natif** : le moteur d'évaluation doit intégrer les couches discovery et effects ; le player doit pouvoir basculer entre modes de présentation ; le moteur doit supporter la sélection et la personnalisation de presets
- **Schéma JSON** : ajout de champs optionnels sur les nœuds (discovery, effects, inventory) — compatible avec les jeux existants qui ne les utilisent pas
- **Validateur applicatif** : vérification de la cohérence des graphes de progression et des conditions d'activation étendues
- **Offline-first** : l'inventaire et la progression doivent persister en SQLite comme le système actuel
- **Aucune connexion réseau requise** : tous les modèles de navigation fonctionnent en offline-first
- **Dépendance** : change `100-define-game-schema` (schéma) et `000-framework-architecture` (graphe) déjà archivés
