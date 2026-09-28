## 1. Panneau Mode et Difficulté sur global

- [x] 1.1 Basculer le panneau sur `game.global.gameMode` / `game.global.difficulty` via `setGameMode` / `setDifficulty`, corriger `fixEnumDefaut` vers `global`, basculer les lecteurs C2 sur `global`, et vérifier : toucher mode/difficulté ne crée plus de clé racine, C1 verte, undo restaure, C2 `GAMEMODE_INVALIDE`/`DIFFICULTY_INVALIDE` réactivés sur valeurs réelles
- [x] 1.2 Ajouter l'opération nommée de migration racine → `global` à l'import (global gagne, clés racine retirées, même patron que `migrerExperienceStyleRacine`), et vérifier : `tsc` sans nouvelle erreur sur les lignes touchées, jeu empoisonné réparé, aucune régression C1/C2 sur les jeux sains
