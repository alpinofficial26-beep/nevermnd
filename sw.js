const CACHE_NAME = 'nevermind-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './login.html',
  './register.html',
  './alvinfn.html',
  './profile.html',
  './manifest.json'
];

// Install: cache semua file statis
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: hapus cache lama
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: Network first, fallback ke cache
self.addEventListener('fetch', event => {
  // Jangan intercept Firebase / Google Fonts / API calls
  const url = new URL(event.request.url);
  if (
    url.origin.includes('firebaseapp.com') ||
    url.origin.includes('googleapis.com') ||
    url.origin.includes('gstatic.com') ||
    url.origin.includes('firebasedatabase.app') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Simpan ke cache jika berhasil
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
