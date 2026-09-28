## Why

Le Player GeoPlay stocke les tuiles cartographiques offline dans le pack. Actuellement, le téléchargement des tuiles repose sur une bbox statique saisie à la main dans le JSON : en indoor ou à déplacement limité, des centaines de tuiles inutiles sont téléchargées, et l'auteur n'a aucune visibilité sur ce qui sera embarqué ni aucun moyen de réutiliser un calcul d'un jeu à l'autre. La spec offline-pack autorise déjà le téléchargement différentiel, mais il manque une gestion auteur des packs de tuiles (créer, réutiliser, supprimer, choisir celui du jeu).

## What Changes

- Un menu Studio « Packs de carte » centralise toute la configuration des tuiles : provider, bbox (manuelle `fixed` / auto `viewport` / `radius` + `tileRadiusMeters` / `none`), minZoom/maxZoom, attribution, estimation taille et nombre de tuiles, progression de génération.
- Les packs générés sont mis en cache côté serveur et proposés au téléchargement avec les jeux JSON (export = `game.json` + tuiles du pack actif, manifest SHA-256 inchangé).
- Plusieurs caches peuvent exister par projet : liste, suppression (avec confirmation, sans casser le JSON — repli fond uni), désignation d'un unique pack actif utilisé dans les packs du jeu (`global.map.tilePackId` optionnel).
- La consommation côté écran reste inchangée : le dropdown existant Fond du widget map (`"tuiles du pack"` / `background: "pack-tiles"`) lit le pack actif, sans nouvelle valeur de fond.

## Capabilities

### Modified Capabilities
- `offline-pack`: menu Packs de carte, cache serveur des packs générés, multi-cache par projet (suppression, pack actif), liaison via le Fond existant `pack-tiles`.

## Impact

- `studio/src/game/schema/game-schema.json` : `tileStrategy`, `tileRadiusMeters` dans `global.map` (déjà couverts par ce change) + `tilePackId` optionnel (référence du pack actif).
- `studio/src/game/types.ts` : types `TileStrategy`, `TilePackMeta {id, nom, config, taille, nbTuiles, date, statut}`.
- `studio/src/game/pack.ts` : calcul bbox selon stratégie, assemblage export avec tuiles du pack actif.
- `studio/src/game/mcp.ts` : opérations `setTileStrategy`, `computeOptimalBbox` + `createTilePack`, `listTilePacks`, `deleteTilePack`, `setActiveTilePack`.
- Service catalogue/serveur : persistance du cache des packs générés, téléchargement avec les jeux JSON.
- Widget map : aucun changement de schéma — le Fond `"tuiles du pack"` existant consomme le pack actif.
- Runtime Android/iOS : lecture du manifest tuiles du pack actif, inchangée sinon (repli fond uni).
