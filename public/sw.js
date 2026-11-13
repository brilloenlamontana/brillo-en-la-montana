// Service worker of Brillo en la montaña: keeps the heavy files of the game (3D models, audio, textures, sprites and the
// Draco decoder) in the browser, so a second visit does not download them again nor ask the server about each one.
//
// Stale-while-revalidate: a file already kept is answered at once from the browser, and in the background it is asked
// for again so that a model replaced on the server shows up on the next visit. Everything else (the page, the code,
// Firebase) goes to the network untouched.

const CACHE = 'brillo-archivos-v1';
const KEPT = /^\/(models-3d|audio|textures|sprites-2d|draco)\//;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  // Older versions of the cache are dropped.
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name.startsWith('brillo-archivos-') && name !== CACHE).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Only the game's own files; a partial request (an <audio> seeking) is left to the browser.
  if (url.origin !== self.location.origin || !KEPT.test(url.pathname) || request.headers.has('range')) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const kept = await cache.match(request, { ignoreSearch: false });
      const fresh = fetch(request)
        .then((response) => {
          // Only whole, good answers are kept.
          if (response.ok && response.status === 200) cache.put(request, response.clone()).catch(() => undefined);
          return response;
        })
        .catch((error) => {
          if (kept) return kept;
          throw error;
        });
      if (kept) {
        event.waitUntil(fresh.catch(() => undefined));
        return kept;
      }
      return fresh;
    }),
  );
});
