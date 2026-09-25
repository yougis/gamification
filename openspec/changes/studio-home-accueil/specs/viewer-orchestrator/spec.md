## MODIFIED Requirements

### Requirement: Rendu selon le modèle de présentation

Le runtime SHALL adapter le rendu du Player selon la configuration `global.presentation`. Les modes de présentation supportés : `MAP`, `LIST`, `STORY`, `CLUE`, `TOOLBOX`, `TIMELINE`, `HOME`. Le runtime SHALL pouvoir combiner plusieurs présentations simultanément.

Quand `HOME` est présent, le runtime SHALL afficher une entrée « Accueil » permanente (tab/barre) menant au tableau de bord ; le contenu affiché SHALL être identique au tableau par défaut (temps écoulé, comptes à rebours par POI, états, proposition d'ouverture, entrée inventaire selon sa règle). Naviguer vers ou depuis l'Accueil SHALL ne produire ni transition d'état ni event.

#### Scenario: Présentation combinée
- **GIVEN** un jeu avec `presentation: ["MAP", "TOOLBOX", "CLUE"]`
- **WHEN** le joueur ouvre le jeu
- **THEN** la carte, la boîte à outils et la zone d'indices s'affichent simultanément

#### Scenario: Onglet Accueil permanent
- **GIVEN** un jeu avec `presentation: ["HOME", "MAP"]`
- **WHEN** le joueur navigue entre la carte et l'onglet « Accueil »
- **THEN** chaque vue s'affiche avec son contenu (carte d'un côté, tableau de l'autre), sans transition d'état ni event
