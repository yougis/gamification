## Why

Le jeu vierge du Studio naît C1-invalide : son `start` porte `activation.requires: []` (rejeté, `minItems: 1`) et omet `isEnding` (exigé présent par la branche non-HOME). Pire : c'est la spec elle-même qui impose « activation vide », en contradiction avec le schéma. L'auteur commence donc chaque projet avec 4 erreurs qu'il n'a pas provoquées. Et pour repartir de zéro, la seule porte existante (« Effacer le brouillon ») est enterrée dans Importer → Avancé.

## What Changes

- `jeuVide()` : `start` avec `activation.requires: [{TIMER, GAME_START, 0}]` (convention du START de référence `game-5poi.json`) et `isEnding: false` explicite ; INFO de bienvenue et `VISIBLE_NOW` inchangés. Le jeu vierge passe de 4 erreurs C1 aux seules erreurs « FIN manquante » (by design, guidées par la checklist).
- Bouton « Nouveau projet » dans la barre globale, à côté du nom du projet : action destructive (`btn-danger`), confirmation `window.confirm`, réutilise le handler `effacerBrouillon` existant (vide le brouillon local, recharge `jeuVide()`, reset sélection/session/export). Le bouton enterré d'Importer est conservé (doublon assumé : raccourci visible + accès Avancé).
- Import d'un fichier sans nœud : ajout automatique du `start` identique à `jeuVide()` (spec SHALL existante jamais implémentée — `importerFichier` charge tel quel aujourd'hui).

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `studio-authoring`: `start` par défaut valide C1 sur son activation et `isEnding` (remplace « activation vide », contradictoire avec le schéma) ; bouton « Nouveau projet » destructif avec confirmation dans la barre globale (complète « Organisation en écrans », muette sur la création d'un projet vierge).

## Impact

- Code : `studio/src/App.tsx` (`jeuVide`, bouton barre globale, `importerFichier`), `studio/src/game/mcp.ts` si l'ajout du `start` mérite une op nommée.
- Schéma graphe : inchangé ; aucun consommateur impacté.
- La spec disait « activation vide » : l'amendement correspondant fait partie du change (delta ci-joint).
- Aucune valeur réservée CONDITIONAL/WINDOW touchée, aucun module ajouté au registre.
- Aucun besoin réseau : 100 % local.
- Aucune dépendance à un change précédent non archivé.
