const CACHE = 'horas-pwa-v27';
const ASSETS = ['./','./index.html','./style.css','./app.js','./final-overrides.js','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request))));
