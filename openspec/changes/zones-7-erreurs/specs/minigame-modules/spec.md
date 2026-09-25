## MODIFIED Requirements

### Requirement: 7-erreurs polygones + dilatation

`DIFFERENCE_GAME` SHALL consommer source + dérivée + polygones % (+
`touchDilatation` minimale 44 px) ; le masque Alpha brut ne SHALL jamais être
embarqué. Zones exprimées en % (responsive). Chaque zone SHALL être un
rectangle `{x, y, w, h}` OU un polygone `{points: [{x, y}, ...]}` (au moins 3
points) ; les deux formes coexistent dans le même tableau (les rectangles
existants restent valides sans migration). Relecture overlay avec statuts.
Le test de tap (`hitTest` + dilatation) SHALL valider l'intérieur des deux
formes (point-dans-polygone pour les polygones).

#### Scenario: Tap ganté à côté

- **GIVEN** une zone de 4 px avec dilatation 12 px
- **WHEN** le joueur tape à 10 px du bord exact
- **THEN** le tap est validé dans la zone

#### Scenario: Tap dans un polygone

- **GIVEN** une zone polygonale à 5 sommets avec dilatation
- **WHEN** le joueur tape à l'intérieur du polygone
- **THEN** le tap est validé, sans exiger de rectangle englobant

#### Scenario: Rectangle existant toujours valide

- **GIVEN** un jeu avec une zone `{x: 10, y: 10, w: 5, h: 5}` (format historique)
- **WHEN** la validation Draft-07 tourne
- **THEN** la zone est acceptée (union, pas de migration)
