## ADDED Requirements

### Requirement: Toggle activer home dans le volet des étapes

Le volet des étapes SHALL exposer, à côté des actions d'ajout d'étape, un bouton bascule « activer home » reflétant la présence de `HOME` dans `global.presentation`. Activer SHALL poser `HOME` (via `setPresentation`, un pas d'undo) et faire apparaître l'entrée d'aperçu ; désactiver SHALL retirer `HOME` et masquer l'entrée. Le bouton SHALL porter l'état actif et une infobulle explicite ; il est inopérant en lecture seule.

#### Scenario: Activation depuis le volet

- **GIVEN** un jeu sans `HOME`, volet des étapes affiché
- **WHEN** l'auteur active le toggle
- **THEN** `global.presentation` contient `HOME` (annulable par undo) et l'entrée d'aperçu apparaît en tête du volet

#### Scenario: Désactivation masque l'entrée

- **GIVEN** un jeu avec `HOME`, entrée d'aperçu visible
- **WHEN** l'auteur désactive le toggle
- **THEN** `HOME` est retiré et l'entrée disparaît, le reste du jeu est inchangé

### Requirement: Entrée d'aperçu écran global séparée des étapes

Quand `HOME` est présent, le volet des étapes SHALL afficher en tête une section épinglée « écran global — Accueil » visuellement distincte de la liste (pas de case de sélection, pas de suppression, pas de duplication). Cette entrée SHALL ne jamais devenir un nœud : aucune arête, aucune présence au graphe, ignorée par la validation et l'export. Un clic SHALL la sélectionner comme aperçu courant (pseudo-sélection exclusive avec la sélection de nœud) ; sélectionner un nœud SHALL la désélectionner.

#### Scenario: Clic sans pollution du graphe

- **GIVEN** l'entrée d'aperçu affichée avec 5 nœuds au graphe
- **WHEN** l'auteur clique l'entrée
- **THEN** l'aperçu est montré, le graphe compte toujours 5 nœuds sans arête ajoutée, la validation ne voit rien de nouveau

#### Scenario: Mini-aperçu statique à t=0

- **GIVEN** l'entrée d'aperçu affichée
- **WHEN** l'auteur la regarde sans essai en cours
- **THEN** temps 00:00, POI listés avec états initiaux et rebours à plein délai, proposition calquée sur le premier éligible à t=0

### Requirement: Aperçu visuel branché sur l'essai

L'écran Prévisualiser SHALL rendre le tableau de bord visuellement à partir de l'état d'essai courant : temps écoulé = temps simulé, comptes à rebours recalculés à chaque tick simulé, états relus après chaque complétion, proposition = tête de file réelle. L'aperçu SHALL être en lecture seule (aucune écriture JSON ni simu depuis l'aperçu ; jouer passe par les contrôles d'essai existants).

#### Scenario: Rebours qui défilent et états qui changent

- **GIVEN** un essai avec un POI `TIMER 600s` et `baker` complété pendant l'essai
- **WHEN** l'auteur avance le temps simulé puis consulte l'aperçu
- **THEN** le rebours a diminué d'autant et `baker` s'affiche « fait », sans aucune action sur l'aperçu lui-même
