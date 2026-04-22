// ─── AKQ HQ SERVICE WORKER ────────────────────────────────────────────────────
// Bump this version string every deploy to force cache refresh on all devices.
const VERSION = 'akq-hq-v21';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  './relay.html'
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

// ─── FETCH: network-first for API calls, cache-first for assets ───────────────
self.addEventListener('fetch', event => {
  // Pass through Dropbox API calls without caching
  if (event.request.url.includes('dropboxapi.com') || event.request.url.includes('dropbox.com')) {
    return;
  }
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (event.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(VERSION).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
