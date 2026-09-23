// Naikkan angka versi ini setiap kali ada perubahan pada file yang di-precache di bawah,
// supaya Service Worker lama otomatis dibersihkan dan pengguna mendapat versi terbaru.
const CACHE_NAME = 'happy-hitters-v14';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './logo.png',
  './icon-512.png',
  './icon-192.png',
  './apple-touch-icon.png',
  './favicon-32.png',
  './qrcode_min.js'
];

// ... (Sisa kode di sw.js biarkan sama persis seperti sebelumnya) ...
const EXCLUDED_HOSTS = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'www.googleapis.com',
  'firebaseinstallations.googleapis.com',
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url =>
          cache.add(url).catch(err => console.warn('SW: gagal cache', url, err))
        )
      );
    })
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || EXCLUDED_HOSTS.includes(new URL(req.url).hostname)) {
    return;
  }
  event.respondWith(
    fetch(req).then(response => {
      const clone = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(req, clone)).catch(() => {});
      return response;
    }).catch(() => {
      return caches.match(req).then(cached => {
        if (cached) return cached;
        if (req.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});
