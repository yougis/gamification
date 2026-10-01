## ADDED Requirements

### Requirement: Pagination joueur des sous-pages

Le player (renderer partagé KMP + terminal simulé Studio, jamais la PWA — cible supprimée) SHALL afficher les sous-pages une par une : swipe horizontal (±40 px, même seuil que le récit INFO) ET bouton « Suivant » (même avancer), bouton « Précédent » dès la 2e page, compteur `page i/N`, « Terminer » sur la dernière page (complétion normale du nœud). Une seule sous-page SHALL être visible à la fois ; un module ne SHALL jamais partager sa page.

#### Scenario: Parcours paginé d'une étape
- **GIVEN** un nœud UNLOCKED de 3 sous-pages (module, image, texte), ouvert dans le terminal simu puis le renderer partagé
- **WHEN** le joueur swipe puis touche « Suivant »
- **THEN** il voit les pages 2 puis 3, et « Terminer » sur la 3 complète le nœud, sans event ajouté avant la complétion

#### Scenario: Étape mono-page inchangée
- **GIVEN** un nœud avec une seule sous-page
- **WHEN** le joueur ouvre l'étape
- **THEN** aucun bouton de navigation n'apparaît et la complétion est immédiate comme avant

#### Scenario: Parité Studio/partagé sans PWA
- **GIVEN** l'oracle Sherlock (8 écrans) ouvert en portrait puis paysage
- **WHEN** le découpage `paginateContent` (Studio) et son miroir Kotlin sont comparés
- **THEN** le découpage est identique (≤1 média/page), chaque média tient en entier sans rognage, et aucune iframe/PWA n'est convoquée
