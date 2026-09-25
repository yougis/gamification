## ADDED Requirements

### Requirement: Temps global et verrouillages dans le tableau de bord

Quand `global.dureeTotale` est posée et que le tableau de bord s'affiche (présuppose
le tableau de `player-home-dashboard`, non archivé : rebaser à l'archive si son texte
bouge), le tableau SHALL afficher en tête le temps restant de partie (`dureeTotale −
elapsed`, jamais négatif). Pour chaque POI porteur d'une condition `WINDOW` avec
`avantSecondes` non encore atteint, le tableau SHALL afficher « se verrouille dans … »
à côté du POI. En mode `finDeTemps: "continuer"` après échéance, le tableau SHALL
signaler « hors délai » ; en mode `"terminer"`, la partie est finie (le tableau ne
s'affiche plus). Aucune donnée nouvelle : tout est calculé depuis `dureeTotale` et
les `WINDOW` existants.

#### Scenario: Rebours global affiché

- **GIVEN** `dureeTotale: 3600` et 600s écoulées, tableau affiché
- **WHEN** le joueur consulte le tableau
- **THEN** la tête affiche « 50:00 restantes »

#### Scenario: Verrouillage annoncé

- **GIVEN** un POI avec `WINDOW {avantSecondes: 900}` et 600s écoulées
- **WHEN** le joueur consulte le tableau
- **THEN** le POI affiche « se verrouille dans 05:00 » à côté de son état

#### Scenario: Hors délai signalé sans bloquer

- **GIVEN** `finDeTemps: "continuer"`, échéance dépassée
- **WHEN** le joueur consulte le tableau
- **THEN** « hors délai » est signalé et le jeu continue normalement
