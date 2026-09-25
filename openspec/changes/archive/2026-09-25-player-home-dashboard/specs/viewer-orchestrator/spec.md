## MODIFIED Requirements

### Requirement: Rendu selon le modèle de présentation

Le runtime SHALL adapter le rendu du Player selon la configuration `global.presentation`. Les modes de présentation supportés : `MAP`, `LIST`, `STORY`, `CLUE`, `TOOLBOX`, `TIMELINE`, `HOME`. Le runtime SHALL pouvoir combiner plusieurs présentations simultanément.

#### Scenario: Présentation combinée
- **GIVEN** un jeu avec `presentation: ["MAP", "TOOLBOX", "CLUE"]`
- **WHEN** le joueur ouvre le jeu
- **THEN** la carte, la boîte à outils et la zone d'indices s'affichent simultanément

## ADDED Requirements

### Requirement: Tableau de bord entre les étapes

Quand `presentation` inclut `HOME`, le player SHALL afficher par défaut (aucune modale ACTIVE) un tableau de bord contenant : le temps écoulé de la session ; pour chaque POI non terminé porteur d'une condition `TIMER` non encore satisfaite, le compte à rebours restant affiché à côté du POI (calculé depuis l'ancre et le délai existants, sans nouvelle donnée) ; une entrée vers la boîte à outils (même règle d'affichage que l'icône persistante) ; l'état de chaque POI (fait / à faire, depuis les états moteur) ; la proposition d'ouverture de l'étape en tête de file (même file FIFO, aucune transition ajoutée). Ouvrir ou fermer le tableau de bord SHALL ne produire ni transition d'état ni event de progression. Les temps limites d'épreuve (`timeLimitSeconds`, `maxAttempts`) SHALL rester affichés uniquement dans les écrans d'étapes par les modules.

#### Scenario: Compte à rebours par POI
- **GIVEN** un POI avec `TIMER {GAME_START + 600s}` et une session écoulée de 240s
- **WHEN** le joueur consulte le tableau de bord
- **THEN** le POI affiche « dans 06:00 » à côté de son état

#### Scenario: Proposition d'ouverture
- **GIVEN** un tableau de bord avec `baker` en tête de file
- **WHEN** le joueur touche « Ouvrir : baker »
- **THEN** l'étape s'ouvre comme par tout autre déclencheur, sans event supplémentaire

#### Scenario: Limites d'épreuve hors tableau de bord
- **GIVEN** un quiz avec `timeLimitSeconds: 30`
- **WHEN** le joueur consulte le tableau de bord
- **THEN** aucune mention des 30 secondes n'y figure ; elles s'affichent dans l'écran du quiz
