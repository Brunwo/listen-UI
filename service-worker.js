import { precacheAndRoute } from 'workbox-precaching';

// Ensure __APP_BASE__ is defined. It will be replaced by Vite during build.
// It should end with a slash if it's not the root. e.g., '/repo/' or '/'
const basePath = typeof __APP_BASE__ !== 'undefined' ? __APP_BASE__ : '/';

precacheAndRoute(self.__WB_MANIFEST);

const CACHE_NAME = 'mp3-player-cache-v1';

// Construct URLs relative to the base path
const urlsToCache = [
  basePath, // Cache the base path itself (e.g., /repo/ or /)
  `${basePath}index.html`,
  `${basePath}styles.css`,
  `${basePath}script.js`, // Assuming script.js is at the root of the dist output
  `${basePath}icons/imagepodcast.png`,
  `${basePath}icons/imagepodcast-transp500.png`,
  `${basePath}manifest.json`,
  `${basePath}offline.html`
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files:', urlsToCache);
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            return response;
          })
          .catch(() => {
            // When offline, serve the base-path-aware offline page
            return caches.match(`${basePath}offline.html`);
          });
      })
  );
});
