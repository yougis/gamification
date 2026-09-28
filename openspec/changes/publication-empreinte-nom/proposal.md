## Why

Publier un jeu contenant le moindre caractère non-ASCII (accents, emoji — soit quasiment chaque jeu français) échoue avec « empreinte incohérente : game.json », alors que le contenu est sain : le Studio déclare `size: gameJson.length` (unités UTF-16) tandis que le serveur compare des octets UTF-8 (« Château » : 25 caractères vs 27 octets). Par ailleurs, le nom affiché au catalogue (`gameId`, clé de versionnement) n'est pas le nom éditable dans l'UI (`branding.name`), ce qui surprend après un renommage.

## What Changes

- Corriger `size` de `game.json` en octets (`new TextEncoder().encode(gameJson).length`) aux 2 endroits de `studio/src/game/mcp.ts` (factoriser en helper partagé si pertinent), sans toucher au SHA (déjà correct des deux côtés) ni au serveur (qui a raison).
- Ajouter un test client avec `gameJson` accentué (publication acceptée) ; le test serveur existant reste vert.
- Assumer l'écart d'identité (option retenue) : documenter que le catalogue clé sur `gameId` (stable, créé à la naissance du jeu) tandis que `branding.name` n'est qu'un libellé d'affichage ; renommer l'affichage ne crée ni ne déplace l'entrée catalogue. Aucun code pour ce point : clarification spec uniquement.

## Capabilities

### Modified Capabilities
- `game-catalog`: précision du contrat — `size` du manifest en octets côté Studio (cohérence avec la vérification serveur) ; distinction explicite identifiant catalogue (`gameId`) vs nom d'affichage (`branding.name`), sans changement de comportement.

## Impact

- `studio/src/game/mcp.ts` : 2 lignes (les 2 copies du calcul `size` de `game.json`) ; aucun autre fichier de production.
- `catalog/server.js` : inchangé (le contrôle est correct).
- Schéma graphe (Nœuds/activation/registre/branding/manifest) inchangé ; aucune valeur réservée touchée ; aucun réseau ajouté au parcours joueur (la publication reste une action auteur en ligne, déjà admise).
- Aucune dépendance à un change non archivé.
