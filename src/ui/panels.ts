import { renderCreature } from '../art/creatures';
import { emojify, icon } from '../art/icons';
import { ACHIEVEMENTS, FORGE, HEROES, PERKS } from '../game/data';
import { forgeCostAt, game, MILESTONES, perkCostAt } from '../game/engine';
import { fmt, fmtTime } from '../game/format';
import { confirmModal, q, qa, Screen, toast } from './common';
import { invalidateBattleArt } from './battle';

type BuyMode = 'x1' | 'x10' | 'max';
let buyMode: BuyMode = 'x1';

function head(title: string, subtitle: string, extra = ''): string {
  return `<div class="panel-head">
    <div class="panel-head-text"><h2>${title}</h2><p>${subtitle}</p></div>
    ${extra}
  </div>`;
}

/* ==================================================================== heroes */

export function createHeroesScreen(): Screen {
  const el = document.createElement('div');
  el.className = 'screen-inner';
  el.innerHTML = emojify(head('Дружина', 'Герои сражаются, даже когда вы отдыхаете.',
    `<div class="mode-switch" id="hero-mode">
      <button data-mode="x1" class="active">×1</button>
      <button data-mode="x10">×10</button>
      <button data-mode="max">МАКС</button>
    </div>`) + `
    <div class="hero-list" id="hero-list"></div>
    <div class="tip-block">💡 Каждые 10–25 уровней герой получает бонус ×2 к своему урону.</div>`);

  const list = q('#hero-list', el);
  list.innerHTML = emojify(HEROES.map((h, i) => `
    <div class="hero-row" data-i="${i}" title="${h.quote}">
      <div class="hero-portrait">${renderCreature(h.art)}</div>
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
    </div>`).join(''));

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
      btn.classList.remove('bought');
      void btn.offsetWidth;
      btn.classList.add('bought');
      refresh();
    }
  });

  function refresh(): void {
    const s = game.state;
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
      const row = q(`.hero-row[data-i="${i}"]`, el);
      row.classList.toggle('dim', level === 0 && s.gold < HEROES[i].baseCost * 0.4);
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
    default: return '';
  }
}

export function createForgeScreen(): Screen {
  const el = document.createElement('div');
  el.className = 'screen-inner';
  el.innerHTML = emojify(head('Кузница', 'Вечная слава куётся здесь — и покупается за золото.') + `
    <div class="forge-list" id="forge-list"></div>
    <div class="tip-block">🔨 Улучшения из кузницы сбрасываются при новом походе, но Слава остаётся навсегда.</div>`);

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
      btn.classList.remove('bought');
      void btn.offsetWidth;
      btn.classList.add('bought');
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
      btn.disabled = !ok || maxed;
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
      <p class="prestige-lead">Начните историю заново — золото и герои исчезнут, но <b>Слава</b> и наследие короны останутся навсегда.</p>
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
    <div class="tip-block">👑 Славу также дают достижения во вкладке «Достижения».</div>`);

  const grid = q('#perk-grid', el);
  grid.innerHTML = emojify(PERKS.map((p, i) => `
    <div class="perk-card" data-i="${i}">
      <div class="perk-icon">${p.icon}</div>
      <div class="perk-name">${p.name}</div>
      <div class="perk-desc">${p.desc}</div>
      <div class="perk-level">ур. <b id="pk-l-${i}">0</b> <span id="pk-e-${i}"></span></div>
      <button class="btn btn-small" data-perk="${i}"><span id="pk-c-${i}"></span></button>
    </div>`).join(''));

  grid.addEventListener('click', (ev) => {
    const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>('button[data-perk]');
    if (!btn || btn.disabled) return;
    if (game.buyPerk(Number(btn.dataset.perk))) refresh();
  });

  q('#btn-prestige', el).addEventListener('click', () => {
    if (!game.canPrestige()) {
      toast(`Нужен как минимум 25-й уровень волны (сейчас ${game.state.wave})`, 'bad');
      return;
    }
    confirmModal('Начать новый поход?',
      `Вы потеряете золото, героев, улучшения кузницы и вернётесь на 1-ю волну. Зато получите <b>👑 ${game.nextGlory()} Славы</b> и сохраните все достижения.`,
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
    const btn = q<HTMLButtonElement>('#btn-prestige', el);
    btn.disabled = !ready;
    q('#pg-note', el).textContent = ready
      ? 'Готово! Славы хватит на несколько улучшений наследия.'
      : `Откроется на 25-й волне · осталось ${Math.max(0, 25 - s.wave)} волн`;
    for (let i = 0; i < PERKS.length; i++) {
      const level = s.perks[i];
      const cost = perkCostAt(level);
      q(`#pk-l-${i}`, el).textContent = String(level);
      q(`#pk-e-${i}`, el).textContent = `· +${level * (i === 3 ? 25 : 15)}%`;
      q(`#pk-c-${i}`, el).innerHTML = `${icon('👑')} ${fmt(cost)}`;
      const perkBtn = q<HTMLButtonElement>(`button[data-perk="${i}"]`, el);
      const ok = s.glory >= cost;
      perkBtn.disabled = !ok;
      perkBtn.classList.toggle('afford', ok);
    }
  }

  return { el, refresh };
}

/* ============================================================== achievements */

export function createAchievementsScreen(): Screen {
  const el = document.createElement('div');
  el.className = 'screen-inner';
  el.innerHTML = emojify(head('Достижения', 'Каждый подвиг приближает к легенде.',
    `<div class="ach-total" id="ach-total"></div>`) + `
    <div class="ach-progress"><div id="ach-progress-fill"></div></div>
    <div class="ach-list" id="ach-list"></div>
    <h3 class="section-title">Летопись похода</h3>
    <div class="stats-grid" id="stats-grid"></div>`);

  const list = q('#ach-list', el);
  list.innerHTML = emojify(ACHIEVEMENTS.map((a) => `
    <div class="ach-row" data-id="${a.id}">
      <div class="ach-icon">${a.icon}</div>
      <div class="ach-main">
        <div class="ach-name">${a.name} <span class="ach-reward">👑 +${a.reward}</span></div>
        <div class="ach-desc">${a.desc}</div>
        <div class="ach-track"><div id="at-${a.id}"></div></div>
        <div class="ach-prog-text" id="ap-${a.id}"></div>
      </div>
      <button class="claim-btn" data-claim="${a.id}" id="ac-${a.id}"></button>
    </div>`).join(''));

  list.addEventListener('click', (ev) => {
    const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>('button[data-claim]');
    if (!btn || btn.disabled) return;
    if (game.claimAchievement(btn.dataset.claim!)) {
      btn.classList.remove('claimed');
      void btn.offsetWidth;
      btn.classList.add('claimed');
      refresh();
    }
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
    ['♻️ Походов', () => fmt(game.state.stats.prestiges)],
    ['⏳ В игре', () => fmtTime(game.state.stats.playTime)],
  ];
  statsGrid.innerHTML = emojify(statDefs.map(([label], i) =>
    `<div class="stat-box"><span>${label}</span><b id="sg-${i}"></b></div>`).join(''));

  function refresh(): void {
    const s = game.state;
    let claimed = 0;
    for (const a of ACHIEVEMENTS) {
      const done = game.achievementClaimed(a);
      const unlocked = game.achievementUnlocked(a);
      const value = s.stats[a.stat];
      const goal = a.goal(0);
      const progress = Math.min(1, value / goal);
      if (done) claimed++;
      q(`#at-${a.id}`, el).style.width = `${progress * 100}%`;
      q(`#ap-${a.id}`, el).textContent = done ? 'Получено' : `${fmt(value)} / ${fmt(goal)}`;
      const btn = q<HTMLButtonElement>(`#ac-${a.id}`, el);
      btn.innerHTML = done ? icon('✔') : unlocked ? 'Забрать' : `${Math.floor(progress * 100)}%`;
      btn.disabled = done || !unlocked;
      btn.classList.toggle('ready', unlocked && !done);
      q(`.ach-row[data-id="${a.id}"]`, el).classList.toggle('done', done);
    }
    q('#ach-total', el).textContent = `${claimed} / ${ACHIEVEMENTS.length}`;
    q('#ach-progress-fill', el).style.width = `${(claimed / ACHIEVEMENTS.length) * 100}%`;
    statDefs.forEach(([, get], i) => { q(`#sg-${i}`, el).textContent = get(); });
  }

  return { el, refresh };
}
