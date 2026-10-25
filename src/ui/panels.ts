import { createLivePortrait } from '../art/live';
import { emojify, icon } from '../art/icons';
import {
  ACHIEVEMENT_CHAINS, FORGE, HEROES, PERKS, RARITY_COLOR, RARITY_NAME,
  SLOTS, TOTAL_TIERS,
} from '../game/data';
import { forgeCostAt, game, MILESTONES, perkCostAt } from '../game/engine';
import { fmt, fmtTime, pct } from '../game/format';
import type { EquipmentItem, ItemRarity, SlotDef } from '../game/types';
import { confirmModal, q, qa, Screen, toast } from './common';
import { invalidateBattleArt } from './battle';

type BuyMode = 'x1' | 'x10' | 'max';
let buyMode: BuyMode = 'x1';
const portraits: { destroy(): void }[] = [];

function head(title: string, subtitle: string, extra = ''): string {
  return `<div class="panel-head">
    <div class="panel-head-text"><h2>${title}</h2><p>${subtitle}</p></div>
    ${extra}
  </div>`;
}

function statText(item: EquipmentItem): string {
  const parts: string[] = [];
  const names: Record<string, string> = {
    damage: 'урон', armor: 'броня', dps: 'DPS', gold: 'золото', regen: 'реген', crit: 'крит',
  };
  for (const [k, v] of Object.entries(item.stats)) {
    if (!v) continue;
    const value = k === 'crit' ? `+${pct(v)}` : k === 'dps' || k === 'gold' ? `+${fmt(v)}%` : `+${fmt(v)}`;
    parts.push(`${value} ${names[k]}`);
  }
  return parts.join(' · ');
}

function itemCard(it: EquipmentItem, action: 'equip' | 'sell' | 'worn'): string {
  const color = RARITY_COLOR[it.rarity];
  const slot = SLOTS.find((s) => s.id === it.slot);
  const badge = action === 'worn' ? '<span class="item-worn">НАДЕТО</span>' : '';
  return `<div class="item-card" style="--rarity:${color}">
    <div class="item-icon">${slot?.icon ?? '📦'}</div>
    <div class="item-main">
      <div class="item-name">${it.name} ${badge}</div>
      <div class="item-meta"><span style="color:${color}">${RARITY_NAME[it.rarity]}</span> · ур. ${it.level} · сила ${fmt(it.power)}</div>
      <div class="item-stats">${statText(it)}</div>
    </div>
    ${action === 'equip' ? `<div class="item-actions"><button class="item-btn" data-equip="${it.id}">Надеть</button><button class="item-btn ghost" data-sell="${it.id}">Продать</button></div>` : ''}
    ${action === 'sell' ? `<button class="item-btn ghost" data-sell="${it.id}">Продать</button>` : ''}
  </div>`;
}

/* ==================================================================== heroes */

export function createHeroesScreen(): Screen {
  const el = document.createElement('div');
  el.className = 'screen-inner';
  el.innerHTML = emojify(head('Дружина', 'Герои сражаются сами — даже когда вы не в игре.',
    `<div class="mode-switch" id="hero-mode">
      <button data-mode="x1" class="active">×1</button>
      <button data-mode="x10">×10</button>
      <button data-mode="max">МАКС</button>
    </div>`) + `
    <div class="hero-summary"><span>Общий урон дружины</span><b id="hero-total">0/сек</b></div>
    <div class="hero-list" id="hero-list"></div>
    <div class="tip-block">💡 Каждые 10–25 уровней герой получает бонус ×2 к своему урону.</div>`);

  const list = q('#hero-list', el);
  list.innerHTML = HEROES.map((h, i) => `
    <div class="hero-row" data-i="${i}" title="${h.quote}">
      <div class="hero-portrait"><canvas class="portrait-canvas" data-portrait="${i}"></canvas></div>
      <div class="hero-main">
        <div class="hero-name">${h.name} <span class="hero-lvl" id="hl-${i}">ур. 0</span></div>
        <div class="hero-title">${h.title}</div>
        <div class="hero-dps" id="hd-${i}"></div>
        <div class="hero-next" id="hn-${i}"></div>
      </div>
      <button class="buy-btn" data-buy="${i}">
        <span class="buy-verb" id="hv-${i}">Нанять</span>
        <span class="buy-cost" id="hc-${i}"></span>
      </button>
    </div>`).join('');

  for (const canvas of qa<HTMLCanvasElement>('.portrait-canvas', el)) {
    const i = Number(canvas.dataset.portrait);
    portraits.push(createLivePortrait(canvas, HEROES[i].kind, HEROES[i].palette));
  }

  q('#hero-mode', el).addEventListener('click', (ev) => {
    const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>('button[data-mode]');
    if (!btn) return;
    buyMode = btn.dataset.mode as BuyMode;
    for (const b of qa<HTMLButtonElement>('button[data-mode]', el)) b.classList.toggle('active', b === btn);
    refresh();
  });

  list.addEventListener('click', (ev) => {
    const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>('button[data-buy]');
    if (!btn || btn.disabled) return;
    const i = Number(btn.dataset.buy);
    if (game.buyHero(i, buyMode)) {
      btn.classList.remove('bought'); void btn.offsetWidth; btn.classList.add('bought');
      refresh();
    }
  });

  function refresh(): void {
    const s = game.state;
    q('#hero-total', el).textContent = `${fmt(game.heroDps())}/сек`;
    for (let i = 0; i < HEROES.length; i++) {
      const level = s.heroes[i];
      q(`#hl-${i}`, el).textContent = `ур. ${level}`;
      q(`#hd-${i}`, el).textContent = level > 0
        ? `${fmt(game.heroDpsShare(i))} урона/сек`
        : `${fmt(HEROES[i].baseDps)} урона/сек за уровень`;
      const next = MILESTONES.find((m) => m > level);
      q(`#hn-${i}`, el).textContent = next ? `ур. ${next} → урон ×2` : 'Все бонусы получены';
      const { qty, cost } = game.heroCost(i, buyMode);
      q(`#hv-${i}`, el).textContent = `${level === 0 ? 'Нанять' : 'Улучшить'}${qty > 1 ? ' ×' + qty : ''}`;
      q(`#hc-${i}`, el).innerHTML = `${icon('🪙')} ${fmt(cost)}`;
      const btn = q<HTMLButtonElement>(`button[data-buy="${i}"]`, el);
      const ok = qty >= 1 && s.gold >= cost;
      btn.disabled = !ok;
      btn.classList.toggle('afford', ok);
      q(`.hero-row[data-i="${i}"]`, el).classList.toggle('dim', level === 0 && s.gold < HEROES[i].baseCost * 0.4);
    }
  }
  return { el, refresh };
}

/* ===================================================================== forge */

function forgeEffect(i: number): string {
  const l = game.state.forge[i];
  switch (i) {
    case 0: return `Сейчас: ${fmt(game.baseTap())} базового урона`;
    case 1: return `Сейчас: ${Math.round(game.critChance() * 100)}% шанс крита`;
    case 2: return `Сейчас: +${l * 8}% золота`;
    case 3: return `Сейчас: +${l * 6}% к урону дружины`;
    case 4: return `Сейчас: ${(l * 0.5).toFixed(1)} автоатак/сек`;
    case 5: return `Офлайн: до ${(4 + l * 0.75).toFixed(2).replace(/\.00$/, '')} ч`;
    case 6: return `Сейчас: ${fmt(game.playerMaxHp())} макс. HP, ${fmt(game.regen())} регена/сек`;
    case 7: return `Сейчас: +${l * 10}% к DPS дружины`;
    default: return '';
  }
}

export function createForgeScreen(): Screen {
  const el = document.createElement('div');
  el.className = 'screen-inner';
  el.innerHTML = emojify(head('Кузница', 'Постоянные улучшения похода — покупаются за золото.') + `
    <div class="forge-list" id="forge-list"></div>
    <div class="tip-block">🔨 Улучшения кузницы сбрасываются при новом походе, но Слава, экипировка и достижения остаются навсегда.</div>`);

  const list = q('#forge-list', el);
  list.innerHTML = emojify(FORGE.map((f, i) => `
    <div class="forge-row" data-i="${i}">
      <div class="forge-icon">${f.icon}</div>
      <div class="forge-main">
        <div class="forge-name">${f.name} <span class="lvl-pill" id="fl-${i}">ур. 0</span></div>
        <div class="forge-desc">${f.desc}</div>
        <div class="forge-effect" id="fe-${i}"></div>
      </div>
      <button class="buy-btn compact" data-forge="${i}"><span class="buy-cost" id="fc-${i}"></span></button>
    </div>`).join(''));

  list.addEventListener('click', (ev) => {
    const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>('button[data-forge]');
    if (!btn || btn.disabled) return;
    if (game.buyForge(Number(btn.dataset.forge))) {
      btn.classList.remove('bought'); void btn.offsetWidth; btn.classList.add('bought');
      refresh();
    }
  });

  function refresh(): void {
    const s = game.state;
    for (let i = 0; i < FORGE.length; i++) {
      const level = s.forge[i];
      const maxed = FORGE[i].max !== undefined && level >= FORGE[i].max!;
      q(`#fl-${i}`, el).textContent = maxed ? 'МАКС' : `ур. ${level}`;
      q(`#fe-${i}`, el).textContent = forgeEffect(i);
      q(`#fc-${i}`, el).innerHTML = maxed ? '✔' : `${icon('🪙')} ${fmt(forgeCostAt(i, level))}`;
      const btn = q<HTMLButtonElement>(`button[data-forge="${i}"]`, el);
      const cost = forgeCostAt(i, level);
      const ok = !maxed && s.gold >= cost;
      btn.disabled = !ok;
      btn.classList.toggle('afford', ok);
      q(`.forge-row[data-i="${i}"]`, el).classList.toggle('maxed', maxed);
    }
  }
  return { el, refresh };
}

/* ===================================================================== glory */

export function createGloryScreen(): Screen {
  const el = document.createElement('div');
  el.className = 'screen-inner';
  el.innerHTML = emojify(`
    <div class="prestige-card">
      <div class="prestige-glow"></div>
      <div class="prestige-emblem">👑</div>
      <h2>Новый поход</h2>
      <p class="prestige-lead">Начните историю заново — золото, герои и кузница исчезнут, но <b>Слава</b>, уровень героя, экипировка и достижения останутся.</p>
      <div class="prestige-stats">
        <div><span>Слава</span><b id="pg-have">0</b></div>
        <div><span>За этот поход</span><b id="pg-gain">+0</b></div>
        <div><span>Рекорд</span><b id="pg-wave">1</b></div>
      </div>
      <button class="btn btn-primary btn-block" id="btn-prestige">⚔️ Начать новый поход</button>
      <p class="prestige-note" id="pg-note"></p>
    </div>
    <h3 class="section-title">Наследие короны</h3>
    <div class="perk-grid" id="perk-grid"></div>
    <div class="tip-block">👑 Славу также дают ступени достижений во вкладке «Достиж.».</div>`);

  const grid = q('#perk-grid', el);
  grid.innerHTML = emojify(PERKS.map((p, i) => `
    <div class="perk-card" data-i="${i}">
      <div class="perk-icon">${p.icon}</div>
      <div class="perk-name">${p.name}</div>
      <div class="perk-desc">${p.desc}</div>
      <div class="perk-level">ур. <b id="pk-l-${i}">0</b></div>
      <button class="btn btn-small" data-perk="${i}"><span id="pk-c-${i}"></span></button>
    </div>`).join(''));

  grid.addEventListener('click', (ev) => {
    const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>('button[data-perk]');
    if (!btn || btn.disabled) return;
    if (game.buyPerk(Number(btn.dataset.perk))) refresh();
  });

  q('#btn-prestige', el).addEventListener('click', () => {
    if (!game.canPrestige()) {
      toast(`Нужна 25-я волна (сейчас ${game.state.wave})`, 'bad');
      return;
    }
    confirmModal('Начать новый поход?',
      `Вы потеряете золото, героев и улучшения кузницы, но получите <b>👑 ${game.nextGlory()} Славы</b>. Уровень героя, предметы, инвентарь и достижения сохранятся.`,
      () => {
        const gain = game.prestige();
        invalidateBattleArt();
        toast(`👑 Новый поход! +${gain} Славы`, 'good', 3200);
        refresh();
      }, 'Начать поход');
  });

  function refresh(): void {
    const s = game.state;
    q('#pg-have', el).textContent = fmt(s.glory);
    q('#pg-gain', el).textContent = '+' + fmt(game.nextGlory());
    q('#pg-wave', el).textContent = fmt(s.stats.maxWave);
    const ready = game.canPrestige();
    q<HTMLButtonElement>('#btn-prestige', el).disabled = !ready;
    q('#pg-note', el).textContent = ready
      ? 'Готово! Славы хватит на несколько улучшений наследия.'
      : `Откроется на 25-й волне · осталось ${Math.max(0, 25 - s.wave)} волн`;
    for (let i = 0; i < PERKS.length; i++) {
      const level = s.perks[i];
      const cost = perkCostAt(level);
      q(`#pk-l-${i}`, el).textContent = String(level);
      q(`#pk-c-${i}`, el).innerHTML = `${icon('👑')} ${fmt(cost)}`;
      const perkBtn = q<HTMLButtonElement>(`button[data-perk="${i}"]`, el);
      const ok = s.glory >= cost;
      perkBtn.disabled = !ok;
      perkBtn.classList.toggle('afford', ok);
    }
  }
  return { el, refresh };
}

/* =========================================================== player & gear */

export function createPlayerScreen(): Screen {
  const el = document.createElement('div');
  el.className = 'screen-inner';
  el.innerHTML = emojify(head('Ваш герой', 'Растёт вместе с вами: уровень, броня и трофеи.') + `
    <div class="player-card">
      <canvas class="player-canvas" id="player-canvas"></canvas>
      <div class="player-info">
        <div class="player-name">Королевский чемпион</div>
        <div class="player-level">Уровень <b id="pl-level">1</b></div>
        <div class="xp-track"><div id="pl-xp"></div></div>
        <div class="xp-text" id="pl-xp-text"></div>
        <div class="hp-track"><div id="pl-hp"></div><span id="pl-hp-text"></span></div>
      </div>
    </div>
    <div class="player-stats" id="player-stats"></div>
    <h3 class="section-title">Снаряжение</h3>
    <div class="equip-grid" id="equip-grid"></div>
    <h3 class="section-title">Сумка <span class="section-count" id="inv-count"></span></h3>
    <div class="loot-actions">
      <button class="btn btn-small" id="sell-common">Продать обычное</button>
      <button class="btn btn-small" id="sell-rare">Продать до редкого</button>
      <button class="btn btn-small" id="equip-best">Надеть лучшее</button>
    </div>
    <div class="inventory-list" id="inventory-list"></div>
    <div class="tip-block">📦 Предметы падают с побеждённых врагов. Чем выше волна и редкость — тем сильнее бонус. Экипировка сохраняется при новом походе.</div>`);

  const portrait = createLivePortrait(q<HTMLCanvasElement>('#player-canvas', el), 'knight',
    { kind: 'knight', main: '#d9b48c', shade: '#a2764d', accent: '#4c6fa8', eye: '#9fe4ff' });
  portraits.push(portrait);

  const statDefs: [string, () => string][] = [
    ['⚔️ Удар', () => fmt(game.tapDamage())],
    ['🔥 Урон/сек', () => fmt(game.totalDps())],
    ['🛡️ Броня', () => fmt(game.armor())],
    ['💚 Реген/сек', () => fmt(game.regen())],
    ['🎯 Крит', () => pct(game.critChance())],
    ['🪙 Бонус золота', () => `+${Math.round((game.goldMult() - 1) * 100)}%`],
  ];
  q('#player-stats', el).innerHTML = emojify(statDefs.map(([label], i) =>
    `<div class="pstat"><span>${label}</span><b id="ps-${i}"></b></div>`).join(''));

  const equipGrid = q('#equip-grid', el);
  equipGrid.innerHTML = SLOTS.map((slot: SlotDef, i) => `
    <div class="equip-slot" data-slot="${i}" id="eq-${i}">
      <div class="equip-slot-icon">${slot.icon}</div>
      <div class="equip-slot-name">${slot.name}</div>
      <div class="equip-slot-item" id="eqi-${i}">Пусто</div>
    </div>`).join('');

  el.addEventListener('click', (ev) => {
    const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!btn) return;
    if (btn.dataset.equip) { game.equipItem(btn.dataset.equip); refresh(); return; }
    if (btn.dataset.sell) { game.sellItem(btn.dataset.sell); refresh(); return; }
    if (btn.id === 'sell-common') { game.sellBelow('common' as ItemRarity); refresh(); return; }
    if (btn.id === 'sell-rare') { game.sellBelow('rare' as ItemRarity); refresh(); return; }
    if (btn.id === 'equip-best') {
      let n = 0;
      for (const it of [...game.state.inventory]) {
        const slot = game.state.equipment[SLOTS.findIndex((s) => s.id === it.slot)];
        if (!slot || it.power > slot.power) if (game.equipItem(it.id)) n++;
      }
      toast(n ? `Надето предметов: ${n}` : 'Лучшее уже надето', n ? 'good' : 'info');
      refresh();
    }
  });

  function refresh(): void {
    const s = game.state;
    q('#pl-level', el).textContent = fmt(s.player.level);
    q('#pl-xp', el).style.width = `${Math.min(100, s.player.xp / s.player.xpNext * 100)}%`;
    q('#pl-xp-text', el).textContent = `Опыт: ${fmt(s.player.xp)} / ${fmt(s.player.xpNext)}`;
    const hpPct = s.player.maxHp > 0 ? s.player.hp / s.player.maxHp : 0;
    q('#pl-hp', el).style.width = `${hpPct * 100}%`;
    q('#pl-hp-text', el).textContent = `HP ${fmt(s.player.hp)} / ${fmt(s.player.maxHp)}`;
    statDefs.forEach(([, get], i) => { q(`#ps-${i}`, el).textContent = get(); });

    for (let i = 0; i < SLOTS.length; i++) {
      const it = s.equipment[i];
      const cell = q(`#eq-${i}`, el);
      cell.classList.toggle('filled', !!it);
      if (it) {
        cell.style.setProperty('--rarity', RARITY_COLOR[it.rarity]);
        q(`#eqi-${i}`, el).innerHTML = `<b>${it.name}</b><small>${statText(it)}</small>`;
      } else {
        cell.style.removeProperty('--rarity');
        q(`#eqi-${i}`, el).textContent = 'Пусто';
      }
    }
    q('#inv-count', el).textContent = `${s.inventory.length} / 36`;
    const sorted = [...s.inventory].sort((a, b) => b.power - a.power);
    q('#inventory-list', el).innerHTML = sorted.length
      ? emojify(sorted.slice(0, 24).map((it) => itemCard(it, 'equip')).join('') +
          (sorted.length > 24 ? `<p class="muted-note">…и ещё ${sorted.length - 24} предметов</p>` : ''))
      : `<div class="empty-state">Пока пусто. Побеждайте врагов — трофеи появятся здесь.</div>`;
  }
  return { el, refresh };
}

/* ========================================================== achievements */

export function createAchievementsScreen(): Screen {
  const el = document.createElement('div');
  el.className = 'screen-inner';
  el.innerHTML = emojify(head('Достижения', 'Цепочки подвигов: 5 ступеней в каждой.',
    `<div class="ach-total" id="ach-total"></div>`) + `
    <div class="ach-summary">
      <div class="ach-summary-text" id="ach-summary-text"></div>
      <button class="btn btn-small" id="claim-all">Забрать всё</button>
    </div>
    <div class="ach-progress"><div id="ach-progress-fill"></div></div>
    <div class="chain-list" id="chain-list"></div>
    <h3 class="section-title">Летопись похода</h3>
    <div class="stats-grid" id="stats-grid"></div>`);

  const list = q('#chain-list', el);
  list.innerHTML = emojify(ACHIEVEMENT_CHAINS.map((c) => `
    <div class="chain-card" data-chain="${c.id}">
      <div class="chain-head">
        <div class="chain-icon">${c.icon}</div>
        <div class="chain-title"><b>${c.name}</b><small>${c.desc}</small></div>
        <button class="chain-claim" data-claim-chain="${c.id}" id="cc-${c.id}">—</button>
      </div>
      <div class="tier-rail" id="rail-${c.id}">
        ${c.tiers.map((t, i) => `<div class="tier-node" id="tn-${c.id}-${i}" title="${t.name}: ${fmt(t.goal)} · +${t.reward} славы"><span>${i + 1}</span></div>`).join('')}
      </div>
      <div class="chain-progress"><div id="cp-${c.id}"></div></div>
      <div class="chain-foot"><span id="cf-${c.id}"></span><b id="cv-${c.id}"></b></div>
    </div>`).join(''));

  list.addEventListener('click', (ev) => {
    const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>('button[data-claim-chain]');
    if (!btn || btn.disabled) return;
    const view = game.chainViews().find((v) => v.chain.id === btn.dataset.claimChain);
    if (!view) return;
    let n = 0;
    for (let i = view.claimed; i < view.claimed + view.claimable; i++) {
      if (game.claimTier(view.chain.id, i)) n++;
    }
    if (n) toast(`🏆 Получено ступеней: ${n}`, 'good');
    refresh();
  });

  q('#claim-all', el).addEventListener('click', () => {
    const n = game.claimAllTiers();
    toast(n ? `🏆 Забрано наград: ${n}` : 'Пока нечего забирать', n ? 'good' : 'info');
    refresh();
  });

  const statsGrid = q('#stats-grid', el);
  const statDefs: [string, () => string][] = [
    ['⚔️ Побед', () => fmt(game.state.stats.kills)],
    ['👑 Боссов', () => fmt(game.state.stats.bosses)],
    ['🪙 Золота собрано', () => fmt(game.state.stats.goldEarned)],
    ['👊 Ударов', () => fmt(game.state.stats.taps)],
    ['🎯 Критов', () => fmt(game.state.stats.crits)],
    ['🚩 Рекордная волна', () => fmt(game.state.stats.maxWave)],
    ['🦸 Уровней героев', () => fmt(game.state.stats.heroesBought)],
    ['🔨 Улучшений кузницы', () => fmt(game.state.stats.forgeBought)],
    ['📦 Предметов', () => fmt(game.state.stats.itemsFound)],
    ['🛡️ Получено урона', () => fmt(game.state.stats.damageTaken)],
    ['💀 Возрождений', () => fmt(game.state.stats.deaths)],
    ['♻️ Походов', () => fmt(game.state.stats.prestiges)],
    ['✨ Умений', () => fmt(game.state.stats.skillsUsed)],
    ['⏳ В игре', () => fmtTime(game.state.stats.playTime)],
  ];
  statsGrid.innerHTML = emojify(statDefs.map(([label], i) =>
    `<div class="stat-box"><span>${label}</span><b id="sg-${i}"></b></div>`).join(''));

  function refresh(): void {
    const views = game.chainViews();
    let claimedTotal = 0, ready = 0;
    for (const v of views) {
      const c = v.chain;
      claimedTotal += v.claimed;
      ready += v.claimable;
      const nextTier = c.tiers[Math.min(v.tier, c.tiers.length - 1)];
      q(`#cp-${c.id}`, el).style.width = `${v.progress * 100}%`;
      q(`#cf-${c.id}`, el).textContent = v.tier >= c.tiers.length
        ? 'Все ступени получены'
        : `Следующая: «${nextTier.name}» · +${nextTier.reward} славы`;
      q(`#cv-${c.id}`, el).textContent = `${fmt(v.value)} / ${fmt(v.goal)}`;
      q(`.chain-card[data-chain="${c.id}"]`, el).classList.toggle('complete', v.tier >= c.tiers.length);
      for (let i = 0; i < c.tiers.length; i++) {
        const node = q(`#tn-${c.id}-${i}`, el);
        node.classList.toggle('done', i < v.claimed);
        node.classList.toggle('ready', i >= v.claimed && i < v.claimed + v.claimable);
        node.classList.toggle('current', i === v.tier);
      }
      const btn = q<HTMLButtonElement>(`#cc-${c.id}`, el);
      btn.textContent = v.claimable > 0 ? `+${v.claimable}` : `${v.claimed}/${c.tiers.length}`;
      btn.disabled = v.claimable === 0;
      btn.classList.toggle('ready', v.claimable > 0);
    }
    q('#ach-total', el).textContent = `${claimedTotal} / ${TOTAL_TIERS}`;
    q('#ach-progress-fill', el).style.width = `${claimedTotal / TOTAL_TIERS * 100}%`;
    q('#ach-summary-text', el).textContent = ready > 0
      ? `Доступно наград: ${ready} · всего ступеней ${TOTAL_TIERS}`
      : `Пройдено ${claimedTotal} из ${TOTAL_TIERS} ступеней`;
    q<HTMLButtonElement>('#claim-all', el).disabled = ready === 0;
    statDefs.forEach(([, get], i) => { q(`#sg-${i}`, el).textContent = get(); });
  }
  return { el, refresh };
}

export function destroyPortraits(): void {
  for (const p of portraits) p.destroy();
  portraits.length = 0;
}

export { itemCard };
