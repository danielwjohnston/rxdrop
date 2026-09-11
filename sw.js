/**
 * Offline support. Every file the game needs is precached on install, so once
 * RxDrop has been opened it plays with the network off.
 */
const CACHE = 'rxdrop-v17';

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
  './src/periods.js',
  './src/art.js',
  './src/doctors.js',
  './src/modifiers.js',
  './src/formulary.js',
  './src/runtime-overhaul.js',
  './src/overhaul-ui.js',
  './src/phototherapy.js',
  './src/sonic-therapy.js',
  './src/music.js',
  './src/virus-theatre.js',
  './assets/favicon.svg',
  './assets/icon-180.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/medical-era-sprites.svg',
  './assets/virus-mascots.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
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
        return request.mode === 'navigate' ? caches.match('./index.html') : undefined;
      });
    }),
  );
});
