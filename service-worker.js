// ─── AKQ HQ SERVICE WORKER ────────────────────────────────────────────────────
// Bump this version string every deploy to force cache refresh on all devices.
const VERSION = 'akq-hq-v5';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.jpg'
];

// ─── INSTALL: cache all app assets ────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION).then(cache => cache.addAll(ASSETS))
  );
  // Take over immediately — don't wait for old tabs to close
  self.skipWaiting();
});

// ─── ACTIVATE: delete any old caches ──────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))
    )
  );
  // Claim all open tabs right away
  self.clients.claim();
});

// ─── FETCH: cache-first, fall back to network ─────────────────────────────────
self.addEventListener('fetch', event => {
  // Only handle same-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache successful GET responses
        if (event.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(VERSION).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
