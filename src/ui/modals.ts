import { sfx } from '../game/audio';
import { game } from '../game/engine';
import { exportSave, importSave, isFallbackStorage, wipeSave } from '../game/state';
import { escapeHtml, q, refreshAll, showModal, toast, confirmModal } from './common';
import { invalidateBattleArt } from './battle';

export function openHelp(): void {
  showModal({
    title: 'Как играть',
    html: `
      <div class="help-list">
        <div class="help-item"><span>1️⃣</span><div><b>Бейте врага</b><br>Касания по арене наносят урон. Критические удары бьют в несколько раз сильнее.</div></div>
        <div class="help-item"><span>2️⃣</span><div><b>Соберите дружину</b><br>Герои наносят урон сами — даже когда игра закрыта. Во вкладке «Герои» можно покупать ×1, ×10 или максимум уровней.</div></div>
        <div class="help-item"><span>3️⃣</span><div><b>Куйте победу</b><br>Кузница усиливает касания, криты, золото и автоатаки. Умения внизу арены помогают в бою.</div></div>
        <div class="help-item"><span>4️⃣</span><div><b>Копите ярость</b><br>Удары заполняют шкалу. Когда она полна — жмите «Ярость» и получите ×2 ко всему урону на 15 секунд.</div></div>
        <div class="help-item"><span>5️⃣</span><div><b>Начните новый поход</b><br>С 25-й волны доступна перезагрузка прогресса за 👑 Славу — она даёт постоянные бонусы.</div></div>
        <div class="help-item"><span>🏰</span><div><b>Играйте офлайн</b><br>Игра сохраняется сама и работает без интернета. Добавьте её на главный экран телефона как приложение.</div></div>
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
      <p class="modal-text centered">Вы — последний рыцарь. Начните с деревянного меча и станьте легендой.</p>
      <div class="intro-steps">
        <span>⚔️ Бейте</span><span>🦸 Нанимайте</span><span>👑 Возрождайтесь</span>
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

export function openSettings(): void {
  const s = game.state;
  showModal({
    title: 'Настройки',
    html: `
      <div class="settings-grid">
        <button class="setting-row" id="set-sound"><span>🔊 Звук</span><b class="toggle ${s.sound ? 'on' : ''}">${s.sound ? 'ВКЛ' : 'ВЫКЛ'}</b></button>
        <button class="setting-row" id="set-fx"><span>✨ Эффекты</span><b class="toggle ${s.effects ? 'on' : ''}">${s.effects ? 'ВКЛ' : 'ВЫКЛ'}</b></button>
        <button class="setting-row" id="set-help"><span>📖 Как играть</span><b>›</b></button>
        <button class="setting-row" id="set-export"><span>📤 Экспорт сохранения</span><b>›</b></button>
        <button class="setting-row" id="set-import"><span>📥 Импорт сохранения</span><b>›</b></button>
        <button class="setting-row danger" id="set-reset"><span>🗑️ Сбросить прогресс</span><b>›</b></button>
      </div>
      <p class="settings-foot">Корона и Клинок · v1.0.0<br>Автосохранение каждые 10 секунд<br>${storageLine()}</p>`,
    actions: [{ label: 'Закрыть', kind: 'primary' }],
    onOpen: (root) => {
      q('#set-sound', root).addEventListener('click', () => {
        game.state.sound = !game.state.sound;
        sfx.enabled = game.state.sound;
        if (game.state.sound) sfx.play('buy');
        game.save();
        q('.toggle', q('#set-sound', root)).className = `toggle ${game.state.sound ? 'on' : ''}`;
        q('.toggle', q('#set-sound', root)).textContent = game.state.sound ? 'ВКЛ' : 'ВЫКЛ';
      });
      q('#set-fx', root).addEventListener('click', () => {
        game.state.effects = !game.state.effects;
        game.save();
        const t = q('.toggle', q('#set-fx', root));
        t.className = `toggle ${game.state.effects ? 'on' : ''}`;
        t.textContent = game.state.effects ? 'ВКЛ' : 'ВЫКЛ';
      });
      q('#set-help', root).addEventListener('click', openHelp);
      q('#set-export', root).addEventListener('click', openExport);
      q('#set-import', root).addEventListener('click', openImport);
      q('#set-reset', root).addEventListener('click', () => {
        confirmModal('Сбросить прогресс?',
          'Весь прогресс, включая Славу и достижения, будет удалён без возможности восстановления.',
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
