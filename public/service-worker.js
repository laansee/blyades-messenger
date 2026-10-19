// Минимальный Service Worker для прохождения проверки браузера на PWA
const CACHE_NAME = 'blyades-cache-v1';

self.addEventListener('install', (event) => {
  // Активируем скрипт сразу без ожидания
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // На этапе разработки просто пропускаем все сетевые запросы насквозь
  event.respondWith(fetch(event.request));
});
