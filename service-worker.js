// ─── AKQ HQ SERVICE WORKER ────────────────────────────────────────────────────
// Bump VERSION every deploy. Bumping it also requires bumping the ?v= query
// in index.html's `navigator.serviceWorker.register('service-worker.js?v=...')`
// so the browser actually re-fetches THIS file. Otherwise iOS/Safari may keep
// the prior SW byte-identical and the "new" deploy never takes effect.
const VERSION = 'akq-hq-v33';

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
    ).then(() => self.clients.claim())
  );
});

// Allow the page to tell a waiting SW to activate immediately.
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// ─── FETCH ────────────────────────────────────────────────────────────────────
// Network-first for HTML so a new deploy is picked up on next load.
// Cache-first for static assets (icons, manifest) because they rarely change
// and we want offline support.
self.addEventListener('fetch', event => {
  // Pass through Dropbox API calls without caching
  if (event.request.url.includes('dropboxapi.com') || event.request.url.includes('dropbox.com')) {
    return;
  }
  if (!event.request.url.startsWith(self.location.origin)) return;
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isHTML =
    event.request.mode === 'navigate' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('/') ||
    event.request.destination === 'document';

  if (isHTML) {
    // Network-first: always try the network, fall back to cache only if offline.
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(VERSION).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() =>
        caches.match(event.request).then(c => c || caches.match('./index.html'))
      )
    );
    return;
  }

  // Cache-first for icons / manifest / other static assets.
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(VERSION).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
