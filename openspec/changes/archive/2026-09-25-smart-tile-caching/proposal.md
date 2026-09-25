## Why

Le Player GeoPlay stocke les tuiles cartographiques offline dans le pack. Actuellement, le téléchargement des tuiles est basé sur une bbox statique définie dans le JSON. En mode indoor ou pour des jeux avec déplacement limité, des centaines de tuiles inutiles sont téléchargées, gaspillant stockage et temps. La spec offline-pack autorise déjà le téléchagement différentiel (ne re-télécharge que les `version` changées), mais il n'y a pas de stratégie de cache intelligent basée sur les besoins réels du jeu.

## What Changes

- Ajout de `global.tileStrategy` dans le schema : `fixed` (actuel), `viewport` (auto), `radius` (par nœud), `none` (sans carte)
- Ajout de `global.tileRadiusMeters` pour la stratégie radius
- Calcul automatique de la bbox minimale au lieu d'une bbox fixe
- Pré-chargement adaptatif selon le mode de navigation (BASIC = large, GUIDED = linéaire, ESCAPE_GAME = compact)

## Capabilities

### Modified Capabilities
- `offline-pack`: Ajout de stratégies de cache intelligent pour les tuiles cartographiques, calcul bbox automatique, pré-chargement adaptatif

## Impact

- `studio/src/game/schema/game-schema.json` : ajout de `tileStrategy` et `tileRadiusMeters`
- `studio/src/game/types.ts` : types `TileStrategy`
- `studio/src/game/pack.ts` : calcul automatique de la bbox selon la stratégie
- `studio/src/game/mcp.ts` : opérations MCP pour la configuration
- Runtime Android/iOS : interprétation de la stratégie de cache au Player
