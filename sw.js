// ============================================================
//  sw.js — Service worker Portal PDPR
//  • Rangkaian dahulu (sentiasa versi terkini); cache hanya sebagai sandaran luar talian
//  • Hanya fail laman sendiri (GET, asal sama). Firebase / Apps Script / Drive tidak disentuh.
// ============================================================
const CACHE = 'pdpr-v2';
const ASAS = ['./', './index.html', './kelas.html', './assets/css/style.css', './assets/img/icon-192.png', './data/jadual.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASAS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    // cache:'no-cache' → sentiasa semak dengan server (ETag/304), elak campuran fail lama + baharu selepas kemas kini
    fetch(req, { cache: 'no-cache' })
      .then((res) => {
        if (res.ok) { const salin = res.clone(); caches.open(CACHE).then((c) => c.put(req, salin)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then((r) => r || caches.match('./index.html')))
  );
});
