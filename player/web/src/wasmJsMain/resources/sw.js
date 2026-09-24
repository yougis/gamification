/* Service worker GeoPlay PWA (change player-pwa-shell, design D2) :
 * app shell précaché, assets et packs en cache-first même origine,
 * repli index.html pour les navigations hors-ligne. Versionner CACHE
 * à chaque release pour invalider proprement. */
const CACHE = 'geoplay-pwa-v1';
const PRECACHE = ['./', 'index.html', 'manifest.webmanifest', 'icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
          return res;
        }).catch(() => {
          if (req.mode === 'navigate') return caches.match('index.html');
          return Response.error();
        })
    )
  );
});
