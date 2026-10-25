import { ACHIEVEMENT_CHAINS, FORGE, HEROES, PERKS, SKILLS, SLOTS } from './data';
import type { EquipmentItem, GameState, ItemStats } from './types';

/* The storage key NEVER changes — this is what keeps progress across OTA
 * updates. New fields are added by `normalise`, never by resetting the save. */
const KEY = 'corona-i-klinok-save-v1';
const BACKUP_KEY = 'corona-i-klinok-backup-v2';
export const SAVE_VERSION = 2;

const ZERO_STATS: ItemStats = { damage: 0, armor: 0, dps: 0, gold: 0, regen: 0, crit: 0 };

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
    claimedTiers: [],
    stats: {
      kills: 0, bosses: 0, taps: 0, crits: 0, goldEarned: 0,
      maxWave: 1, heroesBought: 0, forgeBought: 0, prestiges: 0,
      playTime: 0, itemsFound: 0, damageTaken: 0, deaths: 0, skillsUsed: 0,
    },
    sound: true,
    effects: true,
    cooldowns: SKILLS.map(() => 0),
    fury: 0,
    furyTime: 0,
    lastSeen: now,
    createdAt: now,
    player: { level: 1, xp: 0, hp: 120, maxHp: 120, xpNext: 40 },
    equipment: SLOTS.map(() => null),
    inventory: [],
    autoSkills: true,
    autoEquip: true,
    enemyAttackTimer: 0,
    respawnTimer: 0,
    seenVersion: '',
    lootLog: [],
  };
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}
function pos(v: unknown, fallback = 0): number { return Math.max(0, num(v, fallback)); }

function arr(v: unknown, length: number): number[] {
  const source = Array.isArray(v) ? v : [];
  return Array.from({ length }, (_, i) => Math.max(0, Math.floor(num(source[i], 0))));
}

function strArr(v: unknown, max = 500): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, max) : [];
}

function item(v: unknown): EquipmentItem | null {
  if (!v || typeof v !== 'object') return null;
  const r = v as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.slot !== 'string') return null;
  if (!SLOTS.some((s) => s.id === r.slot)) return null;
  const rawStats = (r.stats && typeof r.stats === 'object' ? r.stats : {}) as Record<string, unknown>;
  return {
    id: r.id,
    slot: r.slot as EquipmentItem['slot'],
    name: typeof r.name === 'string' ? r.name.slice(0, 60) : 'Предмет',
    rarity: (['common', 'rare', 'epic', 'legendary'] as string[]).includes(String(r.rarity))
      ? r.rarity as EquipmentItem['rarity'] : 'common',
    power: pos(r.power, 1),
    level: Math.max(1, Math.floor(num(r.level, 1))),
    stats: {
      damage: pos(rawStats.damage), armor: pos(rawStats.armor), dps: pos(rawStats.dps),
      gold: pos(rawStats.gold), regen: pos(rawStats.regen),
      crit: Math.min(0.9, pos(rawStats.crit)),
    },
  };
}

/** Coerce anything found in storage into a valid, complete game state.
 *  Missing fields get defaults => an OTA update can never wipe progress. */
export function normalise(raw: unknown): GameState {
  const base = createState();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;
  const stats = (r.stats && typeof r.stats === 'object' ? r.stats : {}) as Record<string, unknown>;
  const player = (r.player && typeof r.player === 'object' ? r.player : {}) as Record<string, unknown>;
  const equipment = Array.isArray(r.equipment) ? r.equipment : [];

  const maxHp = Math.max(1, num(player.maxHp, 120));
  const s: GameState = {
    ...base,
    version: SAVE_VERSION,
    gold: pos(r.gold),
    glory: pos(r.glory),
    gloryEarned: pos(r.gloryEarned),
    wave: Math.max(1, Math.floor(num(r.wave, 1))),
    enemyHp: pos(r.enemyHp, 10),
    enemyMaxHp: Math.max(1, num(r.enemyMaxHp, 10)),
    bossTimer: pos(r.bossTimer),
    heroes: arr(r.heroes, HEROES.length),
    forge: arr(r.forge, FORGE.length),
    perks: arr(r.perks, PERKS.length),
    achievements: strArr(r.achievements),
    claimedTiers: strArr(r.claimedTiers),
    sound: typeof r.sound === 'boolean' ? r.sound : true,
    effects: typeof r.effects === 'boolean' ? r.effects : true,
    cooldowns: Array.from({ length: SKILLS.length }, (_, i) =>
      Math.max(0, num(Array.isArray(r.cooldowns) ? r.cooldowns[i] : 0, 0))),
    fury: Math.min(100, pos(r.fury)),
    furyTime: pos(r.furyTime),
    lastSeen: num(r.lastSeen, Date.now()),
    createdAt: num(r.createdAt, Date.now()),
    stats: {
      kills: pos(stats.kills), bosses: pos(stats.bosses), taps: pos(stats.taps),
      crits: pos(stats.crits), goldEarned: pos(stats.goldEarned),
      maxWave: Math.max(1, num(stats.maxWave, 1)),
      heroesBought: pos(stats.heroesBought), forgeBought: pos(stats.forgeBought),
      prestiges: pos(stats.prestiges), playTime: pos(stats.playTime),
      itemsFound: pos(stats.itemsFound), damageTaken: pos(stats.damageTaken),
      deaths: pos(stats.deaths), skillsUsed: pos(stats.skillsUsed),
    },
    player: {
      level: Math.max(1, Math.floor(num(player.level, 1))),
      xp: pos(player.xp),
      xpNext: Math.max(10, num(player.xpNext, 40)),
      maxHp,
      hp: Math.min(maxHp, Math.max(0, num(player.hp, maxHp))),
    },
    equipment: Array.from({ length: SLOTS.length }, (_, i) => {
      const it = item(equipment[i]);
      return it && it.slot === SLOTS[i].id ? it : null;
    }),
    inventory: (Array.isArray(r.inventory) ? r.inventory : [])
      .map(item).filter((x): x is EquipmentItem => x !== null).slice(0, 40),
    autoSkills: typeof r.autoSkills === 'boolean' ? r.autoSkills : true,
    autoEquip: typeof r.autoEquip === 'boolean' ? r.autoEquip : true,
    enemyAttackTimer: pos(r.enemyAttackTimer),
    respawnTimer: pos(r.respawnTimer),
    seenVersion: typeof r.seenVersion === 'string' ? r.seenVersion.slice(0, 40) : '',
    lootLog: strArr(r.lootLog, 8),
  };

  /* Migration from v1: old flat achievement ids become legacy-only entries;
   * chain progress is derived from lifetime stats so it is never lost. */
  const validTiers = new Set(ACHIEVEMENT_CHAINS.flatMap((c) =>
    c.tiers.map((_, i) => `${c.id}:${i}`)));
  s.claimedTiers = [...new Set(s.claimedTiers.filter((id) => validTiers.has(id)))];
  if (!r.claimedTiers && s.achievements.length) {
    for (const chain of ACHIEVEMENT_CHAINS) {
      for (let i = 0; i < chain.tiers.length; i++) {
        if (s.stats[chain.stat] >= chain.tiers[i].goal) {
          const id = `${chain.id}:${i}`;
          if (!s.claimedTiers.includes(id)) s.claimedTiers.push(id);
        }
      }
    }
    s.glory += Math.min(40, s.achievements.length);
    s.gloryEarned += Math.min(40, s.achievements.length);
  }
  if (s.player.hp <= 0) s.player.hp = s.player.maxHp;
  return s;
}

/* ------------------------------------------------------------------ storage
 * localStorage (PWA) / SharedPreferences (APK) / window.name / URL hash /
 * memory — in that order. OTA updates never touch these keys.
 * -------------------------------------------------------------------------- */
const NAME_PREFIX = 'CKS1:';
const HASH_PREFIX = '#save=';
let memorySave: string | null = null;
let memoryBackup: string | null = null;

interface NativeSave {
  load(): string;
  save(value: string): void;
  clear(): void;
  backup?(value: string): void;
  restore?(): string;
  saveBundle?(html: string, version: string): void;
  bundleVersion?(): string;
  applyUpdate?(): void;
  appVersion?(): string;
}
export function nativeStorage(): NativeSave | null {
  try {
    const n = (globalThis as unknown as { CKStorage?: NativeSave }).CKStorage;
    return n && typeof n.load === 'function' ? n : null;
  } catch { return null; }
}

function readRaw(key: string, prefix: string | null): string | null {
  const native = nativeStorage();
  if (key === KEY && native) {
    try { const value = native.load(); if (value) return value; } catch { /* ignore */ }
  }
  try { const value = localStorage.getItem(key); if (value !== null) return value; } catch { /* opaque origin */ }
  if (key === KEY) {
    try { if (window.name.startsWith(NAME_PREFIX)) return window.name.slice(NAME_PREFIX.length); } catch { /* ignore */ }
    try {
      if (location.hash.startsWith(HASH_PREFIX)) return decodeURIComponent(location.hash.slice(HASH_PREFIX.length));
    } catch { /* ignore */ }
    return memorySave;
  }
  if (prefix) { try { return (globalThis as Record<string, unknown>)[prefix] as string ?? null; } catch { /* ignore */ } }
  return memoryBackup;
}

function writeRaw(key: string, raw: string, isMain: boolean): void {
  if (isMain) {
    memorySave = raw;
    const native = nativeStorage();
    if (native) { try { native.save(raw); return; } catch { /* fall through */ } }
  } else {
    memoryBackup = raw;
    const native = nativeStorage();
    if (native?.backup) { try { native.backup(raw); return; } catch { /* fall through */ } }
  }
  let stored = false;
  try { localStorage.setItem(key, raw); stored = true; } catch { /* opaque origin */ }
  if (!stored && isMain) {
    try { window.name = NAME_PREFIX + raw; } catch { /* ignore */ }
    try { history.replaceState(null, '', HASH_PREFIX + encodeURIComponent(raw)); } catch { /* ignore */ }
  }
}

export function loadState(): GameState {
  const tryParse = (raw: string | null): GameState | null => {
    if (!raw) return null;
    try { return normalise(JSON.parse(raw)); } catch { return null; }
  };
  const native = nativeStorage();
  let restored = tryParse(readRaw(KEY, null));
  if (!restored && native?.restore) {
    try { restored = tryParse(native.restore()); } catch { /* ignore */ }
  }
  if (!restored) restored = tryParse(readRaw(BACKUP_KEY, '__ck_backup__'));
  return restored ?? createState();
}

export function saveState(s: GameState): void {
  s.lastSeen = Date.now();
  try { writeRaw(KEY, JSON.stringify(s), true); } catch { /* storage unavailable */ }
}

/** Called right before an OTA update is applied — an extra safety net. */
export function backupState(s: GameState): void {
  try { writeRaw(BACKUP_KEY, JSON.stringify(s), false); } catch { /* ignore */ }
}

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
  } catch { return null; }
}

export function wipeSave(): void {
  memorySave = null;
  memoryBackup = null;
  try { nativeStorage()?.clear(); } catch { /* ignore */ }
  for (const k of [KEY, BACKUP_KEY]) { try { localStorage.removeItem(k); } catch { /* ignore */ } }
  try { window.name = ''; } catch { /* ignore */ }
  try { history.replaceState(null, '', location.pathname + location.search); } catch { /* ignore */ }
}

export { ZERO_STATS };
