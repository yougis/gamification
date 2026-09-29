import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'
import { createEmulateStore, handleEmulate } from './emulate-plugin.js'

// Endpoint /emulate dev-only (change preview-pwa-iframe) : sert le jeu
// COURANT (snapshot poussé par App depuis Prévisualiser) à la PWA émulée
// en iframe — game.json, manifest reconstruit, compat, assets de session.
// Mémoire du process `vite dev` uniquement, jamais persisté.
function emulate(): Plugin {
  const store = createEmulateStore();
  return {
    name: 'geoplay-emulate',
    configureServer(server) {
      // Monté à la racine (pas de préfixe : Connect dépouillerait req.url
      // et casserait la reconnaissance /emulate) ; passe au suivant sinon.
      server.middlewares.use((req, res, next) => {
        void handleEmulate(store, req as never, res as never).then((pris) => {
          if (!pris) next();
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), emulate()],
  // Dev-only (change studio-tiles-dev) : maplibre-gl hors pré-bundling esbuild,
  // sinon l'optimiseur tente de fusionner son web worker et échoue
  // (.vite/deps/maplibre-gl-worker.mjs manquant). Servi en ESM natif à la place.
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  server: {
    proxy: {
      '/tiles': {
        target: 'https://tile.openstreetmap.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tiles/, ''),
        // Dev-only (change studio-tiles-dev) : politique d'usage OSM exige
        // Referer + User-Agent valides (l'UA Node par défaut se fait throttler).
        headers: {
          Referer: 'http://localhost/',
          'User-Agent': 'GeoPlayStudio/1.0 (development)',
        },
      },
    },
  },
})
