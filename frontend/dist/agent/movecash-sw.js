const CACHE_NAME = 'movecash-agent-v34';
const PRECACHE_URLS = [
  '/movecash-manifest.webmanifest',
  '/logos/jbcash-logo.png',
  '/movecash/jbcash-logo.png',
  '/movecash/icon-192.png',
  '/movecash/icon-512.png',
];

function isNavigationRequest(request) {
  if (request.mode === 'navigate') return true;
  const accept = request.headers.get('accept') || '';
  return accept.includes('text/html');
}

function isAgentAppPath(pathname) {
  return (
    pathname === '/agent-app'
    || pathname === '/jbcash-agent'
    || pathname.startsWith('/agent/')
    || pathname === '/agent'
    || pathname.startsWith('/movecash/download/')
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;

  const isAppPath = isAgentAppPath(url.pathname);
  const isStaticAsset =
    url.pathname.startsWith('/assets/')
    || url.pathname.startsWith('/images/')
    || url.pathname.startsWith('/logos/')
    || url.pathname.startsWith('/movecash/');

  if (!isAppPath && !isStaticAsset) return;

  if (isNavigationRequest(request)) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request)),
    );
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type !== 'opaque') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => cached);
    }),
  );
});
