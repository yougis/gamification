## ADDED Requirements

### Requirement: Pagination joueur des sous-pages

Le player SHALL afficher les sous-pages une par une : swipe horizontal (±40 px, même seuil que le récit INFO) ET bouton « Suivant » (même avancer), bouton « Précédent » dès la 2e page, compteur `page i/N`, « Terminer » sur la dernière page (complétion normale du nœud). Une seule sous-page SHALL être visible à la fois ; un module ne SHALL jamais partager sa page.

#### Scenario: Parcours paginé d'une étape

- **GIVEN** un nœud ACTIVE de 3 sous-pages (module, image, texte)
- **WHEN** le joueur swipe puis touche « Suivant »
- **THEN** il voit les pages 2 puis 3, et « Terminer » sur la 3 complète le nœud

#### Scenario: Étape mono-page inchangée

- **GIVEN** un nœud avec une seule sous-page
- **WHEN** le joueur ouvre l'étape
- **THEN** aucun bouton de navigation n'apparaît et la complétion est immédiate comme avant

### Requirement: Progression reflétant l'avancement

Un widget `progress` (`progressType: "steps"`) affiché dans un contenu paginé SHALL refléter `page courante / total` (fraction + libellé). Hors contenu paginé, son comportement SHALL rester inchangé.

#### Scenario: Progress suivant les pages

- **GIVEN** une étape de 4 sous-pages avec un widget `progress` en header, joueur en page 2
- **WHEN** l'écran se rend
- **THEN** la progression affiche 2/4
