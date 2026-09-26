## ADDED Requirements

### Requirement: Cohérence temporelle applicative

Le validateur applicatif SHALL vérifier : toute condition `WINDOW` avec `apresSecondes`
et `avantSecondes` posés SHALL avoir `apresSecondes < avantSecondes`, sinon rejet avec
la condition fautive nommée. La faisabilité temporelle complète (un chemin reste-t-il
jouable avant ses verrouillages ?) SHALL rester hors socle, documentée comme limite
volontaire au même titre que la fermeture transitive (pas de solveur temporel) :
l'hypothèse d'environnement favorable couvre les déverrouillages, jamais le respect
des échéances par le joueur.

#### Scenario: Fenêtre inversée rejetée

- **GIVEN** une condition `WINDOW {apresSecondes: 600, avantSecondes: 120}`
- **WHEN** le validateur applicatif controle
- **THEN** le jeu est rejeté avec la condition fautive nommée

#### Scenario: Infaisabilité non promise

- **GIVEN** un jeu valide où le seul chemin vers `isEnding` exige deux étapes avant 300s
- **WHEN** le validateur applicatif controle
- **THEN** il accepte (atteignabilité structurelle) et documente qu'il ne garantit pas la faisabilité temporelle
