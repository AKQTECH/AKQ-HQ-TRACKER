const CACHE_NAME = 'bcy-v2';
const urlsToCache = [
  './',
  './index.html',
  './DESKTOP_VERSION.html',
  './manifest.json',
  './icon.jpg'
];

// Install — cache core files
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Activate — clear old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(name) { return name !== CACHE_NAME; })
             .map(function(name) { return caches.delete(name); })
      );
    })
  );
  self.clients.claim();
});

// Fetch — network first for HTML/API, cache fallback for assets
self.addEventListener('fetch', function(event) {
  // Never cache Notion API or CORS proxy calls
  if (event.request.url.includes('corsproxy.io') || event.request.url.includes('api.notion.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Network first, fall back to cache
  event.respondWith(
    fetch(event.request).then(function(response) {
      // Update cache with fresh version
      if (response.status === 200) {
        var responseClone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseClone);
        });
      }
      return response;
    }).catch(function() {
      return caches.match(event.request);
    })
  );
});
