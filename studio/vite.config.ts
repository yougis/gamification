import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
