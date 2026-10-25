import {
  ACHIEVEMENT_CHAINS, FORGE, HEROES, PERKS, RARITY_ORDER, REGIONS, SKILLS,
  SLOTS, WAVES_PER_REGION, itemName, regionIndex,
} from './data';
import { backupState, createState, loadState, saveState } from './state';
import type {
  AchievementChain, EnemyDef, EquipmentItem, GameState, ItemRarity, Region,
} from './types';

export const HERO_COST_GROWTH = 1.135;
export const BOSS_TIME = 30;
export const MILESTONES = [10, 25, 50, 75, 100, 150, 200, 300, 400, 600, 800, 1000];
const RESPAWN_TIME = 4;

export function isBoss(wave: number): boolean { return wave % 10 === 0; }

export function enemyHpFor(wave: number): number {
  const w = Math.max(1, wave);
  const cycle = Math.floor((w - 1) / (WAVES_PER_REGION * REGIONS.length));
  const hp = 18 * Math.pow(1.17, w - 1) * (1 + (w - 1) * 0.055)
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
export function perkCostAt(level: number): number { return 1 + level * 2; }
export function prestigeGlory(wave: number): number {
  return Math.max(0, Math.floor(Math.pow(Math.max(0, wave - 9), 1.3) / 5));
}

export function enemyFor(wave: number): EnemyDef {
  const region = REGIONS[regionIndex(wave)];
  if (isBoss(wave)) return region.boss;
  return region.enemies[(wave - 1) % region.enemies.length];
}
export function regionFor(wave: number): Region { return REGIONS[regionIndex(wave)]; }

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
  | { type: 'enemy'; def: EnemyDef; boss: boolean }
  | { type: 'enemyHit'; amount: number }
  | { type: 'enemyDown'; boss: boolean }
  | { type: 'heroHit'; amount: number; hp: number }
  | { type: 'heroStrike' }
  | { type: 'enemyAttack' }
  | { type: 'heroDown' }
  | { type: 'heroRespawn' }
  | { type: 'loot'; item: EquipmentItem; equipped: boolean }
  | { type: 'heroLevel'; level: number }
  | { type: 'tierReady'; name: string };

type Listener = (e: GameEvent) => void;

export interface OfflineResult {
  seconds: number; capped: boolean; gold: number; waves: number; items: number;
}

export interface ChainView {
  chain: AchievementChain;
  value: number;
  tier: number;          // index of the next unclaimed tier (or tiers.length)
  claimed: number;
  goal: number;
  progress: number;      // 0..1 toward the next tier
  claimable: number;     // number of tiers ready to claim
}

/* -------------------------------------------------------------------- engine */

export class Game {
  state: GameState;
  private listeners: Listener[] = [];
  private autoAccum = 0;
  private saveTimer = 0;
  private achievementTimer = 0;
  private strikeTimer = 0;
  private skillTimer = 0;

  constructor(state?: GameState) { this.state = state ?? createState(); }

  on(fn: Listener): () => void {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter((l) => l !== fn); };
  }
  emit(e: GameEvent): void { for (const l of this.listeners) l(e); }

  get wave(): number { return this.state.wave; }
  get gold(): number { return this.state.gold; }
  get glory(): number { return this.state.glory; }
  get boss(): boolean { return isBoss(this.state.wave); }
  get heroAlive(): boolean { return this.state.respawnTimer <= 0 && this.state.player.hp > 0; }
  get enemyDef(): EnemyDef { return enemyFor(this.state.wave); }

  /* --------------------------------------------------------- equipment math */

  equippedStats(): { damage: number; armor: number; dps: number; gold: number; regen: number; crit: number } {
    const out = { damage: 0, armor: 0, dps: 0, gold: 0, regen: 0, crit: 0 };
    for (const it of this.state.equipment) {
      if (!it) continue;
      for (const k of Object.keys(out) as (keyof typeof out)[]) out[k] += it.stats[k];
    }
    return out;
  }

  playerMaxHp(): number {
    const p = this.state.player;
    const eq = this.equippedStats();
    return (120 + (p.level - 1) * 14 + this.state.forge[6] * 12 + eq.armor * 0.45)
      * (1 + this.state.perks[4] * 0.2);
  }
  armor(): number {
    const eq = this.equippedStats();
    return eq.armor * 1.2 + this.state.forge[6] * 2 + this.state.player.level * 0.6;
  }
  regen(): number {
    return 1.2 + this.state.player.level * 0.3 + this.equippedStats().regen + this.state.forge[6] * 0.3;
  }
  playerBaseDamage(): number {
    const p = this.state.player;
    return (6 + (p.level - 1) * 2.6 + this.state.forge[0] * 4)
      * Math.pow(1.09, this.state.forge[0]) + this.equippedStats().damage;
  }
  playerDps(): number {
    const eq = this.equippedStats();
    return this.playerBaseDamage() * 1.15 * (1 + eq.dps * 0.01)
      * (1 + this.state.perks[0] * 0.15);
  }
  heroDpsAt(index: number, level: number): number {
    if (level <= 0) return 0;
    const milestones = MILESTONES.filter((m) => level >= m).length;
    return HEROES[index].baseDps * level * Math.pow(1.055, level) * Math.pow(2, milestones);
  }
  private get dpsMultiplier(): number {
    return (1 + this.state.forge[3] * 0.06 + this.state.forge[7] * 0.1)
      * (1 + this.state.perks[2] * 0.15);
  }
  heroDpsShare(index: number): number {
    return this.heroDpsAt(index, this.state.heroes[index]) * this.dpsMultiplier;
  }
  heroDpsNext(index: number, qty: number): number {
    return this.heroDpsAt(index, this.state.heroes[index] + qty) * this.dpsMultiplier;
  }
  heroDps(): number {
    let raw = 0;
    for (let i = 0; i < HEROES.length; i++) raw += this.heroDpsAt(i, this.state.heroes[i]);
    return raw * this.dpsMultiplier;
  }
  totalDps(): number { return this.heroDps() + this.playerDps(); }

  get damageMultiplier(): number { return this.state.furyTime > 0 ? 2 : 1; }
  baseTap(): number { return this.playerBaseDamage(); }
  tapDamage(): number { return this.playerBaseDamage() * 2.4 + this.totalDps() * 0.12; }
  critChance(): number {
    return Math.min(0.75, 0.05 + this.state.forge[1] * 0.015 + this.equippedStats().crit);
  }
  critMult(): number { return 2 + this.state.perks[3] * 0.25; }
  goldMult(): number {
    return (1 + this.state.forge[2] * 0.08 + this.equippedStats().gold * 0.01)
      * (1 + this.state.perks[1] * 0.15);
  }
  autoTaps(): number { return this.state.forge[4] * 0.5 * (this.state.furyTime > 0 ? 2 : 1); }
  offlineCap(): number { return (4 * 3600) + this.state.forge[5] * 45 * 60; }
  offlineEfficiency(): number { return Math.min(1, 0.7 + this.state.forge[5] * 0.05); }
  waveGold(): number { return goldFor(this.state.wave) * this.goldMult(); }

  /** Damage of one enemy strike, scaled so the fight stays fair at any wave. */
  enemyDamage(): number {
    const danger = 1 + Math.min(2.2, Math.floor(this.state.wave / 60) * 0.3);
    const base = this.playerMaxHp() * (this.boss ? 0.11 : 0.07) * danger;
    return Math.max(1, base * 100 / (100 + this.armor()));
  }

  /* -------------------------------------------------------------- combat */

  spawnEnemy(): void {
    const s = this.state;
    s.enemyMaxHp = enemyHpFor(s.wave);
    s.enemyHp = s.enemyMaxHp;
    s.bossTimer = this.boss ? BOSS_TIME : 0;
    s.enemyAttackTimer = this.enemyDef.attackSpeed;
    this.emit({ type: 'enemy', def: this.enemyDef, boss: this.boss });
  }

  private addGold(amount: number): void {
    if (amount <= 0) return;
    this.state.gold += amount;
    this.state.stats.goldEarned += amount;
    this.emit({ type: 'gold', amount });
  }

  private grantXp(amount: number): void {
    const p = this.state.player;
    p.xp += amount;
    let leveled = false;
    let guard = 0;
    while (p.xp >= p.xpNext && guard++ < 100) {
      p.xp -= p.xpNext;
      p.level++;
      p.xpNext = Math.ceil(p.xpNext * 1.32);
      leveled = true;
    }
    if (leveled) {
      p.maxHp = this.playerMaxHp();
      p.hp = p.maxHp;
      this.emit({ type: 'heroLevel', level: p.level });
    }
  }

  /* ------------------------------------------------------------------ loot */

  private makeItem(wave: number, forcedRarity?: ItemRarity): EquipmentItem {
    const slot = SLOTS[Math.floor(Math.random() * SLOTS.length)];
    const roll = Math.random() + this.state.perks[5] * 0.05 + (this.boss ? 0.42 : 0);
    let rarityIndex = forcedRarity ? RARITY_ORDER.indexOf(forcedRarity)
      : roll > 0.985 ? 3 : roll > 0.9 ? 2 : roll > 0.6 ? 1 : 0;
    rarityIndex = Math.max(0, Math.min(3, rarityIndex));
    const rarity = RARITY_ORDER[rarityIndex];
    const mult = [1, 1.9, 3.6, 7][rarityIndex];
    const power = Math.max(1, (3 + wave * 0.5) * mult * (0.85 + Math.random() * 0.3));
    const stats = { damage: 0, armor: 0, dps: 0, gold: 0, regen: 0, crit: 0 };
    const primary = slot.stat;
    if (primary === 'crit') stats.crit = Math.min(0.35, 0.005 * power);
    else if (primary === 'regen') stats.regen = power * 0.12;
    else if (primary === 'gold' || primary === 'dps') stats[primary] = power * 0.5;
    else stats[primary] = power;
    /* Secondary stat on rare+ items. */
    if (rarityIndex >= 1) {
      const extra = (Object.keys(stats) as (keyof typeof stats)[])
        .filter((k) => k !== primary);
      const k = extra[Math.floor(Math.random() * extra.length)];
      if (k === 'crit') stats.crit = Math.min(0.35, stats.crit + power * 0.002);
      else if (k === 'regen') stats.regen += power * 0.05;
      else stats[k] += power * 0.18;
    }
    return {
      id: `i${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
      slot: slot.id, name: itemName(slot.id, rarityIndex), rarity, power,
      level: Math.max(1, wave), stats,
    };
  }

  private itemScore(it: EquipmentItem): number { return it.power; }

  private dropLoot(wave: number, boss: boolean): EquipmentItem | null {
    const chance = 0.2 + this.state.perks[5] * 0.12 + (boss ? 0.8 : 0);
    if (Math.random() > chance) return null;
    const item = this.makeItem(wave, boss && Math.random() < 0.35 ? 'epic' : undefined);
    this.state.stats.itemsFound++;
    const slotIndex = SLOTS.findIndex((s) => s.id === item.slot);
    const current = this.state.equipment[slotIndex];
    let equipped = false;
    if (this.state.autoEquip && (!current || this.itemScore(item) > this.itemScore(current))) {
      this.state.equipment[slotIndex] = item;
      if (current && this.state.inventory.length < 36) this.state.inventory.push(current);
      equipped = true;
    } else if (this.state.inventory.length < 36) {
      this.state.inventory.push(item);
    }
    this.state.player.maxHp = this.playerMaxHp();
    this.state.lootLog.unshift(`${item.name} · ${item.rarity}`);
    this.state.lootLog = this.state.lootLog.slice(0, 6);
    this.emit({ type: 'loot', item, equipped });
    return item;
  }

  equipItem(id: string): boolean {
    const i = this.state.inventory.findIndex((x) => x.id === id);
    if (i < 0) return false;
    const it = this.state.inventory[i];
    const slot = SLOTS.findIndex((s) => s.id === it.slot);
    if (slot < 0) return false;
    const old = this.state.equipment[slot];
    this.state.inventory.splice(i, 1);
    this.state.equipment[slot] = it;
    if (old) this.state.inventory.push(old);
    this.state.player.maxHp = this.playerMaxHp();
    this.state.player.hp = Math.min(this.state.player.hp, this.state.player.maxHp);
    this.emit({ type: 'buy', label: `Надето: ${it.name}` });
    return true;
  }

  sellItem(id: string): boolean {
    const i = this.state.inventory.findIndex((x) => x.id === id);
    if (i < 0) return false;
    const it = this.state.inventory[i];
    const value = Math.max(5, it.power * 12 * (1 + RARITY_ORDER.indexOf(it.rarity)));
    this.state.inventory.splice(i, 1);
    this.addGold(value);
    this.emit({ type: 'buy', label: `Продано: +${Math.floor(value)} золота` });
    return true;
  }

  sellBelow(rarity: ItemRarity): number {
    const limit = RARITY_ORDER.indexOf(rarity);
    const keep = this.state.inventory.filter((it) => RARITY_ORDER.indexOf(it.rarity) > limit);
    const sold = this.state.inventory.length - keep.length;
    for (const it of this.state.inventory) {
      if (RARITY_ORDER.indexOf(it.rarity) <= limit) this.addGold(Math.max(5, it.power * 12));
    }
    this.state.inventory = keep;
    if (sold) this.emit({ type: 'buy', label: `Продано предметов: ${sold}` });
    return sold;
  }

  /* --------------------------------------------------------------- kill/wave */

  private kill(): void {
    const s = this.state;
    const boss = isBoss(s.wave);
    const reward = goldFor(s.wave) * this.goldMult();
    this.addGold(reward);
    s.stats.kills++;
    if (boss) s.stats.bosses++;
    s.fury = Math.min(100, s.fury + (boss ? 25 : 8));
    this.grantXp(8 + s.wave * 1.6 + (boss ? 60 : 0));
    const previousRegion = regionIndex(s.wave);
    this.emit({ type: 'enemyDown', boss });
    s.wave++;
    s.stats.maxWave = Math.max(s.stats.maxWave, s.wave);
    this.emit({ type: 'kill', gold: reward, boss });
    this.emit({ type: 'wave', wave: s.wave, boss: this.boss, regionChanged: regionIndex(s.wave) !== previousRegion });
    this.dropLoot(s.wave - 1, boss);
    this.spawnEnemy();
  }

  private applyDamage(amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) return;
    let remaining = amount * this.damageMultiplier;
    let guard = 0;
    while (remaining > 0 && guard++ < 250) {
      if (remaining < this.state.enemyHp) {
        this.state.enemyHp -= remaining;
        if (Math.random() < 0.14) this.emit({ type: 'enemyHit', amount: remaining });
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

  /** Manual tap — now an optional boost, not the core of the game. */
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
    if (!def) return false;
    if (index === 0) {
      const { amount } = this.rollDamage(this.tapDamage() * 15);
      this.applyDamage(amount);
      this.emit({ type: 'skill', name: def.name, amount });
    } else if (index === 1) {
      const amount = this.totalDps() * 30;
      this.applyDamage(amount);
      this.emit({ type: 'skill', name: def.name, amount });
    } else if (index === 2) {
      const amount = this.waveGold() * 30;
      this.addGold(amount);
      this.emit({ type: 'skill', name: def.name, amount });
    } else {
      const healed = s.player.maxHp * 0.6;
      s.player.hp = Math.min(s.player.maxHp, s.player.hp + healed);
      this.emit({ type: 'skill', name: def.name, amount: healed });
    }
    s.cooldowns[index] = def.cooldown;
    s.stats.skillsUsed++;
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

  /* ---------------------------------------------------------------- idle tick */

  private enemyStrike(): void {
    const s = this.state;
    if (!this.heroAlive) return;
    const amount = this.enemyDamage();
    this.emit({ type: 'enemyAttack' });
    s.player.hp = Math.max(0, s.player.hp - amount);
    s.stats.damageTaken += amount;
    this.emit({ type: 'heroHit', amount, hp: s.player.hp });
    if (s.player.hp <= 0) {
      s.respawnTimer = RESPAWN_TIME;
      s.stats.deaths++;
      this.emit({ type: 'heroDown' });
      this.emit({ type: 'toast', text: '🛡️ Герой пал. Возрождение через 4 сек…', kind: 'bad' });
    }
  }

  tick(dt: number): void {
    const s = this.state;
    const d = Math.max(0, Math.min(dt, 1));
    s.stats.playTime += d;
    for (let i = 0; i < s.cooldowns.length; i++) s.cooldowns[i] = Math.max(0, s.cooldowns[i] - d);
    if (s.furyTime > 0) s.furyTime = Math.max(0, s.furyTime - d);

    /* Respawn / regeneration. */
    if (s.respawnTimer > 0) {
      s.respawnTimer = Math.max(0, s.respawnTimer - d);
      if (s.respawnTimer === 0) {
        s.player.hp = s.player.maxHp;
        s.enemyAttackTimer = this.enemyDef.attackSpeed;
        this.emit({ type: 'heroRespawn' });
      }
    } else {
      const p = s.player;
      p.maxHp = this.playerMaxHp();
      if (p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + this.regen() * d);
    }

    /* Enemy attacks the player — this is a real two-way fight now. */
    s.enemyAttackTimer -= d;
    if (s.enemyAttackTimer <= 0) {
      s.enemyAttackTimer = this.enemyDef.attackSpeed;
      this.enemyStrike();
    }

    /* Auto skills: one at a time, with a global cooldown, and never in the
       first seconds of a run (otherwise they skip the early game). */
    this.skillTimer = Math.max(0, this.skillTimer - d);
    if (s.autoSkills && s.stats.playTime > 20 && this.skillTimer <= 0) {
      for (let i = 0; i < s.cooldowns.length; i++) {
        if (s.cooldowns[i] > 0) continue;
        if (i === 3 && s.player.hp > s.player.maxHp * 0.5) continue;
        if (i === 1 && !this.boss && s.enemyHp < s.enemyMaxHp * 0.4) continue;
        if (i === 0 && !this.boss && s.enemyHp < s.enemyMaxHp * 0.6) continue;
        if (this.useSkill(i)) { this.skillTimer = 12; break; }
      }
    }

    /* Continuous idle damage from hero + companions. */
    if (this.heroAlive) {
      const dps = this.totalDps();
      if (dps > 0) this.applyDamage(dps * d);
      this.strikeTimer += d;
      if (this.strikeTimer >= 0.85) { this.strikeTimer = 0; this.emit({ type: 'heroStrike' }); }
    }

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

    this.achievementTimer += d;
    if (this.achievementTimer > 2) {
      this.achievementTimer = 0;
      const ready = this.claimableCount();
      if (ready > 0) this.emit({ type: 'tierReady', name: `${ready} наград` });
    }

    this.saveTimer += d;
    if (this.saveTimer >= 10) { this.saveTimer = 0; this.save(); }
  }

  /* --------------------------------------------------------------- offline */

  applyOffline(seconds: number): OfflineResult | null {
    const cap = this.offlineCap();
    const elapsed = Math.min(Math.max(0, seconds), cap);
    if (elapsed < 30) { this.spawnEnemy(); return null; }
    const dps = this.totalDps();
    const result: OfflineResult = { seconds: elapsed, capped: seconds > cap, gold: 0, waves: 0, items: 0 };
    if (dps <= 0) { this.spawnEnemy(); return result; }

    const s = this.state;
    const eff = this.offlineEfficiency();
    let remain = elapsed;
    let guard = 0;
    if (s.enemyHp <= 0 || s.enemyMaxHp <= 0) this.spawnEnemy();
    while (remain > 0 && guard++ < 500) {
      const timeToKill = s.enemyHp / dps;
      if (timeToKill > remain) { s.enemyHp = Math.max(0, s.enemyHp - dps * remain); remain = 0; break; }
      remain -= timeToKill;
      const w = s.wave;
      result.gold += goldFor(w) * this.goldMult() * eff;
      s.stats.kills++;
      if (isBoss(w)) s.stats.bosses++;
      s.wave = w + 1;
      s.stats.maxWave = Math.max(s.stats.maxWave, s.wave);
      result.waves++;
      this.grantXp(8 + w * 1.6);
      if (result.waves % 5 === 0) {
        const item = this.makeItem(w);
        if (this.state.inventory.length < 36) this.state.inventory.push(item);
        result.items++;
        s.stats.itemsFound++;
      }
      s.enemyMaxHp = enemyHpFor(s.wave);
      s.enemyHp = s.enemyMaxHp;
    }
    this.addGold(result.gold);
    s.player.hp = s.player.maxHp;
    s.respawnTimer = 0;
    s.bossTimer = this.boss ? BOSS_TIME : 0;
    this.spawnEnemy();
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
      if (heroCostRange(index, level, mid) <= this.state.gold) lo = mid; else hi = mid - 1;
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
    if (!f) return false;
    const level = s.forge[index];
    if (f.max !== undefined && level >= f.max) return false;
    const cost = forgeCostAt(index, level);
    if (s.gold < cost) return false;
    s.gold -= cost;
    s.forge[index]++;
    s.stats.forgeBought++;
    s.player.maxHp = this.playerMaxHp();
    this.emit({ type: 'buy', label: f.name });
    return true;
  }
  buyPerk(index: number): boolean {
    const s = this.state;
    const cost = perkCostAt(s.perks[index]);
    if (s.glory < cost) return false;
    s.glory -= cost;
    s.perks[index]++;
    s.player.maxHp = this.playerMaxHp();
    this.emit({ type: 'buy', label: PERKS[index].name });
    return true;
  }
  canPrestige(): boolean { return this.state.wave >= 25; }
  nextGlory(): number { return prestigeGlory(this.state.wave); }

  prestige(): number {
    if (!this.canPrestige()) return 0;
    const s = this.state;
    const gain = this.nextGlory();
    s.gold = 0; s.wave = 1;
    s.heroes = s.heroes.map(() => 0);
    s.forge = s.forge.map(() => 0);
    s.cooldowns = s.cooldowns.map(() => 0);
    s.fury = 0; s.furyTime = 0;
    s.glory += gain; s.gloryEarned += gain;
    s.stats.prestiges++;
    s.player.hp = s.player.maxHp;
    s.respawnTimer = 0;
    this.autoAccum = 0;
    this.spawnEnemy();
    this.emit({ type: 'prestige', glory: gain });
    return gain;
  }

  /* ------------------------------------------------- multi-step achievements */

  tierId(chainId: string, tier: number): string { return `${chainId}:${tier}`; }

  chainView(chain: AchievementChain): ChainView {
    const value = this.state.stats[chain.stat];
    let claimed = 0;
    for (let i = 0; i < chain.tiers.length; i++) {
      if (this.state.claimedTiers.includes(this.tierId(chain.id, i))) claimed++;
    }
    let claimable = 0;
    for (let i = claimed; i < chain.tiers.length; i++) {
      if (value >= chain.tiers[i].goal) claimable++; else break;
    }
    const tier = Math.min(claimed + claimable, chain.tiers.length);
    const goal = tier < chain.tiers.length ? chain.tiers[tier].goal : chain.tiers[chain.tiers.length - 1].goal;
    const prevGoal = tier > 0 ? chain.tiers[Math.min(tier - 1, chain.tiers.length - 1)].goal : 0;
    const progress = goal > prevGoal ? Math.min(1, Math.max(0, (value - prevGoal) / (goal - prevGoal))) : 1;
    return { chain, value, tier, claimed, goal, progress, claimable };
  }

  chainViews(): ChainView[] { return ACHIEVEMENT_CHAINS.map((c) => this.chainView(c)); }

  claimableCount(): number {
    return this.chainViews().reduce((n, v) => n + v.claimable, 0);
  }
  claimedTierCount(): number { return this.state.claimedTiers.length; }

  claimTier(chainId: string, tier: number): boolean {
    const chain = ACHIEVEMENT_CHAINS.find((c) => c.id === chainId);
    if (!chain) return false;
    const id = this.tierId(chainId, tier);
    const def = chain.tiers[tier];
    if (!def || this.state.claimedTiers.includes(id)) return false;
    if (this.state.stats[chain.stat] < def.goal) return false;
    /* Tiers must be claimed in order inside a chain. */
    if (tier > 0 && !this.state.claimedTiers.includes(this.tierId(chainId, tier - 1))) return false;
    this.state.claimedTiers.push(id);
    this.state.glory += def.reward;
    this.state.gloryEarned += def.reward;
    this.emit({ type: 'toast', text: `🏆 ${chain.name} · ${def.name}: +${def.reward} славы`, kind: 'good' });
    return true;
  }

  claimAllTiers(): number {
    let n = 0;
    for (const view of this.chainViews()) {
      for (let i = view.claimed; i < view.claimed + view.claimable; i++) {
        if (this.claimTier(view.chain.id, i)) n++;
      }
    }
    return n;
  }

  /* ------------------------------------------------------------------ misc */

  save(): void { saveState(this.state); }
  backup(): void { backupState(this.state); }

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
