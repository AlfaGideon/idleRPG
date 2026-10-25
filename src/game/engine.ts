import {
  ACHIEVEMENTS, FORGE, HEROES, PERKS, REGIONS, SKILLS,
  WAVES_PER_REGION, regionIndex,
} from './data';
import { createState, loadState, saveState } from './state';
import type { AchievementDef, EnemyDef, GameState, Region } from './types';

/* ------------------------------------------------------------------ balance */

export const HERO_COST_GROWTH = 1.135;
export const BOSS_TIME = 30;
export const MILESTONES = [10, 25, 50, 75, 100, 150, 200, 300, 400, 600, 800, 1000];

export function isBoss(wave: number): boolean {
  return wave % 10 === 0;
}

export function enemyHpFor(wave: number): number {
  const w = Math.max(1, wave);
  const cycle = Math.floor((w - 1) / (WAVES_PER_REGION * REGIONS.length));
  const hp = 10 * Math.pow(1.155, w - 1) * (1 + (w - 1) * 0.055)
    * (isBoss(w) ? 4.2 : 1) * Math.pow(1.45, cycle);
  return Math.max(1, Math.ceil(hp));
}

export function goldFor(wave: number): number {
  const w = Math.max(1, wave);
  const base = 5 * Math.pow(1.135, w - 1) * (1 + (w - 1) * 0.045);
  return Math.max(1, Math.ceil(base * (isBoss(w) ? 3.5 : 1)));
}

export function heroCostAt(index: number, level: number): number {
  return Math.ceil(HEROES[index].baseCost * Math.pow(HERO_COST_GROWTH, level));
}

function heroCostRange(index: number, level: number, qty: number): number {
  const a = HEROES[index].baseCost * Math.pow(HERO_COST_GROWTH, level);
  const r = HERO_COST_GROWTH;
  return Math.ceil(a * (Math.pow(r, qty) - 1) / (r - 1));
}

export function forgeCostAt(index: number, level: number): number {
  const f = FORGE[index];
  return Math.ceil(f.baseCost * Math.pow(f.growth, level));
}

export function perkCostAt(level: number): number {
  return 1 + level * 2;
}

export function prestigeGlory(wave: number): number {
  return Math.max(0, Math.floor(Math.pow(Math.max(0, wave - 9), 1.3) / 5));
}

export function enemyFor(wave: number): EnemyDef {
  const region = REGIONS[regionIndex(wave)];
  if (isBoss(wave)) return region.boss;
  return region.enemies[(wave - 1) % region.enemies.length];
}

export function regionFor(wave: number): Region {
  return REGIONS[regionIndex(wave)];
}

/* ------------------------------------------------------------------- events */

export type GameEvent =
  | { type: 'hit'; amount: number; crit: boolean; x: number; y: number }
  | { type: 'skill'; name: string; amount: number }
  | { type: 'kill'; gold: number; boss: boolean }
  | { type: 'wave'; wave: number; boss: boolean; regionChanged: boolean }
  | { type: 'gold'; amount: number }
  | { type: 'buy'; label: string }
  | { type: 'toast'; text: string; kind: 'info' | 'good' | 'bad' }
  | { type: 'shake' }
  | { type: 'prestige'; glory: number }
  | { type: 'enemy' };

type Listener = (e: GameEvent) => void;

export interface OfflineResult {
  seconds: number;
  capped: boolean;
  gold: number;
  waves: number;
}

/* -------------------------------------------------------------------- engine */

export class Game {
  state: GameState;
  private listeners: Listener[] = [];
  private autoAccum = 0;
  private saveTimer = 0;

  constructor(state?: GameState) {
    this.state = state ?? createState();
  }

  on(fn: Listener): () => void {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter((l) => l !== fn); };
  }

  emit(e: GameEvent): void {
    for (const l of this.listeners) l(e);
  }

  /* -------------------------------------------------------------- derived */

  get wave(): number { return this.state.wave; }
  get gold(): number { return this.state.gold; }
  get glory(): number { return this.state.glory; }
  get boss(): boolean { return isBoss(this.state.wave); }

  heroDpsAt(index: number, level: number): number {
    if (level <= 0) return 0;
    const milestones = MILESTONES.filter((m) => level >= m).length;
    return HEROES[index].baseDps * level * Math.pow(1.055, level) * Math.pow(2, milestones);
  }

  private get dpsMultiplier(): number {
    return (1 + this.state.forge[3] * 0.06) * (1 + this.state.perks[2] * 0.15);
  }

  heroDpsShare(index: number): number {
    return this.heroDpsAt(index, this.state.heroes[index]) * this.dpsMultiplier;
  }

  heroDpsNext(index: number, qty: number): number {
    return this.heroDpsAt(index, this.state.heroes[index] + qty) * this.dpsMultiplier;
  }

  heroDps(): number {
    const s = this.state;
    let raw = 0;
    for (let i = 0; i < HEROES.length; i++) raw += this.heroDpsAt(i, s.heroes[i]);
    return raw * this.dpsMultiplier;
  }

  get damageMultiplier(): number { return this.state.furyTime > 0 ? 2 : 1; }

  baseTap(): number {
    const l = this.state.forge[0];
    return (5 + 4 * l) * Math.pow(1.09, l);
  }

  tapDamage(): number {
    return this.baseTap() * (1 + this.state.perks[0] * 0.15) + this.heroDps() * 0.25;
  }

  critChance(): number { return Math.min(0.65, 0.05 + this.state.forge[1] * 0.015); }
  critMult(): number { return 2 + this.state.perks[3] * 0.25; }
  goldMult(): number {
    return (1 + this.state.forge[2] * 0.08) * (1 + this.state.perks[1] * 0.15);
  }
  autoTaps(): number { return this.state.forge[4] * 0.5 * (this.state.furyTime > 0 ? 2 : 1); }
  offlineCap(): number { return (4 * 3600) + this.state.forge[5] * 45 * 60; }
  offlineEfficiency(): number { return Math.min(1, 0.7 + this.state.forge[5] * 0.05); }

  waveGold(): number { return goldFor(this.state.wave) * this.goldMult(); }

  /* -------------------------------------------------------------- combat */

  spawnEnemy(): void {
    const s = this.state;
    s.enemyMaxHp = enemyHpFor(s.wave);
    s.enemyHp = s.enemyMaxHp;
    s.bossTimer = this.boss ? BOSS_TIME : 0;
    this.emit({ type: 'enemy' });
  }

  private addGold(amount: number): void {
    if (amount <= 0) return;
    this.state.gold += amount;
    this.state.stats.goldEarned += amount;
    this.emit({ type: 'gold', amount });
  }

  private kill(): void {
    const s = this.state;
    const boss = isBoss(s.wave);
    const reward = goldFor(s.wave) * this.goldMult();
    this.addGold(reward);
    s.stats.kills++;
    if (boss) s.stats.bosses++;
    s.fury = Math.min(100, s.fury + (boss ? 25 : 8));
    const previousRegion = regionIndex(s.wave);
    s.wave++;
    s.stats.maxWave = Math.max(s.stats.maxWave, s.wave);
    this.emit({ type: 'kill', gold: reward, boss });
    this.emit({ type: 'wave', wave: s.wave, boss: this.boss, regionChanged: regionIndex(s.wave) !== previousRegion });
    this.spawnEnemy();
  }

  private applyDamage(amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) return;
    let remaining = amount * this.damageMultiplier;
    let guard = 0;
    while (remaining > 0 && guard++ < 250) {
      if (remaining < this.state.enemyHp) {
        this.state.enemyHp -= remaining;
        remaining = 0;
      } else {
        remaining -= this.state.enemyHp;
        this.state.enemyHp = 0;
        this.kill();
      }
    }
  }

  private rollDamage(base: number): { amount: number; crit: boolean } {
    const crit = Math.random() < this.critChance();
    return { amount: base * (crit ? this.critMult() : 1), crit };
  }

  /** Manual tap on the enemy. x/y are relative to the arena, 0..1. */
  tap(x = 0.5, y = 0.5): void {
    const s = this.state;
    s.stats.taps++;
    const { amount, crit } = this.rollDamage(this.tapDamage());
    if (crit) s.stats.crits++;
    s.fury = Math.min(100, s.fury + 1.5);
    this.applyDamage(amount);
    this.emit({ type: 'hit', amount, crit, x, y });
    if (crit) this.emit({ type: 'shake' });
  }

  useSkill(index: number): boolean {
    const s = this.state;
    if (s.cooldowns[index] > 0) return false;
    const def = SKILLS[index];
    if (index === 0) {
      const { amount } = this.rollDamage(this.tapDamage() * 15);
      this.applyDamage(amount);
      this.emit({ type: 'skill', name: def.name, amount });
    } else if (index === 1) {
      const amount = this.heroDps() * 30;
      this.applyDamage(amount);
      this.emit({ type: 'skill', name: def.name, amount });
    } else {
      const amount = this.waveGold() * 30;
      this.addGold(amount);
      this.emit({ type: 'skill', name: def.name, amount });
    }
    s.cooldowns[index] = def.cooldown;
    this.emit({ type: 'shake' });
    return true;
  }

  activateFury(): boolean {
    if (this.state.fury < 100 || this.state.furyTime > 0) return false;
    this.state.fury = 0;
    this.state.furyTime = 15;
    this.emit({ type: 'toast', text: '🔥 ЯРОСТЬ КОРОЛЯ! Урон ×2 на 15 сек', kind: 'good' });
    this.emit({ type: 'shake' });
    return true;
  }

  tick(dt: number): void {
    const s = this.state;
    const d = Math.max(0, Math.min(dt, 1));
    s.stats.playTime += d;
    for (let i = 0; i < s.cooldowns.length; i++) {
      s.cooldowns[i] = Math.max(0, s.cooldowns[i] - d);
    }
    if (s.furyTime > 0) s.furyTime = Math.max(0, s.furyTime - d);

    const dps = this.heroDps();
    if (dps > 0) this.applyDamage(dps * d);

    const taps = this.autoTaps();
    if (taps > 0) {
      this.autoAccum += taps * d;
      let guard = 0;
      while (this.autoAccum >= 1 && guard++ < 30) {
        this.autoAccum -= 1;
        const { amount, crit } = this.rollDamage(this.tapDamage());
        if (crit) s.stats.crits++;
        s.fury = Math.min(100, s.fury + 0.7);
        this.applyDamage(amount);
        this.emit({ type: 'hit', amount, crit, x: 0.35 + Math.random() * 0.3, y: 0.38 + Math.random() * 0.2 });
      }
    }

    if (this.boss && s.bossTimer > 0) {
      s.bossTimer = Math.max(0, s.bossTimer - d);
      if (s.bossTimer === 0) {
        s.enemyHp = s.enemyMaxHp;
        s.bossTimer = BOSS_TIME;
        this.emit({ type: 'toast', text: 'Босс восстановил силы! Попробуйте снова.', kind: 'bad' });
        this.emit({ type: 'shake' });
      }
    }

    this.saveTimer += d;
    if (this.saveTimer >= 10) { this.saveTimer = 0; this.save(); }
  }

  /* --------------------------------------------------------------- offline */

  applyOffline(seconds: number): OfflineResult | null {
    const cap = this.offlineCap();
    const elapsed = Math.min(Math.max(0, seconds), cap);
    if (elapsed < 30) { this.spawnEnemy(); return null; }
    const dps = this.heroDps();
    const result: OfflineResult = { seconds: elapsed, capped: seconds > cap, gold: 0, waves: 0 };
    if (dps <= 0) { this.spawnEnemy(); return result; }

    const s = this.state;
    const eff = this.offlineEfficiency();
    let remain = elapsed;
    let guard = 0;
    if (s.enemyHp <= 0 || s.enemyMaxHp <= 0) this.spawnEnemy();
    while (remain > 0 && guard++ < 400) {
      const timeToKill = s.enemyHp / dps;
      if (timeToKill > remain) {
        s.enemyHp = Math.max(0, s.enemyHp - dps * remain);
        remain = 0;
        break;
      }
      remain -= timeToKill;
      const w = s.wave;
      result.gold += goldFor(w) * this.goldMult() * eff;
      s.stats.kills++;
      if (isBoss(w)) s.stats.bosses++;
      s.wave = w + 1;
      s.stats.maxWave = Math.max(s.stats.maxWave, s.wave);
      result.waves++;
      s.enemyMaxHp = enemyHpFor(s.wave);
      s.enemyHp = s.enemyMaxHp;
    }
    this.addGold(result.gold);
    s.bossTimer = this.boss ? BOSS_TIME : 0;
    this.emit({ type: 'enemy' });
    return result;
  }

  /* -------------------------------------------------------------- shopping */

  heroBuyCount(index: number, mode: 'x1' | 'x10' | 'max'): number {
    const level = this.state.heroes[index];
    if (mode === 'x1') return 1;
    if (mode === 'x10') return 10;
    let lo = 0, hi = 2000;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (heroCostRange(index, level, mid) <= this.state.gold) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  heroCost(index: number, mode: 'x1' | 'x10' | 'max'): { qty: number; cost: number } {
    const qty = this.heroBuyCount(index, mode);
    return { qty, cost: qty > 0 ? heroCostRange(index, this.state.heroes[index], qty) : heroCostAt(index, this.state.heroes[index]) };
  }

  buyHero(index: number, mode: 'x1' | 'x10' | 'max'): boolean {
    const s = this.state;
    const { qty, cost } = this.heroCost(index, mode);
    if (qty < 1 || s.gold < cost) return false;
    s.gold -= cost;
    s.heroes[index] += qty;
    s.stats.heroesBought += qty;
    this.emit({ type: 'buy', label: `${HEROES[index].title} +${qty}` });
    return true;
  }

  buyForge(index: number): boolean {
    const s = this.state;
    const f = FORGE[index];
    const level = s.forge[index];
    if (f.max !== undefined && level >= f.max) return false;
    const cost = forgeCostAt(index, level);
    if (s.gold < cost) return false;
    s.gold -= cost;
    s.forge[index]++;
    s.stats.forgeBought++;
    this.emit({ type: 'buy', label: f.name });
    return true;
  }

  buyPerk(index: number): boolean {
    const s = this.state;
    const cost = perkCostAt(s.perks[index]);
    if (s.glory < cost) return false;
    s.glory -= cost;
    s.perks[index]++;
    this.emit({ type: 'buy', label: PERKS[index].name });
    return true;
  }

  canPrestige(): boolean { return this.state.wave >= 25; }
  nextGlory(): number { return prestigeGlory(this.state.wave); }

  prestige(): number {
    if (!this.canPrestige()) return 0;
    const s = this.state;
    const gain = this.nextGlory();
    s.gold = 0;
    s.wave = 1;
    s.heroes = s.heroes.map(() => 0);
    s.forge = s.forge.map(() => 0);
    s.cooldowns = s.cooldowns.map(() => 0);
    s.fury = 0;
    s.furyTime = 0;
    s.glory += gain;
    s.gloryEarned += gain;
    s.stats.prestiges++;
    this.autoAccum = 0;
    this.spawnEnemy();
    this.emit({ type: 'prestige', glory: gain });
    return gain;
  }

  /* --------------------------------------------------------- achievements */

  achievementUnlocked(a: AchievementDef): boolean {
    return this.state.stats[a.stat] >= a.goal(this.state.stats[a.stat]);
  }

  achievementClaimed(a: AchievementDef): boolean {
    return this.state.achievements.includes(a.id);
  }

  claimableCount(): number {
    return ACHIEVEMENTS.filter((a) => this.achievementUnlocked(a) && !this.achievementClaimed(a)).length;
  }

  claimAchievement(id: string): boolean {
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (!a || !this.achievementUnlocked(a) || this.achievementClaimed(a)) return false;
    this.state.achievements.push(id);
    this.state.glory += a.reward;
    this.state.gloryEarned += a.reward;
    this.emit({ type: 'toast', text: `🏆 ${a.name}: +${a.reward} славы`, kind: 'good' });
    return true;
  }

  /* ------------------------------------------------------------------ misc */

  save(): void { saveState(this.state); }

  replaceState(next: GameState): void {
    this.state = next;
    this.autoAccum = 0;
    this.saveTimer = 0;
    this.save();
  }

  reset(): void {
    const sound = this.state.sound;
    const effects = this.state.effects;
    this.state = createState();
    this.state.sound = sound;
    this.state.effects = effects;
    this.spawnEnemy();
    this.save();
  }
}

export const game = new Game(loadState());
