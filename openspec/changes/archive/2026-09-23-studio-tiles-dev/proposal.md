## Why

En dev (`npm run dev`), la carte du Studio est aveugle : le worker maplibre-gl n'est pas pré-bundlé par l'optimiseur Vite (`.vite/deps/maplibre-gl-worker.mjs` manquant) et le proxy de tuiles vers `tile.openstreetmap.org` timeout en `AggregateError ETIMEDOUT` (IPv6 qui stalle sur ce poste + politique d'usage OSM exigeante face à l'UA Node). L'auteur ne peut ni voir ni positionner sur carte en dev.

## What Changes

Dans l'ordre (le worker lève le voile sur le reste) :
1. **Worker maplibre** : `optimizeDeps.exclude: ["maplibre-gl"]` dans `vite.config.ts` (remède suggéré par l'erreur elle-même), sans toucher au chargement du worker dans `MapView`.
2. **Proxy OSM réparé** : headers conformes à la politique d'usage OSM (Referer + User-Agent explicites). L'IPv4 forcée envisagée s'est révélée inutile à l'implémentation (headers seuls : tuile 200 en ~2 s) et a été abandonnée.
3. **Pas de cache local pour l'instant** : si les reloads se font throttler malgré les headers, un cache tuiles dev sera réévalué en suivi (hors périmètre).
4. Aucun changement prod : ni `MapView`, ni style de carte, ni packs, ni fallback `selectFond`.

## Capabilities

### New Capabilities

_(aucune — outillage dev uniquement)_

### Modified Capabilities

_(aucune — aucun comportement produit n'est modifié ; le change déclare `skip_specs: true`)_

## Impact

- **Code** : `studio/vite.config.ts` uniquement (serveur dev + optimiseur).
- **Vérification** : `npm run dev` → carte visible avec tuiles OSM, zéro `http proxy error`, zéro erreur worker ; `tsc --noEmit` inchangé.
- **Aucun impact** : schéma Draft-07, graphe, runtime player, packaging offline, opérations MCP, écrans du Studio (seul leur environnement dev change).
