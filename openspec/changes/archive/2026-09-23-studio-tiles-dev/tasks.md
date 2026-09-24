## 1. Worker maplibre

- [x] 1.1 Ajouter `optimizeDeps.exclude: ["maplibre-gl"]` dans `studio/vite.config.ts` — Vérifier : `npm run dev` démarre sans erreur `maplibre-gl-worker.mjs`, la carte s'initialise en vue carte du Composer

## 2. Proxy OSM

- [x] 2.1 Ajouter headers conformes OSM (Referer + User-Agent) sur l'entrée proxy `/tiles`, `changeOrigin`/`rewrite` inchangés (agent IPv4 tenté puis abandonné : headers seuls suffisent, cf. design) — Vérifier : tuiles visibles en vue carte, zéro ligne `http proxy error` / `ETIMEDOUT` en console dev pendant 2 minutes de navigation carte

## 3. Vérification globale

- [x] 3.1 Revue du diff (seul `vite.config.ts` modifié, commentaires dev-only présents) + `tsc --noEmit` au baseline — Vérifier : `git status` ne montre que `vite.config.ts`, tsc sans nouvelle erreur
