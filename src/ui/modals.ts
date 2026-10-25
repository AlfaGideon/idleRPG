import { sfx } from '../game/audio';
import { game } from '../game/engine';
import { exportSave, importSave, isFallbackStorage, wipeSave } from '../game/state';
import { APP_VERSION, updater } from '../game/updater';
import { escapeHtml, q, refreshAll, showModal, toast, confirmModal } from './common';
import { invalidateBattleArt } from './battle';

export function openHelp(): void {
  showModal({
    title: 'Как играть',
    html: `
      <div class="help-list">
        <div class="help-item"><span>⚔️</span><div><b>Бой идёт сам</b><br>Ваш герой и дружина сражаются автоматически. Монстр отвечает ударами — следите за полоской HP. Касание по арене ускоряет победу, но не обязательно.</div></div>
        <div class="help-item"><span>🛡️</span><div><b>Качайте персонажа</b><br>За победы герой получает опыт и уровни: растут урон, запас здоровья и регенерация. С врагов падают предметы — надевайте их во вкладке «Герой».</div></div>
        <div class="help-item"><span>🦸</span><div><b>Соберите дружину</b><br>Нанимайте героев за золото: они наносят урон постоянно, в том числе офлайн. Покупка ×1, ×10 или «максимум».</div></div>
        <div class="help-item"><span>🔨</span><div><b>Куйте победу</b><br>Кузница усиливает удары, криты, золото, броню и DPS. Умения применяются автоматически — это можно выключить в настройках.</div></div>
        <div class="help-item"><span>🏆</span><div><b>Цепочки достижений</b><br>13 цепочек по 5 ступеней. Каждая ступень даёт 👑 Славу — забирайте их во вкладке «Достиж.».</div></div>
        <div class="help-item"><span>👑</span><div><b>Новый поход</b><br>С 25-й волны начните заново за Славу: уровень героя, экипировка и достижения сохранятся, а постоянные перки усилят следующий забег.</div></div>
        <div class="help-item"><span>⬆️</span><div><b>Обновления по воздуху</b><br>Игра сама проверяет GitHub. Когда выйдет новая версия — появится баннер; нажмите «Перезапустить». Ваш прогресс не пострадает, APK обновлять не нужно.</div></div>
      </div>`,
    actions: [{ label: 'В бой!', kind: 'primary' }],
  });
}

export function openFirstRun(): void {
  showModal({
    title: 'Корона и Клинок',
    html: `
      <div class="intro-emblem">🛡️</div>
      <p class="modal-text centered">Королевство пало. Разбойники на дорогах, драконы в горах, а трон занят тьмой.</p>
      <p class="modal-text centered">Вы — последний рыцарь. Ваш герой сражается сам: наблюдайте, собирайте трофеи и усиливайте дружину.</p>
      <div class="intro-steps">
        <span>⚔️ Автобой</span><span>📦 Трофеи</span><span>👑 Наследие</span>
      </div>`,
    actions: [
      { label: 'Как играть', kind: 'ghost', onClick: (close) => { close(); openHelp(); } },
      { label: 'Начать поход', kind: 'primary' },
    ],
    closable: false,
  });
}

function openExport(): void {
  const code = exportSave(game.state);
  showModal({
    title: 'Сохранить прогресс',
    html: `<p class="modal-text">Скопируйте этот код и сохраните в надёжном месте. Он содержит весь ваш прогресс.</p>
      <textarea class="save-textarea" id="save-export" readonly>${escapeHtml(code)}</textarea>`,
    actions: [
      { label: 'Назад', kind: 'ghost', onClick: () => openSettings() },
      { label: 'Копировать', kind: 'primary', onClick: () => {
        const ta = q<HTMLTextAreaElement>('#save-export');
        ta.select();
        navigator.clipboard?.writeText(code).then(
          () => toast('Код сохранения скопирован', 'good'),
          () => toast('Выделите код и скопируйте вручную', 'info'),
        );
      } },
    ],
  });
}

function openImport(): void {
  showModal({
    title: 'Загрузить прогресс',
    html: `<p class="modal-text">Вставьте код сохранения. Текущий прогресс будет <b>заменён</b>.</p>
      <textarea class="save-textarea" id="save-import" placeholder="Код сохранения..."></textarea>`,
    actions: [
      { label: 'Назад', kind: 'ghost', onClick: () => openSettings() },
      { label: 'Загрузить', kind: 'danger', onClick: () => {
        const value = q<HTMLTextAreaElement>('#save-import').value;
        const next = importSave(value);
        if (!next) { toast('Неверный код сохранения', 'bad'); return; }
        game.replaceState(next);
        invalidateBattleArt();
        refreshAll();
        toast('Прогресс восстановлен', 'good');
      } },
    ],
  });
}

function storageLine(): string {
  if ((globalThis as unknown as { CKStorage?: unknown }).CKStorage) {
    return 'Хранилище: память приложения (APK)';
  }
  if (isFallbackStorage()) {
    return 'Хранилище: резервное (используйте экспорт сохранения)';
  }
  return 'Хранилище: браузерное (localStorage)';
}

function bindToggle(root: HTMLElement, selector: string, get: () => boolean,
                    set: (v: boolean) => void): void {
  q(selector, root).addEventListener('click', () => {
    set(!get());
    game.save();
    const t = q('.toggle', q(selector, root));
    const on = get();
    t.className = `toggle ${on ? 'on' : ''}`;
    t.textContent = on ? 'ВКЛ' : 'ВЫКЛ';
    sfx.play('buy');
  });
}

export function openSettings(): void {
  const s = game.state;
  showModal({
    title: 'Настройки',
    html: `
      <div class="settings-grid">
        <button class="setting-row" id="set-sound"><span>🔊 Звук</span><b class="toggle ${s.sound ? 'on' : ''}">${s.sound ? 'ВКЛ' : 'ВЫКЛ'}</b></button>
        <button class="setting-row" id="set-fx"><span>✨ Эффекты</span><b class="toggle ${s.effects ? 'on' : ''}">${s.effects ? 'ВКЛ' : 'ВЫКЛ'}</b></button>
        <button class="setting-row" id="set-auto-skills"><span>⚡ Авто-умения</span><b class="toggle ${s.autoSkills ? 'on' : ''}">${s.autoSkills ? 'ВКЛ' : 'ВЫКЛ'}</b></button>
        <button class="setting-row" id="set-auto-equip"><span>🛡️ Авто-экипировка</span><b class="toggle ${s.autoEquip ? 'on' : ''}">${s.autoEquip ? 'ВКЛ' : 'ВЫКЛ'}</b></button>
        <button class="setting-row" id="set-help"><span>📖 Как играть</span><b>›</b></button>
        <button class="setting-row" id="set-update"><span>⬆️ Проверить обновления</span><b>›</b></button>
        <button class="setting-row" id="set-export"><span>📤 Экспорт сохранения</span><b>›</b></button>
        <button class="setting-row" id="set-import"><span>📥 Импорт сохранения</span><b>›</b></button>
        <button class="setting-row danger" id="set-reset"><span>🗑️ Сбросить прогресс</span><b>›</b></button>
      </div>
      <p class="settings-foot">Корона и Клинок · v${APP_VERSION}<br>Автосохранение каждые 10 секунд<br>${storageLine()}<br>Обновления загружаются с GitHub автоматически</p>`,
    actions: [{ label: 'Закрыть', kind: 'primary' }],
    onOpen: (root) => {
      bindToggle(root, '#set-sound', () => game.state.sound, (v) => {
        game.state.sound = v; sfx.enabled = v;
      });
      bindToggle(root, '#set-fx', () => game.state.effects, (v) => { game.state.effects = v; });
      bindToggle(root, '#set-auto-skills', () => game.state.autoSkills, (v) => { game.state.autoSkills = v; });
      bindToggle(root, '#set-auto-equip', () => game.state.autoEquip, (v) => { game.state.autoEquip = v; });
      q('#set-help', root).addEventListener('click', openHelp);
      q('#set-update', root).addEventListener('click', async () => {
        toast('Проверяем GitHub…', 'info');
        const v = await updater.check(true);
        toast(v.status === 'ready'
          ? `Доступна версия ${v.version} — нажмите «Перезапустить» в баннере`
          : v.status === 'latest' ? 'У вас последняя версия' : v.message,
        v.status === 'error' ? 'bad' : 'good', 3600);
      });
      q('#set-export', root).addEventListener('click', openExport);
      q('#set-import', root).addEventListener('click', openImport);
      q('#set-reset', root).addEventListener('click', () => {
        confirmModal('Сбросить прогресс?',
          'Весь прогресс, включая Славу, экипировку и достижения, будет удалён без возможности восстановления.',
          () => {
            wipeSave();
            game.reset();
            sfx.enabled = game.state.sound;
            invalidateBattleArt();
            refreshAll();
            toast('Прогресс сброшен', 'info');
            openFirstRun();
          }, 'Сбросить');
      });
    },
  });
}
