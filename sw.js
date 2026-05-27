// sw.js — ALVINVN Music Player Service Worker
// Versi dengan background timer yang tidak dibekukan Chrome
// saat tab tidak aktif / app lain (GTA, dll) sedang berjalan.

const SW_VERSION = 'alvinvn-v3';

// ── Install & Activate ──────────────────────────────────────
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// ── Background Timer ─────────────────────────────────────────
// Halaman utama meminta timer lewat postMessage.
// SW menjalankan setInterval DI SINI (thread SW tidak dibekukan Chrome)
// lalu mengirim BG_TICK ke semua client yang terbuka.

const _timers = {}; // id → intervalId

self.addEventListener('message', (e) => {
  const data = e.data;
  if (!data || !data.type) return;

  if (data.type === 'START_TIMER') {
    const id = data.id || 'default';
    const interval = data.interval || 800;
    // Hentikan timer lama jika ada
    if (_timers[id]) { clearInterval(_timers[id]); delete _timers[id]; }
    _timers[id] = setInterval(async () => {
      // Kirim BG_TICK ke semua client (tab) yang masih terbuka
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: false });
      for (const client of clients) {
        try { client.postMessage({ type: 'BG_TICK', id }); } catch(err) {}
      }
    }, interval);
    // Konfirmasi ke pengirim
    try { e.source.postMessage({ type: 'TIMER_STARTED', id }); } catch(err) {}
  }

  if (data.type === 'STOP_TIMER') {
    const id = data.id || 'default';
    if (_timers[id]) { clearInterval(_timers[id]); delete _timers[id]; }
    try { e.source.postMessage({ type: 'TIMER_STOPPED', id }); } catch(err) {}
  }

  if (data.type === 'SW_READY') {
    try { e.source.postMessage({ type: 'SW_READY' }); } catch(err) {}
  }
});

// ── Fetch: Network-first dengan cache fallback ───────────────
self.addEventListener('fetch', (e) => {
  // Lewati request non-GET dan cross-origin
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Cache respons yang berhasil untuk file statis
        if (res && res.status === 200) {
          const resClone = res.clone();
          caches.open(SW_VERSION).then(cache => cache.put(e.request, resClone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
