// ─── Service Worker — Catatan Saya ───────────────────────────────────────────
const CACHE_NAME = 'catatan-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  'https://fonts.googleapis.com/css2?family=Google+Sans:wght@300;400;500;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
];
 
// ─── Install: cache semua aset ────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache lokal dulu, lalu coba eksternal (tidak fatal jika gagal)
      const local = ASSETS.filter(a => !a.startsWith('http'));
      const external = ASSETS.filter(a => a.startsWith('http'));
      return cache.addAll(local).then(() =>
        Promise.allSettled(external.map(url => cache.add(url)))
      );
    }).then(() => self.skipWaiting())
  );
});
 
// ─── Activate: bersihkan cache lama ──────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});
 
// ─── Fetch: Cache-first untuk aset statis, Network-first untuk lainnya ────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
 
  // Hanya tangani GET
  if (request.method !== 'GET') return;
 
  // Strategi: Cache-first untuk aset statis (CSS, JS, font, gambar)
  const isStatic =
    url.pathname.match(/\.(css|js|png|jpg|jpeg|svg|ico|woff2?)$/) ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('cdnjs.cloudflare.com');
 
  if (isStatic) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(request, clone));
        return res;
      }))
    );
    return;
  }
 
  // Strategi: Network-first untuk HTML (agar selalu fresh)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
  }
});