// ── MHW Companion — Service Worker ──────────────────────
// Bump CACHE_VERSION quand tu modifies des fichiers statiques
const CACHE_VERSION = 'v1';
const CACHE_NAME = `mhw-companion-${CACHE_VERSION}`;

const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-maskable.svg',
  '/js/app.js',
  '/js/state.js',
  '/js/data.js',
  '/js/theme.js',
  '/js/views/home.js',
  '/js/views/chest.js',
  '/js/views/forge.js',
  '/js/views/equipment.js',
  '/js/views/quests.js',
];

// ── Install : on met tout en cache ───────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate : on supprime les anciens caches ────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch : cache-first, réseau en fallback ──────────────
self.addEventListener('fetch', event => {
  // On ignore les requêtes non-GET et les extensions navigateur
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // Pas en cache → réseau, puis on met en cache pour la prochaine fois
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
