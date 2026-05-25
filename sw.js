// ── MHW Companion — Service Worker ──────────────────────
const CACHE_NAME = 'mhw-companion-v3';

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

// ── Install : précache les fichiers essentiels ───────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate : supprime les anciens caches ───────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch : network-first pour JS/CSS/HTML, cache-first pour images ──
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  const url = new URL(event.request.url);
  const isAsset = /\.(webp|png|svg|ico)$/.test(url.pathname);

  if (isAsset) {
    // Images → cache-first (elles changent rarement)
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
  } else {
    // JS / CSS / HTML → network-first (toujours à jour, fallback cache si hors-ligne)
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  }
});
