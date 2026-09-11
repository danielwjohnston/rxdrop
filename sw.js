/**
 * Offline support. Every file the game needs is precached on install, so once
 * RxDrop has been opened it plays with the network off - on a plane, on the
 * underground, or installed to a home screen.
 *
 * Bump CACHE when the file list or any cached file changes: the new worker
 * precaches under the new name and deletes the old cache on activate.
 */
const CACHE = 'rxdrop-v18';

const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './src/styles.css',
  './src/main.js',
  './src/game.js',
  './src/board.js',
  './src/pill.js',
  './src/constants.js',
  './src/renderer.js',
  './src/audio.js',
  './src/input.js',
  './src/rng.js',
  './src/versus.js',
  './src/daily.js',
  './src/eras.js',
  './src/doctors.js',
  './src/modifiers.js',
  './src/formulary.js',
  './src/light.js',
  './assets/favicon.svg',
  './assets/icon-180.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // addAll is all-or-nothing, so a single 404 would leave the game
      // half-cached and broken offline; fetch each file and report what failed.
      .then((cache) =>
        Promise.all(
          PRECACHE.map((url) =>
            cache.add(new Request(url, { cache: 'reload' })).catch((error) => {
              console.warn(`[rxdrop] could not precache ${url}`, error);
            }),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      // Serve from cache first: the game is static and this is what makes it
      // work with no network. Refresh the entry in the background when online.
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      if (cached) {
        network.catch(() => {});
        return cached;
      }
      return network.then((response) => {
        if (response) return response;
        // A navigation with nothing cached still gets the shell if we have it.
        return request.mode === 'navigate' ? caches.match('./index.html') : undefined;
      });
    }),
  );
});
