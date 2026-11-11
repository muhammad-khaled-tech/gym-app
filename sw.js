// Offline support: app shell precached; same-origin requests network-first with cache fallback.
const VERSION = 'gymapp-2026-11-11-5';
const FONTS = 'gymapp-fonts-1';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './js/app.js', './js/store.js', './js/model.js',
  './js/engine/dates.js', './js/engine/bodycomp.js', './js/engine/energy.js', './js/engine/program.js',
  './js/engine/menu.js', './js/engine/reminders.js',
  './js/data/foods.js', './js/data/menus.js', './js/data/exercises.js', './js/data/videos.js',
  './js/ui/dom.js', './js/ui/icons.js', './js/ui/chart.js', './js/ui/weekchips.js', './js/ui/onboarding.js', './js/ui/today.js',
  './js/ui/meals.js', './js/ui/workout.js', './js/ui/progress.js', './js/ui/settings.js', './js/ui/plan.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== FONTS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // Google Fonts: cache-first so the design looks the same offline.
  if (req.method === 'GET' && (url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com')) {
    e.respondWith(caches.open(FONTS).then(async (cache) => {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
      return res;
    }));
    return;
  }
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  // Network first (fresh updates when online), cache fallback after 3 s or when offline.
  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const network = fetch(req, { cache: 'no-cache' }).then((res) => {
        if (res.ok) cache.put(req, res.clone());
        return res;
      });
      const timeout = new Promise((resolve) => setTimeout(resolve, 3000));
      try {
        const res = await Promise.race([network, timeout]);
        if (res) return res;
      } catch { /* offline */ }
      const cached = await cache.match(req, { ignoreSearch: true });
      return cached || network;
    }),
  );
});
