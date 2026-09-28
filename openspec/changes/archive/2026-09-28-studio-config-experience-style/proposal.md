## Why

Le panneau Experience Style de l'écran Config écrit `experienceStyle` à la racine du jeu, que le schéma Draft-07 rejette (`additionalProperties: false`, 8 clés). Le jeu naît valide (`jeuVide` initialise `global.experienceStyle`) et devient invalide au premier toucher du panneau — le Composer fabrique lui-même l'erreur C1 « un champ n'existe pas à cet endroit ». Le type TypeScript déclare la clé racine, donc rien ne signale la faute à l'édition.

## What Changes

- Le panneau lit/écrit exclusivement `game.global.experienceStyle` via l'opération MCP `setExperienceStyle` existante (plus de `edit` brut racine).
- À l'ouverture, une valeur racine résiduelle est migrée vers `global` (fusion, la valeur `global` gagne en cas de conflit) puis la clé racine est retirée — via une opération nommée annulable, jamais silencieuse.
- Le type `Game` perd la clé racine `experienceStyle` : toute récidive devient une erreur de compilation.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `experience-style`: le Studio écrit exclusivement `global.experienceStyle` (jamais racine) et migre la valeur racine résiduelle (précise « Configuration experienceStyle », muette sur le lieu d'écriture côté Studio).

## Impact

- Code : `studio/src/App.tsx` (panneau `ExperienceStylePanel`), `studio/src/game/types.ts` (type `Game`), `studio/src/game/mcp.ts` (opération de migration nommée réutilisant `setExperienceStyle`).
- Schéma graphe : inchangé ; aucun consommateur impacté (la valeur lue par le Player reste `global.experienceStyle`).
- Aucune valeur réservée CONDITIONAL/WINDOW touchée, aucun module ajouté au registre.
- Aucun besoin réseau : 100 % local.
- Aucune dépendance à un change précédent non archivé.
