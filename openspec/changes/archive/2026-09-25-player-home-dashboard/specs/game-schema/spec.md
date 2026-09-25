## ADDED Requirements

### Requirement: Valeur HOME dans global.presentation

Le schéma Draft-07 SHALL accepter `HOME` comme valeur de `global.presentation`, aux côtés de `MAP`, `LIST`, `STORY`, `CLUE`, `TOOLBOX`, `TIMELINE`. Toute autre valeur SHALL rester rejetée en couche 1. L'absence de `HOME` SHALL conserver le comportement actuel (aucun tableau de bord).

#### Scenario: HOME accepté en couche 1
- **GIVEN** un jeu avec `global.presentation: ["HOME", "TOOLBOX"]`
- **WHEN** la validation Draft-07 tourne
- **THEN** le jeu est accepté

#### Scenario: Valeur inconnue toujours rejetée
- **GIVEN** un jeu avec `global.presentation: ["DASHBOARD"]`
- **WHEN** la validation Draft-07 tourne
- **THEN** le jeu est rejeté (valeur hors enum)
