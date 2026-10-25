/* Over-the-air updates from GitHub.
 *
 * The APK (or the installed PWA) never needs to be reinstalled: the game
 * downloads a fresh single-file HTML bundle, stores it locally and swaps it in
 * on restart. Progress lives in a separate storage key and is backed up right
 * before the swap, so an update can never reset the save.
 */
import { backupState, nativeStorage } from './state';
import { game } from './engine';
import { APP_VERSION } from './version';

const REPO = 'AlfaGideon/idleRPG';
const DEV_BRANCH = 'arena/6ffb08ea-idlerpg';
const MANIFEST_URLS = [
  `https://raw.githubusercontent.com/${REPO}/main/ota/manifest.json`,
  'https://cdn.jsdelivr.net/gh/AlfaGideon/idleRPG@main/ota/manifest.json',
  `https://raw.githubusercontent.com/${REPO}/${DEV_BRANCH}/ota/manifest.json`,
];
const FALLBACK_BUNDLES = [
  `https://raw.githubusercontent.com/${REPO}/main/ota/game.html`,
  `https://cdn.jsdelivr.net/gh/AlfaGideon/idleRPG@main/ota/game.html`,
  `https://raw.githubusercontent.com/${REPO}/${DEV_BRANCH}/ota/game.html`,
];
const OTA_CACHE = 'corona-ota-shell-v1';
const OTA_KEY = '/__corona_ota_shell__';
const LS_BUNDLE = 'corona-ota-bundle';
const LS_VERSION = 'corona-ota-version';
const SS_APPLIED = 'corona-ota-applied';
const CHECK_INTERVAL = 5 * 60 * 1000;

export interface UpdateManifest {
  version: string;
  notes: string;
  url: string;
  size: number;
  sha256?: string;
  publishedAt: string;
}

export type UpdateStatus = 'idle' | 'checking' | 'downloading' | 'ready' | 'latest' | 'error';

export interface UpdateView {
  status: UpdateStatus;
  version: string;
  current: string;
  notes: string;
  message: string;
  hasBundle: boolean;
}

type Listener = (v: UpdateView) => void;

export function compareVersions(a: string, b: string): number {
  const pa = a.split(/[.\-]/).map((x) => parseInt(x, 10) || 0);
  const pb = b.split(/[.\-]/).map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

function isNative(): boolean { return nativeStorage() !== null; }
function isHttp(): boolean { return /^https?:$/.test(location.protocol); }

function readBundleVersion(): string {
  const n = nativeStorage();
  if (n?.bundleVersion) { try { return n.bundleVersion() || ''; } catch { /* ignore */ } }
  try { return localStorage.getItem(LS_VERSION) || ''; } catch { return ''; }
}

function readBundle(): string {
  try { return localStorage.getItem(LS_BUNDLE) || ''; } catch { return ''; }
}

async function writeBundle(html: string, version: string): Promise<boolean> {
  const n = nativeStorage();
  if (n?.saveBundle) {
    try { n.saveBundle(html, version); return true; } catch { /* fall through */ }
  }
  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(OTA_CACHE);
      await cache.put(new Request(OTA_KEY, { cache: 'no-store' }),
        new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
      try { localStorage.setItem(LS_VERSION, version); } catch { /* ignore */ }
      return true;
    } catch { /* fall through */ }
  }
  try { localStorage.setItem(LS_BUNDLE, html); localStorage.setItem(LS_VERSION, version); return true; }
  catch { return false; }
}

async function fetchText(url: string, timeout = 12000): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { cache: 'no-store', signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally { clearTimeout(timer); }
}

async function loadManifest(): Promise<UpdateManifest | null> {
  for (const url of MANIFEST_URLS) {
    try {
      const raw = await fetchText(url);
      const m = JSON.parse(raw) as UpdateManifest;
      if (typeof m.version !== 'string' || !m.version) continue;
      if (m.url && !/^https?:\/\//.test(m.url)) m.url = new URL(m.url, url).href;
      return m;
    } catch { /* try next mirror */ }
  }
  return null;
}

async function verify(html: string, m: UpdateManifest): Promise<boolean> {
  if (html.length < 20000) return false;
  const head = html.slice(0, 400).toLowerCase();
  if (!head.includes('<!doctype html') && !head.includes('<html')) return false;
  if (m.size && html.length < m.size * 0.5) return false;
  if (m.sha256 && globalThis.crypto?.subtle) {
    try {
      const bytes = new TextEncoder().encode(html);
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const hex = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
      return hex.toLowerCase() === m.sha256.toLowerCase();
    } catch { return false; }
  }
  return true;
}

export interface UpdateController {
  view(): UpdateView;
  onChange(fn: Listener): () => void;
  check(force?: boolean): Promise<UpdateView>;
  apply(): void;
  dismiss(): void;
  start(): void;
  isNative(): boolean;
}

export function createUpdater(): UpdateController {
  const listeners: Listener[] = [];
  let status: UpdateStatus = 'idle';
  let version = APP_VERSION;
  let notes = '';
  let message = '';
  let hasBundle = false;
  let lastCheck = 0;
  let applying = false;

  const view = (): UpdateView => ({
    status, version, current: APP_VERSION, notes, message, hasBundle,
  });
  const emit = (): void => { const v = view(); for (const l of listeners) l(v); };
  const set = (patch: Partial<{ status: UpdateStatus; version: string; notes: string; message: string; hasBundle: boolean }>): void => {
    if (patch.status !== undefined) status = patch.status;
    if (patch.version !== undefined) version = patch.version;
    if (patch.notes !== undefined) notes = patch.notes;
    if (patch.message !== undefined) message = patch.message;
    if (patch.hasBundle !== undefined) hasBundle = patch.hasBundle;
    emit();
  };

  async function check(force = false): Promise<UpdateView> {
    const now = Date.now();
    if (!force && now - lastCheck < 30000) return view();
    lastCheck = now;
    set({ status: 'checking', message: 'Проверяем обновления…' });
    const m = await loadManifest();
    if (!m) {
      set({ status: 'error', message: 'Не удалось связаться с GitHub. Попробуйте позже.' });
      return view();
    }
    const storedVersion = readBundleVersion();
    const available = compareVersions(m.version, APP_VERSION) > 0
      || (storedVersion && compareVersions(storedVersion, APP_VERSION) > 0);
    if (!available) {
      set({ status: 'latest', version: m.version, message: 'У вас последняя версия.', hasBundle: false });
      return view();
    }

    /* A bundle we already downloaded in a previous session is ready to apply. */
    if (storedVersion && compareVersions(storedVersion, APP_VERSION) > 0 && !isNative() && !isHttp()) {
      const stored = readBundle();
      if (stored) {
        set({ status: 'ready', version: storedVersion, notes: m.notes,
          hasBundle: true, message: 'Обновление уже загружено. Перезапустите игру.' });
        return view();
      }
    }

    set({ status: 'downloading', version: m.version, notes: m.notes,
      message: `Скачиваем версию ${m.version}…` });
    let html = '';
    const urls = [m.url, ...FALLBACK_BUNDLES].filter((u, i, a) => u && a.indexOf(u) === i);
    for (const url of urls) {
      try { html = await fetchText(url, 20000); if (html.length > 20000) break; } catch { /* next */ }
    }
    if (!html || !(await verify(html, m))) {
      set({ status: 'error', message: 'Обновление повреждено — попробуйте позже.' });
      return view();
    }
    const ok = await writeBundle(html, m.version);
    if (!ok) {
      set({ status: 'error', message: 'Не хватило места для обновления.' });
      return view();
    }
    set({ status: 'ready', version: m.version, notes: m.notes, hasBundle: true,
      message: `Версия ${m.version} загружена. Перезапустите игру, чтобы применить.` });
    return view();
  }

  function apply(): void {
    if (applying) return;
    applying = true;
    /* Always preserve progress before swapping the code. */
    game.save();
    backupState(game.state);
    try {
      if (isNative()) {
        const n = nativeStorage();
        if (n?.applyUpdate) { n.applyUpdate(); return; }
      }
      if (isHttp()) { location.reload(); return; }
      const html = readBundle();
      if (html) {
        try { sessionStorage.setItem(SS_APPLIED, version); } catch { /* ignore */ }
        document.open(); document.write(html); document.close();
        return;
      }
    } finally { applying = false; }
    location.reload();
  }

  function start(): void {
    /* Auto-apply a bundle that was downloaded but ignored in a previous run. */
    const stored = readBundleVersion();
    if (stored && compareVersions(stored, APP_VERSION) > 0 && !isNative() && !isHttp()) {
      try {
        if (sessionStorage.getItem(SS_APPLIED) !== stored && readBundle()) {
          set({ status: 'ready', version: stored, hasBundle: true,
            message: `Вышла версия ${stored}. Перезапустите игру для обновления.` });
        }
      } catch { /* ignore */ }
    }
    setTimeout(() => { void check(true); }, 2500);
    setInterval(() => { if (!document.hidden) void check(); }, CHECK_INTERVAL);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && Date.now() - lastCheck > 60000) void check();
    });
  }

  return {
    view,
    onChange(fn) { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; },
    check,
    apply,
    dismiss() { set({ status: 'idle', message: '' }); },
    start,
    isNative,
  };
}

export const updater = createUpdater();
export { APP_VERSION };
