## MODIFIED Requirements

### Requirement: Studio configuration gameMode et difficulty

Le Studio SHALL offrir des champs pour configurer `global.gameMode` et `global.difficulty` dans l'éditeur de jeu. Ces champs SHALL être visibles dans la configuration globale du jeu.

Toute modification SHALL garantir un export JSON conforme au schema Draft-07.

Le Studio SHALL lire et écrire exclusivement `global.gameMode` / `global.difficulty`, jamais de clés `gameMode` / `difficulty` à la racine du jeu (rejetées en couche 1). Les correctifs proposés (`fixEnumDefaut`) SHALL écrire dans `global`. Si un jeu chargé porte des valeurs racine résiduelles, le Studio SHALL les reporter dans `global` (la valeur `global` gagne en cas de conflit) puis retirer les clés racine, via une opération nommée annulable. La validation applicative (couche 2) SHALL lire `global.gameMode` / `global.difficulty`, jamais la racine.

#### Scenario: Modification du gameMode dans le Studio
- **GIVEN** un jeu en édition
- **WHEN** l'auteur change `global.gameMode` de `NORMAL` à `ANIMATEUR`
- **THEN** le JSON exporté contient le nouveau mode et passe la validation

#### Scenario: Panneau sans clé racine
- **GIVEN** un jeu valide affiché dans l'écran Config
- **WHEN** l'auteur change le mode puis la difficulté dans le panneau
- **THEN** seuls `global.gameMode` / `global.difficulty` sont modifiés (annulable par undo) et la validation C1 reste verte

#### Scenario: Valeurs racine résiduelles migrées
- **GIVEN** un jeu chargé avec `gameMode` à la racine et `global.gameMode` initialisé par `jeuVide`
- **WHEN** le Studio ouvre le jeu
- **THEN** la racine est reportée dans `global` (global gagne), les clés racine disparaissent, et l'opération est annulable par undo

#### Scenario: C2 sur les valeurs réelles
- **GIVEN** un jeu avec `global.gameMode: "ANIMATEUR"` et aucune clé racine
- **WHEN** la validation applicative tourne
- **THEN** les contrôles `GAMEMODE_INVALIDE` / `DIFFICULTY_INVALIDE` portent sur les valeurs du `global`
