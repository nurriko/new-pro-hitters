const CACHE_NAME = 'happy-hitters-v4'; // Ubah versi cache ini untuk memicu update OTA
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './logo.png'
];

// Domain Firebase/Firestore TIDAK BOLEH dicegat oleh Service Worker:
// - Auth pakai request POST (cache.put akan reject untuk non-GET)
// - Firestore onSnapshot pakai koneksi streaming yang rusak kalau di-buffer oleh SW
// - Respons API bisa berisi token/data user lain, tidak aman disimpan di Cache Storage
const EXCLUDED_HOSTS = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'www.googleapis.com',
  'firebaseinstallations.googleapis.com',
];

self.addEventListener('install', event => {
  self.skipWaiting(); // Memaksa SW baru untuk segera aktif
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Pakai add() satu-satu (bukan addAll) + allSettled, supaya kalau ada 1 file yang gagal
      // (misal logo.png belum diupload), instalasi SW TETAP LANJUT untuk file lain yang berhasil,
      // bukan gagal total tanpa keterangan.
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url =>
          cache.add(url).catch(err => console.warn('SW: gagal cache', url, err))
        )
      );
    })
  );
});

// Strategi Network-First untuk OTA Update
self.addEventListener('fetch', event => {
  const req = event.request;

  // Biarkan Firebase Auth & Firestore lewat apa adanya, tidak dicegat SW sama sekali
  if (req.method !== 'GET' || EXCLUDED_HOSTS.includes(new URL(req.url).hostname)) {
    return;
  }

  event.respondWith(
    fetch(req).then(response => {
      const clone = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(req, clone)).catch(() => {});
      return response;
    }).catch(() => {
      // Jika offline, ambil dari cache
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
            // Hapus cache versi lama agar update OTA berjalan
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});
