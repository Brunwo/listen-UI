self.addEventListener('install', (e) => {
    e.waitUntil(
      caches.open('mp3-player-cache').then((cache) => cache.addAll([
        '/',
        '/index.html',
        '/styles.css',
        '/script.js',
        '/icons/icon-192x192.png',
        '/icons/icon-512x512.png',
      ]))
    );
  });
  
  self.addEventListener('fetch', (e) => {
    e.respondWith(
      caches.match(e.request).then((response) => response || fetch(e.request))
    );
  });
  