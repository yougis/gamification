## ADDED Requirements

### Requirement: Écran Modules avec éditeur 7-erreurs

Le Studio SHALL offrir un écran « Modules » dans la navigation, hébergeant l'éditeur de zones du 7-erreurs en grand format : sélecteur du nœud DIFFERENCE_GAME (pré-sélectionné si deep-link), image source à son ratio réel occupant l'espace, calque de zones en %, outils rectangle et polygone, liste + suppression, le tout via l'opération nommée existante (undo natif). L'éditeur SHALL NE PAS vivre dans Relire : l'overlay de Relire reste en lecture seule (validation humaine) avec le même rendu proportionné.

#### Scenario: Édition grand format depuis le détail
- **GIVEN** un nœud 7-erreurs avec 2 zones, auteur dans le détail
- **WHEN** il touche « Éditer les zones »
- **THEN** l'écran Modules s'ouvre sur ce nœud, l'image est à son ratio, les 2 zones sont tracées, et un polygone ajouté persiste via undo

#### Scenario: Relire ne modifie rien
- **GIVEN** l'overlay Relire d'un 7-erreurs affiché au ratio réel
- **WHEN** l'auteur clique sur une zone
- **THEN** rien n'est modifié (lecture seule), seul l'écran Modules édite

### Requirement: Aperçu réduit et renvoi dans le détail

Le volet détail du Composer SHALL afficher pour un nœud DIFFERENCE_GAME un aperçu réduit STRICTEMENT proportionné à la source (ratio des dimensions naturelles, taille réduite pour tenir dans le volet, zones en %) avec le compteur de zones, plus un bouton « Éditer les zones » renvoyant vers l'écran Modules avec le nœud sélectionné (deep-link). L'aperçu SHALL NE JAMAIS déformer (fini le cadre 16:9 imposé).

#### Scenario: Aperçu fidèle puis renvoi
- **GIVEN** un 7-erreurs avec source panoramique (2:1) et 3 zones, volet détail étroit
- **WHEN** l'auteur regarde le détail puis touche « Éditer les zones »
- **THEN** l'aperçu est panoramique réduit avec les 3 zones au bon endroit, puis l'écran Modules s'ouvre sur ce nœud
