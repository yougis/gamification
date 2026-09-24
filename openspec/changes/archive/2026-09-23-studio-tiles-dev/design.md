## Context

Voir `proposal.md` (Why). État actuel (`studio/vite.config.ts`) : proxy `/tiles` → `https://tile.openstreetmap.org` avec `changeOrigin` + `rewrite`, sans headers ni contrainte DNS ; aucune section `optimizeDeps`/`worker`. `MapView.tsx` charge maplibre-gl (v6.10) avec le worker par défaut (aucun `workerUrl` custom, aucun import `?worker`). En dev : `.vite/deps/maplibre-gl-worker.mjs` manquant (optimiseur) + `http proxy error ... ETIMEDOUT` (cible injoignable : IPv6 qui stalle sur ce poste, UA Node non conforme à la politique OSM).

## Goals / Non-Goals

**Goals:**
- Carte visible en dev avec tuiles OSM, zéro erreur worker, zéro proxy error.
- Changements confinés à `vite.config.ts`, commentés (dev-only, machine-dépendant assumé).

**Non-Goals:**
- Aucune modification de `MapView`, du style de carte, des packs, du fallback `selectFond`.
- Pas de cache tuiles local (réévalué en suivi si throttling avéré).
- Pas de changement prod/build (`vite build` non concerné par le proxy dev).

## Decisions

### 1. Worker : `optimizeDeps.exclude: ["maplibre-gl"]`

Exclut maplibre-gl du pré-bundling esbuild : Vite le sert en ESM natif avec son worker intact, au lieu de tenter (et rater) la fusion du worker. C'est le remède suggéré par le message d'erreur lui-même, sans toucher au code.
Alternative écartée : `worker: { format: "es" }` global (affecte tous les workers, effet de bord large) ; import explicite `?worker` dans `MapView` (touche au code produit pour un problème dev — gardé en repli si l'exclusion ne suffit pas).

### 2. Proxy : headers OSM, sans agent custom

- `headers: { Referer, User-Agent }` identifiant l'app de dev (politique d'usage OSM : UA/referer valides, usage modéré — le dev avec exclude recharge moins, volume acceptable).
- **Pas d'agent IPv4 custom** (écart avec l'intention initiale) : tentative implémentée puis retirée car (a) elle cassait l'auto-sélection de famille de Node 24 (`Invalid IP address`, le `lookup` custom dépouillait `all: true`), et (b) la bissection a prouvé les headers suffisants (tuile 200 en ~2 s) — le stall IPv6 est absorbé par l'auto-sélection dès qu'OSM répond.
- `changeOrigin` + `rewrite` existants conservés tels quels.
Alternative écartée : `dns.setDefaultResultOrder("ipv4first")` global (inutile une fois les headers en place, effet de bord sur tout le process).

### 3. Vérification par l'observé, pas par le construit

Le succès se lit dans la console dev, pas dans un test : démarrage `npm run dev`, ouverture du Composer en vue carte, constat — tuiles visibles, aucune ligne `http proxy error`, aucune erreur worker. `tsc --noEmit` inchangé (config Vite hors `tsconfig.app.json`, mais le garde-fou reste la revue : aucun fichier hors `vite.config.ts` modifié).

## Risks / Trade-offs

- [Throttling OSM malgré les headers] → Mitigation : reloads dev espacés ; si avéré, suivi dédié (cache tuiles local ou tuiles du pack de test en dev).
- [Exclude = reloads maplibre un peu plus lents] → Accepté : correction d'abord, micro-perf dev secondaire ; mesuré à l'usage.
- [IPv4 forcée = spécifique à ce poste/réseau] → Mitigation : confiné à l'entrée proxy + commentaire explicatif ; sur un réseau sain l'agent se comporte comme le défaut.
- [Exclude insuffisant pour le worker] → Repli : import worker explicite dans `MapView` (alors seulement, changement code minimal documenté).

## Migration Plan

1. Ajouter `optimizeDeps.exclude`, redémarrer dev, constater la carte (worker OK).
2. Ajouter headers + agent IPv4, redémarrer dev, constater les tuiles (proxy OK).
3. Revue du diff (`vite.config.ts` seul) + `tsc --noEmit`.
Rollback : revert Git (un seul fichier, aucun état).
