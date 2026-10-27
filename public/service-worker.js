const CACHE_NAME = 'blyades-cache-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // НЕ вызываем event.respondWith: браузер выполняет все сетевые запросы,
  // навигацию, куки и WebSocket нативно без реджектов и падений.
  return;
});