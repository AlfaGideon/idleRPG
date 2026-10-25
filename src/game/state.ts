import { ACHIEVEMENTS, FORGE, HEROES, PERKS, SKILLS } from './data';
import type { GameState } from './types';

const KEY = 'corona-i-klinok-save-v1';
export const SAVE_VERSION = 1;

export function createState(): GameState {
  const now = Date.now();
  return {
    version: SAVE_VERSION,
    gold: 0,
    glory: 0,
    gloryEarned: 0,
    wave: 1,
    enemyHp: 10,
    enemyMaxHp: 10,
    bossTimer: 0,
    heroes: HEROES.map(() => 0),
    forge: FORGE.map(() => 0),
    perks: PERKS.map(() => 0),
    achievements: [],
    stats: {
      kills: 0, bosses: 0, taps: 0, crits: 0, goldEarned: 0,
      maxWave: 1, heroesBought: 0, forgeBought: 0, prestiges: 0, playTime: 0,
    },
    sound: true,
    effects: true,
    cooldowns: SKILLS.map(() => 0),
    fury: 0,
    furyTime: 0,
    lastSeen: now,
    createdAt: now,
  };
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function arr(v: unknown, length: number): number[] {
  const source = Array.isArray(v) ? v : [];
  return Array.from({ length }, (_, i) => Math.max(0, Math.floor(num(source[i], 0))));
}

/** Coerce anything found in localStorage into a valid, complete game state. */
export function normalise(raw: unknown): GameState {
  const base = createState();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;
  const stats = (r.stats && typeof r.stats === 'object' ? r.stats : {}) as Record<string, unknown>;
  const s: GameState = {
    ...base,
    gold: Math.max(0, num(r.gold, 0)),
    glory: Math.max(0, num(r.glory, 0)),
    gloryEarned: Math.max(0, num(r.gloryEarned, 0)),
    wave: Math.max(1, Math.floor(num(r.wave, 1))),
    enemyHp: Math.max(0, num(r.enemyHp, 10)),
    enemyMaxHp: Math.max(1, num(r.enemyMaxHp, 10)),
    bossTimer: num(r.bossTimer, 0),
    heroes: arr(r.heroes, HEROES.length),
    forge: arr(r.forge, FORGE.length),
    perks: arr(r.perks, PERKS.length),
    achievements: Array.isArray(r.achievements) ? r.achievements.filter((x): x is string => typeof x === 'string') : [],
    sound: typeof r.sound === 'boolean' ? r.sound : true,
    effects: typeof r.effects === 'boolean' ? r.effects : true,
    cooldowns: Array.from({ length: SKILLS.length }, (_, i) =>
      Math.max(0, num(Array.isArray(r.cooldowns) ? r.cooldowns[i] : 0, 0))),
    fury: Math.min(100, Math.max(0, num(r.fury, 0))),
    furyTime: Math.max(0, num(r.furyTime, 0)),
    lastSeen: num(r.lastSeen, Date.now()),
    createdAt: num(r.createdAt, Date.now()),
    stats: {
      kills: Math.max(0, num(stats.kills, 0)),
      bosses: Math.max(0, num(stats.bosses, 0)),
      taps: Math.max(0, num(stats.taps, 0)),
      crits: Math.max(0, num(stats.crits, 0)),
      goldEarned: Math.max(0, num(stats.goldEarned, 0)),
      maxWave: Math.max(1, num(stats.maxWave, 1)),
      heroesBought: Math.max(0, num(stats.heroesBought, 0)),
      forgeBought: Math.max(0, num(stats.forgeBought, 0)),
      prestiges: Math.max(0, num(stats.prestiges, 0)),
      playTime: Math.max(0, num(stats.playTime, 0)),
    },
  };
  const validIds = new Set(ACHIEVEMENTS.map((a) => a.id));
  s.achievements = s.achievements.filter((id) => validIds.has(id));
  return s;
}

/* ------------------------------------------------------------------ storage
 * A regular PWA has localStorage. The standalone single-file build can be
 * opened from file://, where Chrome/Android treats the origin as opaque and
 * localStorage throws. Fall back to window.name, then to the URL fragment,
 * then to an in-memory value so the APK / offline HTML still keeps progress.
 * -------------------------------------------------------------------------- */
const NAME_PREFIX = 'CKS1:';
const HASH_PREFIX = '#save=';
let memorySave: string | null = null;

/** Injected by the native Android WebView wrapper via addJavascriptInterface. */
interface NativeSave { load(): string; save(value: string): void; clear(): void; }
function nativeStorage(): NativeSave | null {
  try {
    const n = (globalThis as unknown as { CKStorage?: NativeSave }).CKStorage;
    return n && typeof n.load === 'function' ? n : null;
  } catch { return null; }
}

function readRaw(): string | null {
  const native = nativeStorage();
  if (native) {
    try { const value = native.load(); if (value) return value; } catch { /* fall through */ }
  }
  try {
    const value = localStorage.getItem(KEY);
    if (value !== null) return value;
  } catch { /* opaque origin */ }
  try {
    if (typeof window !== 'undefined' && window.name.startsWith(NAME_PREFIX)) {
      return window.name.slice(NAME_PREFIX.length);
    }
  } catch { /* ignore */ }
  try {
    if (typeof location !== 'undefined' && location.hash.startsWith(HASH_PREFIX)) {
      return decodeURIComponent(location.hash.slice(HASH_PREFIX.length));
    }
  } catch { /* ignore */ }
  return memorySave;
}

function writeRaw(raw: string): void {
  memorySave = raw;
  const native = nativeStorage();
  if (native) {
    try { native.save(raw); return; } catch { /* fall through to web storage */ }
  }
  let stored = false;
  try { localStorage.setItem(KEY, raw); stored = true; } catch { /* opaque origin */ }
  if (!stored) {
    try { window.name = NAME_PREFIX + raw; } catch { /* ignore */ }
    try {
      history.replaceState(null, '', HASH_PREFIX + encodeURIComponent(raw));
    } catch { /* file:// may forbid history API */ }
  }
}

export function loadState(): GameState {
  try {
    const raw = readRaw();
    if (!raw) return createState();
    return normalise(JSON.parse(raw));
  } catch {
    return createState();
  }
}

export function saveState(s: GameState): void {
  s.lastSeen = Date.now();
  try { writeRaw(JSON.stringify(s)); } catch { /* storage unavailable — game still playable */ }
}

/** Exposed for the settings screen: true when localStorage is unavailable. */
export function isFallbackStorage(): boolean {
  try { localStorage.setItem('__ck_test__', '1'); localStorage.removeItem('__ck_test__'); return false; }
  catch { return true; }
}

export function exportSave(s: GameState): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(s))));
}

export function importSave(text: string): GameState | null {
  try {
    const json = decodeURIComponent(escape(atob(text.trim())));
    return normalise(JSON.parse(json));
  } catch {
    return null;
  }
}

export function wipeSave(): void {
  memorySave = null;
  try { nativeStorage()?.clear(); } catch { /* ignore */ }
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  try { window.name = ''; } catch { /* ignore */ }
  try { history.replaceState(null, '', location.pathname + location.search); } catch { /* ignore */ }
}
