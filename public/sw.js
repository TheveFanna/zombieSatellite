// zombieSatellite Service_Worker (S6 design "Service worker").
// Caches only Shell_Assets. Every other request, including /api/tle and CelesTrak, is not intercepted
// and is never cached or answered from the cache. Bump CACHE whenever this file changes.
const CACHE = 'zombiesat-shell-v4';
const SHELL_DOCUMENTS = ['/', '/session', '/ar', '/catalog', '/cards'];

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/');
}

function isShellDocument(request, url) {
  return request.mode === 'navigate' && SHELL_DOCUMENTS.includes(url.pathname) && url.search === '';
}

function cacheFirst(request) {
  return caches.open(CACHE).then((cache) =>
    cache.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        }),
    ),
  );
}

function networkFirst(request) {
  return caches.open(CACHE).then((cache) =>
    fetch(request)
      .then((response) => {
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
      .catch(() => cache.match(request).then((hit) => hit || Response.error())),
  );
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
  } else if (isShellDocument(request, url)) {
    event.respondWith(networkFirst(request));
  }
});
