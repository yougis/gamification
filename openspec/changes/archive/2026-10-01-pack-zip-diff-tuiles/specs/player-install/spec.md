## ADDED Requirements

### Requirement: Mise à jour depuis un pack complet

L'import d'un `.zip` (fichier local) ou d'un pack service pour un `gameId` déjà installé SHALL proposer la mise à jour différentielle plutôt qu'une seconde entrée : le catalogue local garde une seule entrée par `gameId` (règle `player-catalogue-stable` inchangée). Le contrôle de taille SHALL s'appliquer avant application (delta estimé, pas le pack entier).

#### Scenario: Zip de mise à jour
- **GIVEN** le jeu `chasse` v1 installé et un `.zip` `chasse` v2 importé par fichier
- **WHEN** l'auteur confirme la mise à jour après le contrôle de taille
- **THEN** seule la différence est appliquée, l'entrée reste unique, la progression est préservée
