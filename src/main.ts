import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/700.css';
import '@fontsource/cinzel/700.css';
import './styles/base.css';
import './styles/battle.css';
import './styles/panels.css';
import './styles/effects.css';

import { emojify } from './art/icons';
import { sfx } from './game/audio';
import { game } from './game/engine';
import { createAchievementsScreen, createForgeScreen, createGloryScreen, createHeroesScreen } from './ui/panels';
import { createBattleScreen, invalidateBattleArt, onGameEvent, showOfflineModal } from './ui/battle';
import { closeModal, initUI, q, refreshAll, registerScreen, setTab, toast } from './ui/common';
import { openFirstRun, openHelp, openSettings } from './ui/modals';

const SHELL = `
<div class="app-frame">
  <header class="topbar">
    <div class="topbar-main">
      <div class="brand">
        <div class="brand-crest">
          <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 4 58 14v22c0 14-12 22-26 27C18 58 6 50 6 36V14z" fill="#c99a3d"/><path d="M32 9 53 17v19c0 11-9 18-21 23-12-5-21-12-21-23V17z" fill="#8d2f36"/><path d="M17 24 15 12l9 6 8-9 8 9 9-6-2 12z" fill="#f0cf72"/><circle cx="32" cy="37" r="4" fill="#5bc0eb"/></svg>
        </div>
        <div class="brand-copy">
          <span class="brand-title">Корона и Клинок</span>
          <span class="brand-sub latin">IDLE RPG · MEDIEVAL</span>
        </div>
      </div>
      <div class="topbar-actions">
        <button class="icon-btn" id="btn-help" aria-label="Как играть">❔</button>
        <button class="icon-btn" id="btn-settings" aria-label="Настройки">⚙️</button>
      </div>
    </div>
    <div class="resource-bar">
      <div class="res res-gold"><i>🪙</i><b id="res-gold">0</b><small>золото</small></div>
      <div class="res res-glory"><i>👑</i><b id="res-glory">0</b><small>слава</small></div>
      <div class="res res-dps"><i>⚔️</i><b id="res-dps">0</b><small>урон/сек</small></div>
      <div class="res res-wave"><i>🚩</i><b id="res-wave">1</b><small>волна</small></div>
    </div>
  </header>

  <main id="screens">
    <section class="screen" id="screen-battle"></section>
    <section class="screen" id="screen-heroes" hidden></section>
    <section class="screen" id="screen-forge" hidden></section>
    <section class="screen" id="screen-glory" hidden></section>
    <section class="screen" id="screen-achievements" hidden></section>
  </main>

  <nav class="tabbar" role="tablist" aria-label="Разделы игры">
    <button class="tab-btn active" data-tab="battle" role="tab"><span class="tab-icon">⚔️</span><span class="tab-label">Бой</span><i class="badge dot" id="fury-badge" hidden></i></button>
    <button class="tab-btn" data-tab="heroes" role="tab"><span class="tab-icon">🦸</span><span class="tab-label">Герои</span></button>
    <button class="tab-btn" data-tab="forge" role="tab"><span class="tab-icon">🔨</span><span class="tab-label">Кузница</span></button>
    <button class="tab-btn" data-tab="glory" role="tab"><span class="tab-icon">👑</span><span class="tab-label">Слава</span><i class="badge dot" id="glory-badge" hidden></i></button>
    <button class="tab-btn" data-tab="achievements" role="tab"><span class="tab-icon">🏆</span><span class="tab-label">Достиж.</span><i class="badge" id="tab-badge" hidden>0</i></button>
  </nav>

  <div id="toasts"></div>
  <div id="modal-root"></div>
</div>`;

const root = document.getElementById('app');
if (!root) throw new Error('#app not found');
root.innerHTML = emojify(SHELL);
initUI();
sfx.enabled = game.state.sound;

/* ------------------------------------------------------------------ screens */

function mount(id: string, factory: () => { el: HTMLElement; refresh(): void; onShow?(): void }): void {
  const section = q(`#screen-${id}`);
  const screen = factory();
  section.appendChild(screen.el);
  registerScreen(id, { el: section, refresh: screen.refresh, onShow: screen.onShow });
}

mount('battle', createBattleScreen);
mount('heroes', createHeroesScreen);
mount('forge', createForgeScreen);
mount('glory', createGloryScreen);
mount('achievements', createAchievementsScreen);

/* ------------------------------------------------------------------ offline */

const firstRun = game.state.stats.taps === 0 && game.state.stats.kills === 0 && game.state.gold === 0;
const elapsed = Math.max(0, (Date.now() - game.state.lastSeen) / 1000);
const offline = firstRun ? null : game.applyOffline(elapsed);
if (firstRun) game.spawnEnemy();
game.save();

setTab('battle');

if (offline && (offline.gold > 0 || offline.waves > 0)) {
  setTimeout(() => showOfflineModal(offline), 350);
} else if (firstRun) {
  setTimeout(openFirstRun, 450);
}

/* ------------------------------------------------------------------- events */

let lastKillSound = 0;
let lastBossSound = 0;

game.on((e) => {
  onGameEvent(e);
  const now = performance.now();
  switch (e.type) {
    case 'hit': sfx.play(e.crit ? 'crit' : 'tap'); break;
    case 'kill':
      if (now - lastKillSound > 180) { lastKillSound = now; sfx.play('kill'); sfx.play('coin'); }
      break;
    case 'buy': sfx.play('buy'); break;
    case 'skill': sfx.play('skill'); break;
    case 'prestige':
      sfx.play('prestige');
      invalidateBattleArt();
      refreshAll();
      break;
    case 'wave':
      if (e.boss && now - lastBossSound > 2000) { lastBossSound = now; sfx.play('boss'); }
      break;
    case 'toast': toast(e.text, e.kind); break;
  }
});

/* -------------------------------------------------------------- navigation */

q('.tabbar').addEventListener('click', (ev) => {
  const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>('.tab-btn');
  if (!btn?.dataset.tab) return;
  if (btn.dataset.tab !== 'battle') sfx.play('tap');
  setTab(btn.dataset.tab);
});

q('#btn-settings').addEventListener('click', openSettings);
q('#btn-help').addEventListener('click', openHelp);

document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') closeModal();
  const map: Record<string, string> = { '1': 'battle', '2': 'heroes', '3': 'forge', '4': 'glory', '5': 'achievements' };
  if (map[ev.key] && !ev.ctrlKey && !ev.metaKey && !ev.altKey) setTab(map[ev.key]);
});

/* ---------------------------------------------------------------- game loop */

let lastFrame = performance.now();
let lastRender = 0;
let hiddenAt = 0;

function frame(now: number): void {
  const dt = (now - lastFrame) / 1000;
  lastFrame = now;
  if (!document.hidden) game.tick(dt);
  if (now - lastRender >= 100) { lastRender = now; refreshAll(); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    hiddenAt = Date.now();
    game.save();
  } else {
    const away = (Date.now() - hiddenAt) / 1000;
    lastFrame = performance.now();
    if (away > 30) {
      const result = game.applyOffline(away);
      if (result && (result.gold > 0 || result.waves > 0)) showOfflineModal(result);
    }
    refreshAll();
  }
});

window.addEventListener('pagehide', () => game.save());
window.addEventListener('beforeunload', () => game.save());

/* --------------------------------------------------------------------- PWA */

const securePage = location.protocol === 'https:' || location.protocol === 'http:';
if ('serviceWorker' in navigator && import.meta.env.PROD && securePage) {
  window.addEventListener('load', () => {
    const url = new URL('./sw.js', location.href).href;
    navigator.serviceWorker.register(url).catch(() => { /* offline mode is optional */ });
  });
}

/* Prevent iOS double-tap zoom on game surfaces. */
let lastTouch = 0;
document.addEventListener('touchend', (ev) => {
  const now = Date.now();
  if (now - lastTouch < 300) ev.preventDefault();
  lastTouch = now;
}, { passive: false });

/* Debug hook, handy in devtools. */
(window as unknown as { idleRPG: typeof game }).idleRPG = game;
