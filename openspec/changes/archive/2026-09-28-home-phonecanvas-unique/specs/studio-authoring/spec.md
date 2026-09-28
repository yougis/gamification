## ADDED Requirements

### Requirement: Aperçus HOME rendus par le PhoneCanvas de l'écran global

Les aperçus HOME (mini-aperçu t=0 du volet des étapes et aperçu d'essai de Prévisualiser, y compris la salle d'attente du Mode Jeux) SHALL rendre le même `PhoneCanvas` en lecture seule que la vue Screen du Composer (`showGhosts={false}`, sans sélection ni édition, comme le terminal joueur simulé) : l'écran affiché SHALL toujours être `game.global.screen`, y compris vide. Aucun markup parallèle SHALL subsister : le tableau texte historique codé en dur dans les aperçus SHALL être supprimé.

#### Scenario: Écran composé prévisualisé à l'identique

- **GIVEN** un écran global avec header (texte « Bienvenue ») et widget carte, pseudo-sélection Accueil active dans le Composer
- **WHEN** l'auteur consulte le mini-aperçu du volet ou l'aperçu de Prévisualiser
- **THEN** le même header, le même widget carte et les mêmes styles s'affichent, en lecture seule, sans contrôle d'édition

#### Scenario: Écran vide assumé

- **GIVEN** un jeu avec `HOME` et `global.screen` vide ou absent
- **WHEN** l'auteur consulte un aperçu HOME
- **THEN** un écran vide s'affiche (PhoneCanvas systématique), sans repli vers le tableau texte historique

### Requirement: Données d'essai lues par l'écran, jamais écrites

Les aperçus HOME SHALL rester en lecture seule : le temps (t=0 figé pour le mini-aperçu, temps simulé pour Prévisualiser), les états, les rebours et la proposition d'ouverture SHALL être lus depuis l'état d'essai existant (`calculerApercu`, inchangé) et consommés par l'écran via les widgets liés et blocs dérivés ; l'ouverture SHALL rejouer le contrôle d'essai existant. Aucun aperçu SHALL écrire au JSON ni à la simulation.

#### Scenario: Rebours simulés dans l'écran composé

- **GIVEN** un essai avec un POI `TIMER 600s` et du temps simulé écoulé
- **WHEN** l'auteur consulte l'aperçu de Prévisualiser
- **THEN** l'écran composé affiche le rebours diminué d'autant, le JSON et la simu sont inchangés hors contrôles d'essai
