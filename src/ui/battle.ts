import { renderBackdrop } from '../art/backdrop';
import { renderCreature } from '../art/creatures';
import { emojify, icon } from '../art/icons';
import { enemyFor, game, regionFor } from '../game/engine';
import { fmt, fmtHud, fmtTime } from '../game/format';
import { regionCycle, regionIndex, REGIONS, SKILLS } from '../game/data';
import type { GameEvent } from '../game/engine';
import { q, Screen, showModal, toast } from './common';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function chapter(wave: number): string {
  const idx = regionIndex(wave) + regionCycle(wave) * REGIONS.length;
  return `ГЛАВА ${ROMAN[Math.min(idx, ROMAN.length - 1)]}`;
}

let arena: HTMLElement;
let fxLayer: HTMLElement;
let lastWave = -1;
let lastRegion = -1;
let hintShown = game.state.stats.taps === 0;

function build(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'battle-screen';
  el.innerHTML = emojify(`
    <div class="arena" id="arena">
      <div class="arena-bg" id="arena-bg"></div>
      <div class="arena-dust" id="arena-dust"></div>
      <div class="arena-frame"></div>

      <div class="region-banner">
        <span class="region-chapter" id="region-chapter"></span>
        <span class="region-name" id="region-name"></span>
        <span class="region-sub" id="region-sub"></span>
      </div>

      <div class="wave-chip" id="wave-chip"><span id="wave-label">ВОЛНА 1</span></div>
      <div class="boss-chip" id="boss-chip" hidden><span>👑 БОСС</span><b id="boss-timer">30</b></div>

      <div class="enemy-wrap" id="enemy-wrap">
        <div class="enemy-nameplate"><span id="enemy-name"></span><i id="enemy-tag"></i></div>
        <div class="enemy-art" id="enemy-art"></div>
        <div class="enemy-hp">
          <div class="hp-track"><div class="hp-fill" id="hp-fill"></div><span class="hp-text" id="hp-text"></span></div>
        </div>
      </div>

      <div class="arena-ground"></div>
      <div class="tap-hint" id="tap-hint">⚔️ ЖМИ ПО ВРАГУ</div>
      <div class="fx-damage" id="fx-damage"></div>
    </div>

    <div class="battle-bottom">
      <div class="stat-strip">
        <div class="stat-cell"><span>Касание</span><b id="stat-tap">5</b></div>
        <div class="stat-cell"><span>Дружина</span><b id="stat-dps">0/сек</b></div>
        <div class="stat-cell"><span>Крит</span><b id="stat-crit">5%</b></div>
      </div>
      <div class="fury-line">
        <span class="fury-label">🔥 ЯРОСТЬ</span>
        <div class="fury-track"><div class="fury-fill" id="fury-fill"></div><span id="fury-text">0%</span></div>
      </div>
      <div class="skill-bar" id="skill-bar"></div>
    </div>`);
  return el;
}

function buildSkills(): void {
  const bar = q('#skill-bar', arena.parentElement!);
  bar.innerHTML = emojify(SKILLS.map((s, i) => `
    <button class="skill-btn" data-skill="${i}" title="${s.desc}">
      <span class="skill-icon">${s.icon}</span>
      <span class="skill-name">${s.name}</span>
      <span class="skill-cd" id="skill-cd-${i}"></span>
    </button>`).join('') + `
    <button class="skill-btn skill-fury" id="btn-fury" title="Накопите ярость ударами и активируйте ×2 урона на 15 секунд">
      <span class="skill-icon">🔥</span>
      <span class="skill-name">Ярость</span>
      <span class="fury-mini" id="fury-mini"></span>
    </button>`);

  bar.addEventListener('click', (ev) => {
    const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!btn) return;
    if (btn.id === 'btn-fury') {
      if (game.activateFury()) flashFury();
      else toast('Ярость ещё не накоплена', 'info', 1500);
      return;
    }
    const idx = Number(btn.dataset.skill);
    if (game.useSkill(idx)) {
      btn.classList.remove('used');
      void btn.offsetWidth;
      btn.classList.add('used');
    } else {
      toast('Умение ещё восстанавливается', 'info', 1400);
    }
    refresh();
  });
}

function flashFury(): void {
  arena.classList.remove('fury-active');
  void arena.offsetWidth;
  arena.classList.add('fury-active');
}

/* ---------------------------------------------------------------- effects */

function floatingNumber(amount: number, crit: boolean, x: number, y: number): void {
  if (!game.state.effects) return;
  const node = document.createElement('span');
  node.className = 'dmg-number' + (crit ? ' crit' : '');
  node.textContent = (crit ? 'КРИТ ' : '−') + fmt(amount);
  node.style.left = `${x * 100}%`;
  node.style.top = `${y * 100}%`;
  fxLayer.appendChild(node);
  setTimeout(() => node.remove(), 900);
}

function slash(x: number, y: number, crit: boolean): void {
  if (!game.state.effects) return;
  const node = document.createElement('div');
  node.className = 'slash' + (crit ? ' crit' : '');
  node.style.left = `${x * 100}%`;
  node.style.top = `${y * 100}%`;
  node.style.transform = `translate(-50%,-50%) rotate(${Math.random() * 70 - 35}deg)`;
  node.style.setProperty('--slash-rot', `${Math.random() * 60 - 30}deg`);
  fxLayer.appendChild(node);
  setTimeout(() => node.remove(), 350);
}

function hitFlash(): void {
  const art = q('#enemy-art', arena.parentElement!);
  art.classList.remove('hit');
  void art.offsetWidth;
  art.classList.add('hit');
  setTimeout(() => art.classList.remove('hit'), 160);
}

function shake(): void {
  if (!game.state.effects) return;
  arena.classList.remove('shake');
  void arena.offsetWidth;
  arena.classList.add('shake');
  setTimeout(() => arena.classList.remove('shake'), 300);
}

function coins(count = 5): void {
  if (!game.state.effects) return;
  for (let i = 0; i < count; i++) {
    const node = document.createElement('span');
    node.className = 'coin-fly';
    node.innerHTML = icon('🪙');
    node.style.left = `${44 + Math.random() * 14}%`;
    node.style.top = `${48 + Math.random() * 12}%`;
    node.style.setProperty('--dx', `${(Math.random() - 0.5) * 100}px`);
    node.style.setProperty('--dy', `${-70 - Math.random() * 80}px`);
    node.style.animationDelay = `${i * 45}ms`;
    fxLayer.appendChild(node);
    setTimeout(() => node.remove(), 1100);
  }
}

function enemyDefeat(): void {
  // The dying animation is applied to the SVG itself in renderEnemy(), so a
  // fresh enemy can appear immediately without inheriting the fade-out.
  coins(5);
}

/* ----------------------------------------------------------------- handlers */

export function onGameEvent(e: GameEvent): void {
  switch (e.type) {
    case 'hit':
      floatingNumber(e.amount, e.crit, e.x, e.y);
      slash(e.x, e.y, e.crit);
      hitFlash();
      break;
    case 'skill':
      toast(`${e.name}: −${fmt(e.amount)}`, 'good', 1800);
      floatingNumber(e.amount, true, 0.5, 0.42);
      shake();
      break;
    case 'kill':
      enemyDefeat();
      if (e.boss) toast(`👑 Победа над боссом! +${fmt(e.gold)} золота`, 'good');
      break;
    case 'shake':
      shake();
      break;
    case 'wave':
      if (e.regionChanged) {
        const r = regionFor(e.wave);
        toast(`🚩 Новая земля: ${r.name}`, 'good', 3200);
      } else if (e.boss) {
        toast('⚠️ Приближается босс!', 'bad', 2200);
      }
      break;
  }
}

/* ------------------------------------------------------------------ screen */

let root: HTMLElement;

function renderEnemy(): void {
  const wave = game.state.wave;
  const region = regionFor(wave);
  const def = enemyFor(wave);
  const art = { ...def.art };
  if (game.boss) art.scale = (art.scale ?? 1) * 1.06;

  if (lastRegion !== regionIndex(wave)) {
    q('#arena-bg', root).innerHTML = renderBackdrop(region);
    q('#region-chapter', root).textContent = chapter(wave);
    q('#region-name', root).textContent = region.name;
    q('#region-sub', root).textContent = region.subtitle;
    root.style.setProperty('--region-accent', region.accent);
    lastRegion = regionIndex(wave);
  }
  const artEl = q('#enemy-art', root);
  const html = renderCreature(art);
  if (game.state.effects) {
    for (const stale of artEl.querySelectorAll('.dying-svg')) stale.remove();
    const previous = artEl.querySelector('svg');
    if (previous) {
      previous.classList.remove('entering-svg');
      previous.classList.add('dying-svg');
      const holder = document.createElement('div');
      holder.innerHTML = html;
      const incoming = holder.firstElementChild;
      if (incoming) {
        incoming.classList.add('entering-svg');
        artEl.appendChild(incoming);
      }
      setTimeout(() => previous.remove(), 420);
    } else {
      artEl.innerHTML = html;
    }
  } else {
    artEl.innerHTML = html;
  }
  q('#enemy-name', root).textContent = def.name;
  q('#enemy-tag', root).textContent = game.boss ? 'БОСС' : `ур. ${wave}`;
  q('#enemy-wrap', root).classList.toggle('is-boss', game.boss);
  q('#wave-label', root).textContent = `ВОЛНА ${wave}`;
  q('#wave-chip', root).classList.toggle('boss', game.boss);
  q('#boss-chip', root).hidden = !game.boss;
  lastWave = wave;
}

function refresh(): void {
  if (!root) return;
  const s = game.state;
  if (lastWave !== s.wave) renderEnemy();

  const pct = Math.max(0, Math.min(1, s.enemyHp / s.enemyMaxHp));
  const fill = q('#hp-fill', root);
  fill.style.width = `${pct * 100}%`;
  fill.classList.toggle('low', pct < 0.3);
  q('#hp-text', root).textContent = `${fmt(s.enemyHp)} / ${fmt(s.enemyMaxHp)}`;

  q('#boss-timer', root).textContent = String(Math.ceil(s.bossTimer));
  q('#boss-chip', root).classList.toggle('danger', s.bossTimer <= 8 && game.boss);

  q('#stat-tap', root).textContent = fmtHud(game.tapDamage());
  q('#stat-dps', root).textContent = fmtHud(game.heroDps()) + '/сек';
  q('#stat-crit', root).textContent = Math.round(game.critChance() * 100) + '%';

  const furyPct = s.furyTime > 0 ? (s.furyTime / 15) * 100 : s.fury;
  q('#fury-fill', root).style.width = `${furyPct}%`;
  q('#fury-text', root).textContent = s.furyTime > 0 ? `×2 · ${Math.ceil(s.furyTime)}с` : `${Math.floor(s.fury)}%`;
  q('.fury-line', root).classList.toggle('active', s.furyTime > 0);
  const furyBtn = q<HTMLButtonElement>('#btn-fury', root);
  furyBtn.classList.toggle('ready', s.fury >= 100 && s.furyTime <= 0);
  q('#fury-mini', root).textContent = s.furyTime > 0 ? `${Math.ceil(s.furyTime)}с` : `${Math.floor(s.fury)}%`;

  for (let i = 0; i < SKILLS.length; i++) {
    const cd = s.cooldowns[i];
    const cdNode = q(`#skill-cd-${i}`, root);
    cdNode.textContent = cd > 0 ? `${Math.ceil(cd)}с` : '';
    const btn = q<HTMLButtonElement>(`.skill-btn[data-skill="${i}"]`, root);
    btn.classList.toggle('cooling', cd > 0);
    btn.style.setProperty('--cd', `${cd / SKILLS[i].cooldown}`);
  }
}

export function createBattleScreen(): Screen {
  root = build();
  arena = q('#arena', root);
  fxLayer = q('#fx-damage', root);
  buildSkills();

  arena.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    const rect = arena.getBoundingClientRect();
    const x = Math.max(0.08, Math.min(0.92, (ev.clientX - rect.left) / rect.width));
    const y = Math.max(0.12, Math.min(0.86, (ev.clientY - rect.top) / rect.height));
    game.tap(x, y);
    if (hintShown) {
      hintShown = false;
      q('#tap-hint', root).classList.add('gone');
    }
  });

  // Dust motes in the arena (purely decorative, generated once).
  const dust = q('#arena-dust', root);
  for (let i = 0; i < 16; i++) {
    const m = document.createElement('i');
    m.style.left = `${Math.random() * 100}%`;
    m.style.top = `${Math.random() * 100}%`;
    m.style.animationDelay = `${-Math.random() * 12}s`;
    m.style.animationDuration = `${8 + Math.random() * 9}s`;
    dust.appendChild(m);
  }

  if (!hintShown) q('#tap-hint', root).classList.add('gone');

  const screen: Screen = { el: root, refresh };
  return screen;
}

/** Reset cached art when a new game/prestige changes the region. */
export function invalidateBattleArt(): void {
  lastWave = -1;
  lastRegion = -1;
}

export function showOfflineModal(result: { seconds: number; capped: boolean; gold: number; waves: number }): void {
  const lines = [
    `<div class="offline-hero">🏰</div>`,
    `<p class="modal-text">Ваша дружина сражалась без вас <b>${fmtTime(result.seconds)}</b>${result.capped ? ' (достигнут предел офлайна)' : ''}.</p>`,
    `<div class="offline-rewards">
       <div><span>🪙 Золото</span><b>+${fmt(result.gold)}</b></div>
       <div><span>🚩 Волн пройдено</span><b>+${fmt(result.waves)}</b></div>
     </div>`,
  ].join('');
  showModal({
    title: 'Пока вас не было',
    html: lines,
    actions: [{ label: 'Продолжить поход', kind: 'primary' }],
  });
}
