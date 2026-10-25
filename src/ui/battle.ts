import { createLiveStage, type LiveStage } from '../art/live';
import { emojify } from '../art/icons';
import { enemyFor, game, regionFor, type GameEvent, type OfflineResult } from '../game/engine';
import { fmt, fmtHud, fmtTime } from '../game/format';
import { regionCycle, regionIndex, REGIONS, SKILLS } from '../game/data';
import { q, Screen, showModal, toast } from './common';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function chapter(wave: number): string {
  const idx = regionIndex(wave) + regionCycle(wave) * REGIONS.length;
  return `ГЛАВА ${ROMAN[Math.min(idx, ROMAN.length - 1)]}`;
}

let arena: HTMLElement;
let fxLayer: HTMLElement;
let stage: LiveStage | null = null;
let lastWave = -1;
let lastRegion = -1;
let lastTierToast = 0;

function build(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'battle-screen';
  el.innerHTML = emojify(`
    <div class="arena" id="arena">
      <canvas class="arena-canvas" id="arena-canvas" aria-label="Поле боя"></canvas>
      <div class="arena-frame"></div>

      <div class="region-banner">
        <span class="region-chapter" id="region-chapter"></span>
        <span class="region-name" id="region-name"></span>
        <span class="region-sub" id="region-sub"></span>
      </div>

      <div class="wave-chip" id="wave-chip"><span id="wave-label">ВОЛНА 1</span></div>
      <div class="boss-chip" id="boss-chip" hidden><span>👑 БОСС</span><b id="boss-timer">30</b></div>
      <div class="battle-caption" id="battle-caption">⚔️ БОЙ ИДЁТ САМ</div>
      <div class="fx-damage" id="fx-damage"></div>
    </div>

    <div class="battle-bottom">
      <div class="stat-strip">
        <div class="stat-cell"><span>Удар</span><b id="stat-tap">5</b></div>
        <div class="stat-cell"><span>Урон/сек</span><b id="stat-dps">0</b></div>
        <div class="stat-cell"><span>Броня</span><b id="stat-armor">0</b></div>
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

const SHORT_SKILLS = ['Удар', 'Гнев', 'Казна', 'Лечение'];

function buildSkills(): void {
  const bar = q('#skill-bar', arena.parentElement!);
  bar.innerHTML = emojify(SKILLS.map((s, i) => `
    <button class="skill-btn" data-skill="${i}" title="${s.desc}">
      <span class="skill-icon">${s.icon}</span>
      <span class="skill-name">${SHORT_SKILLS[i] ?? s.name}</span>
      <span class="skill-cd" id="skill-cd-${i}"></span>
    </button>`).join('') + `
    <button class="skill-btn skill-fury" id="btn-fury" title="Накопите ярость и активируйте ×2 урона на 15 секунд">
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
      btn.classList.remove('used'); void btn.offsetWidth; btn.classList.add('used');
    } else toast('Умение ещё восстанавливается', 'info', 1400);
  });
}

function flashFury(): void {
  arena.classList.remove('fury-active'); void arena.offsetWidth; arena.classList.add('fury-active');
}

function floatingNumber(amount: number, crit: boolean, x: number, y: number, hero = false): void {
  if (!game.state.effects) return;
  const node = document.createElement('span');
  node.className = 'dmg-number' + (crit ? ' crit' : '') + (hero ? ' hero' : '');
  node.textContent = (hero ? '−' : crit ? 'КРИТ ' : '−') + fmt(amount);
  node.style.left = `${x * 100}%`;
  node.style.top = `${y * 100}%`;
  fxLayer.appendChild(node);
  setTimeout(() => node.remove(), 900);
}

export function onGameEvent(e: GameEvent): void {
  if (!stage) return;
  switch (e.type) {
    case 'enemy':
      stage.setEnemy(e.def, e.boss);
      stage.setRegion(regionFor(game.wave));
      break;
    case 'enemyDown': stage.enemyDown(); break;
    case 'enemyHit': stage.enemyHit(); break;
    case 'heroStrike': stage.heroStrike(); break;
    case 'enemyAttack': stage.enemyAttack(); break;
    case 'heroHit':
      if (e.amount > 0) {
        stage.heroHit();
        floatingNumber(e.amount, false, 0.24 + Math.random() * 0.08, 0.52, true);
      }
      break;
    case 'heroDown': stage.heroDown(); break;
    case 'heroRespawn': stage.heroRespawn(); break;
    case 'hit': floatingNumber(e.amount, e.crit, e.x, e.y); break;
    case 'shake': flashFury(); break;
    case 'loot':
      toast(`${e.equipped ? '⚔️ Надето' : '📦 Найдено'}: ${e.item.name}`, 'good');
      stage.setEquipment(game.state.equipment);
      break;
    case 'heroLevel':
      toast(`✨ Герой достиг ${e.level}-го уровня! HP восстановлено`, 'good');
      break;
    case 'tierReady': {
      const now = performance.now();
      if (now - lastTierToast > 45000) {
        lastTierToast = now;
        toast(`🏆 Доступно наград: ${e.name}. Заберите во вкладке «Достиж.»`, 'good', 3200);
      }
      break;
    }
  }
}

export function invalidateBattleArt(): void {
  if (!stage) return;
  stage.setEnemy(enemyFor(game.wave), game.boss);
  stage.setRegion(regionFor(game.wave));
  stage.setEquipment(game.state.equipment);
}

export function showOfflineModal(r: OfflineResult): void {
  const rows = [
    `<div class="offline-row"><span>⏳ Время в отряде</span><b>${fmtTime(r.seconds)}</b></div>`,
    `<div class="offline-row"><span>🪙 Золото</span><b>+${fmt(r.gold)}</b></div>`,
    `<div class="offline-row"><span>🚩 Волн пройдено</span><b>+${fmt(r.waves)}</b></div>`,
  ];
  if (r.items > 0) rows.push(`<div class="offline-row"><span>📦 Предметов найдено</span><b>+${fmt(r.items)}</b></div>`);
  if (r.capped) rows.push(`<p class="offline-note">Лимит офлайн-прогресса: ${fmtTime(game.offlineCap())}. Улучшите «Походный лагерь».</p>`);
  showModal({
    title: 'Дружина вернулась',
    html: `<p class="modal-lead">Пока вас не было, герои продолжали поход.</p>${rows.join('')}`,
    actions: [{ label: 'Продолжить', kind: 'primary', close: true }],
  });
}

export function createBattleScreen(): Screen {
  const root = build();
  arena = q('#arena', root);
  fxLayer = q('#fx-damage', root);
  stage = createLiveStage(q<HTMLCanvasElement>('#arena-canvas', root));
  stage.setEnemy(enemyFor(game.wave), game.boss);
  stage.setRegion(regionFor(game.wave));
  stage.setEquipment(game.state.equipment);
  buildSkills();

  const caption = q('#battle-caption', root);

  function refresh(): void {
    const s = game.state;
    const wave = s.wave;
    if (wave !== lastWave) {
      lastWave = wave;
      q('#wave-label', root).textContent = `ВОЛНА ${wave}`;
      q('#wave-chip', root).classList.toggle('is-boss', game.boss);
    }
    const ri = regionIndex(wave);
    if (ri !== lastRegion || q('#region-name', root).textContent === '') {
      lastRegion = ri;
      const region = regionFor(wave);
      q('#region-chapter', root).textContent = chapter(wave);
      q('#region-name', root).textContent = region.name;
      q('#region-sub', root).textContent = region.subtitle;
      arena.style.setProperty('--region-accent', region.accent);
    }
    const bossChip = q('#boss-chip', root);
    bossChip.hidden = !game.boss;
    if (game.boss) q('#boss-timer', root).textContent = String(Math.ceil(s.bossTimer));

    q('#stat-tap', root).textContent = fmtHud(game.tapDamage());
    q('#stat-dps', root).textContent = fmtHud(game.totalDps());
    q('#stat-armor', root).textContent = fmtHud(game.armor());
    q('#stat-crit', root).textContent = `${Math.round(game.critChance() * 100)}%`;

    const furyPct = Math.round(s.fury);
    q('#fury-fill', root).style.width = `${furyPct}%`;
    q('#fury-text', root).textContent = s.furyTime > 0 ? `×2 · ${Math.ceil(s.furyTime)}с` : `${furyPct}%`;
    q('#btn-fury', root).classList.toggle('ready', s.fury >= 100 && s.furyTime <= 0);
    q('#fury-mini', root).textContent = s.furyTime > 0 ? `${Math.ceil(s.furyTime)}с` : '';
    q('.fury-line', root).classList.toggle('active', s.furyTime > 0);

    for (let i = 0; i < SKILLS.length; i++) {
      const cd = s.cooldowns[i];
      q(`#skill-cd-${i}`, root).textContent = cd > 0 ? `${Math.ceil(cd)}с` : '';
      q(`button[data-skill="${i}"]`, root).classList.toggle('cooling', cd > 0);
    }

    stage?.setEnemyHp(s.enemyMaxHp > 0 ? s.enemyHp / s.enemyMaxHp : 1);
    stage?.setHeroHp(s.player.maxHp > 0 ? s.player.hp / s.player.maxHp : 1, game.heroAlive);
    stage?.setEquipment(s.equipment);

    caption.textContent = !game.heroAlive
      ? `🛡️ ВОЗРОЖДЕНИЕ · ${Math.ceil(s.respawnTimer)}с`
      : game.boss ? '👑 БИТВА С БОССОМ' : s.autoSkills ? '⚔️ АВТОБОЙ · КАСАНИЕ УСКОРЯЕТ' : '⚔️ БОЙ ИДЁТ САМ';
    caption.classList.toggle('danger', !game.heroAlive);
  }

  arena.addEventListener('pointerdown', (ev) => {
    const rect = arena.getBoundingClientRect();
    const x = (ev.clientX - rect.left) / rect.width;
    const y = (ev.clientY - rect.top) / rect.height;
    game.tap(x, y);
    refresh();
  });

  refresh();
  return { el: root, refresh };
}
