## ADDED Requirements

### Requirement: Aperçu puzzle du canvas avec image résolue

Dans le canvas de l'écran (vue auteur, pas le panneau de propriétés), l'aperçu du module PUZZLE SHALL afficher l'image source définie dans les paramètres du module, découpée en `tileRows` × `tileCols` tuiles affichées dans un ordre mélangé, exactement comme l'aperçu du panneau. L'URL de l'image SHALL être résolue dans le contexte du Studio (même mécanisme que le panneau de propriétés) : une image configurée SHALL être visible dans le canvas, jamais un cadre vide. Sans image source, l'état vide incitatif existant SHALL être conservé. L'aperçu SHALL rester statique et non interactif.

#### Scenario: Image configurée visible mélangée

- **GIVEN** un nœud PUZZLE avec image source et découpe 3×3
- **WHEN** l'auteur ouvre son écran dans le canvas
- **THEN** 9 tuiles d'image sont visibles dans un ordre mélangé (pas 1 à 9 en ordre, pas un cadre vide)

#### Scenario: Aperçu sans image inchangé

- **GIVEN** un nœud PUZZLE sans image source
- **WHEN** l'auteur ouvre son écran dans le canvas
- **THEN** l'état vide « aucune image — cliquez pour configurer » s'affiche
