## ADDED Requirements

### Requirement: Prévisualisation interactive du widget carte

Le terminal joueur simulé (mode « Jeux ») SHALL rendre les widgets carte de façon interactive : déplacement, zoom (boutons, le tactile du poste s'il existe), position simulée lue depuis l'état d'essai (même source que les autres capteurs simulés, jamais le GPS réel du poste), clic sur un marqueur affichant le volet (titre + bouton Ouvrir comme côté player). Activer Ouvrir sur un POI éligible SHALL présenter l'étape comme le fait le simu pour tout éligible (mêmes transitions, event SIMULÉ) ; sur un POI verrouillé, le bouton SHALL rester sans effet. Naviguer SHALL ne produire ni transition ni event, comme côté player. Le rappel permanent « la prévisualisation n'écrit jamais dans le JSON source » SHALL rester visible.

#### Scenario: Clic POI simulé puis ouverture

- **GIVEN** le mode « Jeux » ouvert sur un écran avec widget carte et un POI `UNLOCKED` simulé
- **WHEN** l'auteur clique le marqueur puis touche Ouvrir dans le volet
- **THEN** l'écran de l'étape s'ouvre avec les transitions du simu et un event SIMULÉ, sans écrire au JSON

#### Scenario: Position simulée affichée

- **GIVEN** un essai avec une position simulée renseignée
- **WHEN** l'auteur ouvre un écran avec widget carte dans le terminal
- **THEN** le point de position s'affiche à la position simulée (jamais celle du poste auteur)

#### Scenario: Navigation sans effet simu

- **GIVEN** le même écran dans le terminal
- **WHEN** l'auteur déplace et zoome la carte puis ferme le volet
- **THEN** aucun event (même simulé) n'est journalisé et l'état d'essai est inchangé
