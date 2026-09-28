## 1. Panneau Experience Style sur global

- [x] 1.1 Basculer le panneau sur `game.global.experienceStyle` via `setExperienceStyle` (`editGame`), recenser et convertir tous les lecteurs de la clé racine, et vérifier : toucher preset/couleurs/identité ne crée plus de clé racine, C1 verte, undo restaure
- [x] 1.2 Ajouter l'opération nommée de migration racine → `global` à l'ouverture (global gagne, clé racine retirée), retirer `experienceStyle` du type racine `Game`, et vérifier : `tsc --noEmit`, jeu empoisonné réparé en un undo, aucune régression C1/C2 sur les jeux sains
