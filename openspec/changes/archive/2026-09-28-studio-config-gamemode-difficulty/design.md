## Context

Voir `proposal.md` (Why). État observé : panneau « Mode et Difficulté » (`App.tsx:3526/3532`, `edit` brut racine), `fixEnumDefaut` (`mcp.ts:106-108`, écrit racine pour `gameMode`/`difficulty`), lecteurs C2 (`validate.ts:120-124`, racine). Les ops correctes `setGameMode` / `setDifficulty` (`mcp.ts:735-743`, écrivent `global`) existent mais ne sont appelées ni par le panneau ni par le correctif. Patron de migration déjà éprouvé : `migrerExperienceStyleRacine` (change `studio-config-experience-style`).

## Goals / Non-Goals

**Goals:**
- Plus aucune écriture Studio hors `global.gameMode` / `global.difficulty`.
- C2 réactivée sur les valeurs réelles.
- Jeux déjà empoisonnés réparés à l'import (migration annulable via le chargement undoable unique).

**Non-Goals:**
- Pas de changement du schéma, du runtime ni des valeurs par défaut (`NORMAL` / `FAMILLE` inchangées).
- Pas de retouche du message C1 trompeur (sujet séparé).
- Pas de migration des autres clés racine éventuelles.

## Decisions

- **Réutiliser `setGameMode` / `setDifficulty`, pas de nouvelles ops d'écriture** : le panneau les appelle via `editGame` (historique nommé conservé).
- **`fixEnumDefaut` corrigé vers `global`** plutôt que contourné : c'est le correctif proposé par l'écran Valider, il doit produire du JSON valide.
- **Migration à l'import, `global` gagne** : même sémantique que pour `experienceStyle` (le `global` initialisé par `jeuVide` est la référence saine) ; factoriser avec `migrerExperienceStyleRacine` si le code s'y prête, sinon une op dédiée au même patron.
- **C2 sur `global`** : `game.global?.gameMode` / `game.global?.difficulty`, avec la même tolérance à l'absence qu'aujourd'hui (défauts `NORMAL` / `FAMILLE` appliqués par le moteur).

## Risks / Trade-offs

- [Jeux avec racine seule (sans global)] → Mitigation : la migration reporte toute valeur racine vers `global`.
- [Types `GameMode` / `Difficulty` non exportés de `types.ts`] → Mitigation : l'implémentation constate l'état réel des exports (le baseline tsc signale déjà des imports manquants) et utilise les unions de chaînes du `global` si besoin, sans élargir le scope aux autres erreurs tsc préexistantes.
