/* Корона и Клинок — offline service worker.
   Precaches the app shell, hashed JS/CSS, webfonts and emoji icons so the
   game keeps working with no network at all. */
const CACHE = 'corona-i-klinok-v3';
const CORE = [
  './', './index.html', './manifest.webmanifest',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable.png',
];

async function collectUrls() {
  const urls = new Set(CORE);
  try {
    const html = await (await fetch('./index.html', { cache: 'no-store' })).text();
    const linkRe = /(?:src|href)="(\.\/assets\/[^"]+)"/g;
    let m;
    while ((m = linkRe.exec(html))) urls.add(m[1]);
    for (const asset of [...urls]) {
      if (!asset.endsWith('.css')) continue;
      try {
        const css = await (await fetch(asset, { cache: 'no-store' })).text();
        const re = /url\((?:"|')?(\.?\/?[^"')]+\.(?:woff2?|ttf|png|svg))(?:"|')?\)/g;
        let f;
        while ((f = re.exec(css))) {
          const name = f[1].replace(/^\.?\//, '');
          urls.add(name.startsWith('assets/') ? './' + name : './assets/' + name);
        }
      } catch (_) { /* font is optional */ }
    }
    try {
      const res = await fetch('./icons/emoji/manifest.json', { cache: 'no-store' });
      if (res.ok) {
        const files = await res.json();
        for (const f of files) urls.add('./icons/emoji/' + f);
      }
    } catch (_) { /* runtime cache will cover them */ }
  } catch (_) { /* still usable online */ }
  return [...urls];
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const urls = await collectUrls();
      await Promise.allSettled(urls.map((u) => cache.add(new Request(u, { cache: 'reload' }))));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Cache-first: hashed build assets are immutable, and ignoreVary avoids
  // misses caused by dev/preview servers sending `Vary: Origin`.
  event.respondWith(
    caches.match(req, { ignoreVary: true }).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
