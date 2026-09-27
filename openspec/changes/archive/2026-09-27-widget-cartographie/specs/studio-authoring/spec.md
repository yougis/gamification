## ADDED Requirements

### Requirement: Canvas auteur du widget carte

Le canvas WYSIWYG SHALL rendre le widget `map` en aperçu statique et non interactif, en réutilisant le moteur carto de la vue Composer (fond tuiles/plan/uni, marqueurs aux positions, cercles) : l'auteur SHALL voir la carte configurée sans ouvrir le panneau de propriétés. L'aperçu SHALL NE contenir aucune mécanique joueur : aucune sélection persistante, aucun volet fonctionnel, aucun bouton actif — la mécanique vit exclusivement dans le renderer joueur. Sans configuration de carte (`global.map` ni `indoorPlans`), l'aperçu SHALL afficher l'état fond uni avec un rappel non bloquant. Le volet composé SHALL être prévisualisé avec le POI courant du canvas (ou le premier éligible à t=0).

#### Scenario: Aperçu statique fidèle

- **GIVEN** un widget carte (`source steps`, fond tuiles) dans un écran
- **WHEN** le canvas affiche l'écran
- **THEN** fond, marqueurs et cercles sont visibles et aucun clic ne déclenche de sélection ni de volet

#### Scenario: Sans carte configurée

- **GIVEN** un widget carte dans un jeu sans `global.map` ni `indoorPlans`
- **WHEN** le canvas affiche l'écran
- **THEN** le fond uni s'affiche avec un rappel « carte non configurée », sans erreur ni blocage

### Requirement: Panneau de propriétés carte

Le panneau de propriétés du widget carte SHALL exposer : la source (`kind: steps` + filtre `discovered`/`all` avec mention d'éventement pour `all`), le fond (choix parmi les sources du pack : tuiles / plan indoor / uni), les icônes par état (`locked`, `unlocked`, `active`, `completed`, avec réinitialisation unitaire aux défauts), et le contenu du volet (édition des widgets strate 1 comme tout contenu de zone). Chaque action SHALL passer par une opération MCP nommée et journalisée (undo/redo). Un fond réseau SHALL être impossible à saisir (choix fermé, pas de champ libre).

#### Scenario: Fond choisi sans JSON

- **GIVEN** un widget carte en fond tuiles
- **WHEN** l'auteur choisit « fond uni » dans le panneau
- **THEN** le JSON porte `background: "solid"` via l'opération nommée, annulable par undo

#### Scenario: Icône réinitialisée

- **GIVEN** une icône `locked` personnalisée
- **WHEN** l'auteur active le retour au défaut sur ce seul champ
- **THEN** l'icône retombe sur le défaut, les autres réglages sont inchangés
