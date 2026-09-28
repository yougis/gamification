## Why

Même classe de bug que `studio-config-experience-style`, découverte en recensant : le panneau « Mode et Difficulté » de l'écran Config écrit `gameMode` et `difficulty` à la racine du jeu, que le schéma Draft-07 rejette (`additionalProperties: false`). Le correctif `fixEnumDefaut` pour ces deux champs écrit lui aussi à la racine. Et la C2 lit `game.gameMode` / `game.difficulty` à la racine : ses contrôles sont morts pour les valeurs saines (dans `global`) et ne valideraient que le poison. Le jeu naît valide (`jeuVide` initialise `global`) et s'empoisonne au premier toucher du panneau ou au premier correctif proposé.

## What Changes

- Le panneau lit/écrit exclusivement `game.global.gameMode` / `game.global.difficulty` via les opérations MCP `setGameMode` / `setDifficulty` existantes (plus de `edit` brut racine).
- `fixEnumDefaut` pour `gameMode` / `difficulty` écrit dans `global` (plus à la racine).
- La C2 lit `game.global?.gameMode` / `game.global?.difficulty` (contrôles réactivés sur les valeurs réelles).
- À l'import, les valeurs racine résiduelles sont migrées vers `global` (le `global` gagne en cas de conflit) puis les clés racine retirées, avant validation — même patron que `migrerExperienceStyleRacine`, chargement restant une étape undoable unique.
- Le type `Game` ne déclare déjà aucune clé racine pour ces champs : vérifier l'absence et n'y introduire aucune écriture.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `game-mode-difficulty`: le Studio écrit exclusivement `global.gameMode` / `global.difficulty` (jamais racine), migre les valeurs racine résiduelles et valide la C2 sur le `global` (précise « Studio configuration gameMode et difficulty », muette sur le lieu d'écriture et de lecture).

## Impact

- Code : `studio/src/App.tsx` (panneau « Mode et Difficulté »), `studio/src/game/mcp.ts` (`fixEnumDefaut`, opération de migration), `studio/src/game/validate.ts` (lecteurs C2).
- Schéma graphe : inchangé ; aucun consommateur impacté (le runtime lit déjà le `global`).
- Aucune valeur réservée CONDITIONAL/WINDOW touchée, aucun module ajouté au registre.
- Aucun besoin réseau : 100 % local.
- Dépend du patron introduit par `studio-config-experience-style` (migration à l'import) ; aucune dépendance à un change non archivé pour compiler.
