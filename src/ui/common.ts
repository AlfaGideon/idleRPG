import { emojify } from '../art/icons';
import { game } from '../game/engine';
import { fmtHud } from '../game/format';

export function q<T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document): T {
  return root.querySelector(sel) as T;
}

export function qa<T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document): T[] {
  return Array.from(root.querySelectorAll(sel)) as T[];
}

export interface Screen {
  el: HTMLElement;
  refresh(): void;
  onShow?(): void;
}

const screens = new Map<string, Screen>();
let currentTab = 'battle';

export interface ModalAction {
  label: string;
  kind?: 'primary' | 'danger' | 'ghost';
  onClick?: (close: () => void) => void;
  close?: boolean;
}

export interface ModalOptions {
  title: string;
  html: string;
  actions?: ModalAction[];
  onOpen?: (root: HTMLElement) => void;
  closable?: boolean;
}

let modalRoot: HTMLElement;
let toastRoot: HTMLElement;

export function initUI(): void {
  modalRoot = q('#modal-root');
  toastRoot = q('#toasts');
}

export function registerScreen(id: string, screen: Screen): void {
  screens.set(id, screen);
}

export function currentScreen(): string { return currentTab; }

export function setTab(id: string): void {
  if (!screens.has(id)) return;
  currentTab = id;
  for (const [key, screen] of screens) screen.el.hidden = key !== id;
  for (const btn of qa<HTMLButtonElement>('.tab-btn')) {
    btn.classList.toggle('active', btn.dataset.tab === id);
    btn.setAttribute('aria-selected', String(btn.dataset.tab === id));
  }
  screens.get(id)?.onShow?.();
  const main = q('#screens');
  main.scrollTop = 0;
  refreshAll();
}

export function updateTopbar(): void {
  const s = game.state;
  const gold = q('#res-gold');
  const glory = q('#res-glory');
  const dps = q('#res-dps');
  const wave = q('#res-wave');
  if (gold) gold.textContent = fmtHud(s.gold);
  if (glory) glory.textContent = fmtHud(s.glory);
  if (dps) dps.textContent = fmtHud(game.totalDps());
  if (wave) wave.textContent = String(s.wave);
  const badge = q('#tab-badge');
  if (badge) {
    const n = game.claimableCount();
    badge.hidden = n === 0;
    badge.textContent = String(n);
  }
  const gloryBadge = q('#glory-badge');
  if (gloryBadge) gloryBadge.hidden = game.state.glory <= 0;
  const furyBadge = q('#fury-badge');
  if (furyBadge) furyBadge.hidden = game.state.fury < 100 || game.state.furyTime > 0;
}

export function refreshAll(): void {
  updateTopbar();
  const screen = screens.get(currentTab);
  screen?.refresh();
}

export function refreshScreen(id: string): void {
  screens.get(id)?.refresh();
}

/* -------------------------------------------------------------------- toasts */

export type ToastKind = 'info' | 'good' | 'bad';

export function toast(text: string, kind: ToastKind = 'info', ms = 2600): void {
  if (!toastRoot) return;
  const node = document.createElement('div');
  node.className = `toast toast-${kind}`;
  node.innerHTML = emojify(escapeHtml(text));
  toastRoot.appendChild(node);
  while (toastRoot.children.length > 4) toastRoot.removeChild(toastRoot.firstChild!);
  setTimeout(() => {
    node.classList.add('out');
    setTimeout(() => node.remove(), 350);
  }, ms);
}

/* -------------------------------------------------------------------- modals */

export function showModal(opts: ModalOptions): void {
  closeModal(true);
  const closable = opts.closable !== false;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = emojify(`
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-top">
        <span class="modal-ornament"></span>
        <h3>${opts.title}</h3>
        <span class="modal-ornament"></span>
      </div>
      ${closable ? '<button class="modal-x" aria-label="Закрыть">&times;</button>' : ''}
      <div class="modal-body">${opts.html}</div>
      <div class="modal-actions"></div>
    </div>`);
  modalRoot.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('shown'));

  const close = () => closeModal();

  const actions = q('.modal-actions', overlay);
  for (const a of opts.actions ?? []) {
    const btn = document.createElement('button');
    btn.className = `btn btn-${a.kind ?? 'ghost'}`;
    btn.textContent = a.label;
    btn.addEventListener('click', () => {
      if (a.onClick) a.onClick(close);
      if (a.close !== false && !a.onClick) close();
    });
    actions.appendChild(btn);
  }

  if (closable) {
    q('.modal-x', overlay).addEventListener('click', close);
    overlay.addEventListener('click', (ev) => { if (ev.target === overlay) close(); });
  }
  opts.onOpen?.(overlay);
}

export function closeModal(instant = false): void {
  if (!modalRoot) return;
  const overlay = q('.modal-overlay', modalRoot);
  if (!overlay) return;
  if (instant) { overlay.remove(); return; }
  overlay.classList.remove('shown');
  overlay.style.pointerEvents = 'none';
  setTimeout(() => overlay.remove(), 220);
}

export function isModalOpen(): boolean {
  return !!modalRoot?.querySelector('.modal-overlay');
}

export function confirmModal(title: string, text: string, onYes: () => void, yesLabel = 'Да'): void {
  showModal({
    title,
    html: `<p class="modal-text">${text}</p>`,
    actions: [
      { label: 'Отмена', kind: 'ghost' },
      { label: yesLabel, kind: 'danger', onClick: (close) => { close(); onYes(); } },
    ],
  });
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
