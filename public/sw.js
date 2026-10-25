/* Корона и Клинок — offline service worker + OTA shell support.
 * Precaches the app shell, hashed JS/CSS, webfonts and emoji icons so the game
 * keeps working with no network at all. An OTA bundle downloaded from GitHub
 * is served for navigations instead of the shipped index.html. */
const CACHE = 'corona-i-klinok-v4';
const OTA_PREFIX = 'corona-ota-shell-';
const OTA_KEY = '/__corona_ota_shell__';
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

async function otaShell() {
  try {
    const keys = (await caches.keys()).filter((k) => k.startsWith(OTA_PREFIX));
    for (const key of keys) {
      const cache = await caches.open(key);
      const hit = await cache.match(OTA_KEY);
      if (hit) return hit;
    }
  } catch (_) { /* no OTA bundle */ }
  return null;
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
      .then((keys) => Promise.all(keys
        .filter((k) => k !== CACHE && !k.startsWith(OTA_PREFIX))
        .map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_OTA') {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith(OTA_PREFIX)).map((k) => caches.delete(k)));
    })());
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const ota = await otaShell();
        if (ota) return ota;
        try {
          const res = await fetch(req);
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return res;
        } catch (_) {
          return (await caches.match('./index.html', { ignoreVary: true })) || Response.error();
        }
      })()
    );
    return;
  }

  /* Cache-first: hashed build assets are immutable; ignoreVary avoids misses
   * caused by dev/preview servers sending `Vary: Origin`. */
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
