import type {
  AchievementChain, AchievementDef, CreatureConfig, EnemyDef, EquipSlot,
  ForgeDef, HeroDef, MonsterKind, MonsterPalette, PerkDef, Region, SkillDef, SlotDef,
} from './types';

/* ------------------------------------------------------- procedural art base */

const BASE: CreatureConfig = {
  skin: '#e7b58c', skinShade: '#b9825e',
  cloth: '#5b6b8c', clothShade: '#39445e',
  metal: '#c2ccd8', eye: '#ffd166', hair: '#4a3020',
  head: 'human', body: 'humanoid', weapon: 'sword',
  horns: 'none', ears: 'none',
};

function cr(p: Partial<CreatureConfig>): CreatureConfig { return { ...BASE, ...p }; }

/** Presets used by the (legacy) SVG preview and by the live renderer palette. */
const ART: Record<MonsterKind, Partial<CreatureConfig>> = {
  wolf: { head: 'beast', body: 'beast', skin: '#8d98a3', skinShade: '#5d6874', cloth: '#6b7380', clothShade: '#424957', eye: '#ffd166', weapon: 'none', scale: 0.9 },
  bandit: { head: 'hood', skin: '#d9a97e', skinShade: '#9b7149', cloth: '#6b4a32', clothShade: '#422c1e', weapon: 'dagger' },
  goblin: { head: 'goblin', skin: '#93b45c', skinShade: '#63813a', cloth: '#8a6a3c', clothShade: '#5a4426', ears: 'pointy', weapon: 'dagger', scale: 0.88 },
  skeleton: { head: 'skull', skin: '#e5dfc9', skinShade: '#a9a38a', cloth: '#6d5340', clothShade: '#443425', weapon: 'sword' },
  orc: { head: 'goblin', body: 'brute', skin: '#a25c48', skinShade: '#6d3a2c', cloth: '#6b4a32', clothShade: '#3f2b1c', ears: 'pointy', weapon: 'axe', scale: 1.05 },
  yeti: { head: 'beast', body: 'brute', skin: '#e2f1f6', skinShade: '#9dbdcc', cloth: '#b9d4e0', clothShade: '#7d9faf', hair: '#c6e2ec', horns: 'small', weapon: 'none', scale: 1.1 },
  wraith: { head: 'wraith', body: 'wraith', skin: '#a9d8e8', skinShade: '#5f9aad', cloth: '#7fb4c9', clothShade: '#4a7f95', eye: '#8ef2ff', weapon: 'orb', glow: true },
  treant: { head: 'horned', body: 'brute', skin: '#8a6d45', skinShade: '#58452b', hair: '#4b5c34', cloth: '#6b5636', clothShade: '#40311e', horns: 'antlers', weapon: 'club', scale: 1.15 },
  demon: { head: 'horned', skin: '#a83a4e', skinShade: '#6e2030', cloth: '#4a1f2b', clothShade: '#2c1119', horns: 'large', weapon: 'axe', eye: '#ffb347', glow: true },
  dragon: { head: 'dragon', body: 'dragon', skin: '#c85a35', skinShade: '#8a3620', cloth: '#b8482e', clothShade: '#7a2b1b', eye: '#ffe066', wings: true, weapon: 'flame', glow: true, scale: 1.05 },
  knight: { head: 'helm', skin: '#c9a87c', skinShade: '#8e704d', cloth: '#3b3a4d', clothShade: '#22212f', metal: '#8b8fa3', weapon: 'sword', cape: true },
  cultist: { head: 'hood', skin: '#c9a183', skinShade: '#8a6749', cloth: '#7d2d1c', clothShade: '#48180e', weapon: 'orb', eye: '#ffb347', glow: true },
};

function palette(kind: MonsterKind, art: CreatureConfig, extra?: Partial<MonsterPalette>): MonsterPalette {
  return {
    kind,
    main: art.skin,
    shade: art.skinShade,
    accent: art.cloth,
    eye: art.eye,
    ...extra,
  };
}

function e(name: string, kind: MonsterKind, attack = 1, attackSpeed = 2.5,
           extra?: Partial<CreatureConfig>, color?: Partial<MonsterPalette>): EnemyDef {
  const art = cr({ ...ART[kind], ...extra });
  return { name, art, kind, palette: palette(kind, art, color), attack, attackSpeed };
}

function boss(name: string, kind: MonsterKind, attack = 1, attackSpeed = 2.2,
              extra?: Partial<CreatureConfig>, color?: Partial<MonsterPalette>): EnemyDef {
  return e(name, kind, attack, attackSpeed,
    { crown: true, cape: true, glow: true, scale: 1.22, ...extra }, color);
}

/* ------------------------------------------------------------------ regions */

export const REGIONS: Region[] = [
  {
    name: 'Зелёный Дол', subtitle: 'Здесь начинается легенда', scenery: 'vale',
    sky: ['#3f82b8', '#a9dbe8'], orb: '#fff3c4',
    far: '#7ba98f', mid: '#4f8a63', near: '#336b48',
    ground: ['#4d8f5a', '#275238'], accent: '#83d68f',
    enemies: [
      e('Разбойник', 'bandit', 3, 2.6),
      e('Серый волк', 'wolf', 2.5, 2.0),
      e('Скелет-мечник', 'skeleton', 4, 2.8),
    ],
    boss: boss('Атаман Грязный Клык', 'bandit', 9, 2.3,
      { head: 'hood', body: 'brute', weapon: 'axe', cloth: '#7a3a30', clothShade: '#4a231e' }),
  },
  {
    name: 'Королевский тракт', subtitle: 'Пыль дорог и звон монет', scenery: 'road',
    sky: ['#b9553f', '#f6bd78'], orb: '#fff0b0',
    far: '#a97462', mid: '#8a594c', near: '#634038',
    ground: ['#9c8156', '#5d4a32'], accent: '#f2b25c',
    enemies: [
      e('Гоблин-грабитель', 'goblin', 6, 2.3),
      e('Наёмник', 'bandit', 8, 2.5, { head: 'helm', cloth: '#8c6a4a', clothShade: '#59402c', weapon: 'sword' }),
      e('Копейщик', 'knight', 9, 2.8, { head: 'human', hair: '#2c211a', cloth: '#6a7a8c', clothShade: '#414c5a', weapon: 'spear' }),
    ],
    boss: boss('Король гоблинов Гнарл', 'goblin', 20, 2.2,
      { body: 'brute', weapon: 'club', cloth: '#7d4c8c', clothShade: '#4e2d59' }),
  },
  {
    name: 'Склеп предков', subtitle: 'Мёртвые не любят гостей', scenery: 'crypt',
    sky: ['#1d2b4a', '#4b6591'], orb: '#cfe0ff',
    far: '#3b4766', mid: '#2b3550', near: '#1d263c',
    ground: ['#394256', '#1a2030'], accent: '#9db8ea',
    enemies: [
      e('Скелет', 'skeleton', 14, 2.7),
      e('Ходячий мертвец', 'wraith', 16, 2.9, { head: 'human', skin: '#8ba17f', skinShade: '#5b6f55', weapon: 'none' }),
      e('Привидение', 'wraith', 18, 2.4),
    ],
    boss: boss('Лорд Костей', 'skeleton', 38, 2.2,
      { body: 'brute', weapon: 'scythe', horns: 'small', cloth: '#4a2f57', clothShade: '#2c1b34', eye: '#c58bff' }),
  },
  {
    name: 'Огненные пустоши', subtitle: 'Пепел вместо снега', scenery: 'wastes',
    sky: ['#5c1b22', '#df7040'], orb: '#ffd08a',
    far: '#8a3f36', mid: '#5f2c2c', near: '#3d1e1e',
    ground: ['#5a332a', '#2a1815'], accent: '#ff9256',
    enemies: [
      e('Орк-громила', 'orc', 30, 2.6),
      e('Огр', 'orc', 38, 3.0, { head: 'human', skin: '#b09163', skinShade: '#78603d', weapon: 'club' }),
      e('Пепельная саламандра', 'dragon', 34, 2.2, { skin: '#e0603a', skinShade: '#9b3523', wings: false, scale: 0.95 }),
    ],
    boss: boss('Огненный Великан', 'demon', 80, 2.1,
      { body: 'brute', skin: '#c94a2c', skinShade: '#822a18', weapon: 'flame', horns: 'large' }),
  },
  {
    name: 'Ледяной перевал', subtitle: 'Дыхание замирает', scenery: 'frost',
    sky: ['#3c6b9e', '#bfe3f2'], orb: '#ffffff',
    far: '#a9c7dd', mid: '#6f96b8', near: '#4a6c90',
    ground: ['#c3dbe8', '#88abc6'], accent: '#8fd8f2',
    enemies: [
      e('Ледяной голем', 'knight', 65, 3.0, { skin: '#8fd3e8', skinShade: '#4f94b4', weapon: 'club', scale: 1.1 }),
      e('Снежный йети', 'yeti', 70, 2.7),
      e('Морозный дух', 'wraith', 60, 2.2, { skin: '#bff0ff', skinShade: '#68b6d4', eye: '#ffffff' }),
    ],
    boss: boss('Страж Перевала', 'knight', 150, 2.2,
      { body: 'brute', skin: '#a5dcf0', skinShade: '#5d9fbd', metal: '#e2f6ff', weapon: 'spear' }),
  },
  {
    name: 'Проклятый лес', subtitle: 'Деревья слушают', scenery: 'forest',
    sky: ['#2c2545', '#71648f'], orb: '#c9a0ff',
    far: '#4c4a6b', mid: '#37364f', near: '#252438',
    ground: ['#3d4a3a', '#1d2720'], accent: '#b48eea',
    enemies: [
      e('Лесной паук', 'wolf', 110, 2.1, { skin: '#584267', skinShade: '#34263f', cloth: '#584267', clothShade: '#34263f', eye: '#e47bff' }),
      e('Лесная ведьма', 'cultist', 120, 2.4, { cloth: '#4a3a63', clothShade: '#2c2240', eye: '#c58bff', weapon: 'staff' }),
      e('Древооборот', 'treant', 140, 3.0),
    ],
    boss: boss('Древний Ужас', 'treant', 300, 2.2,
      { skin: '#5d4470', skinShade: '#392a48', weapon: 'scythe', eye: '#c58bff' }),
  },
  {
    name: 'Трон Тьмы', subtitle: 'Сердце врага', scenery: 'throne',
    sky: ['#150d20', '#5a2440'], orb: '#ff5d7a',
    far: '#422243', mid: '#2d1730', near: '#1d0f22',
    ground: ['#3a2038', '#180c1a'], accent: '#e2668e',
    enemies: [
      e('Тёмный рыцарь', 'knight', 260, 2.6),
      e('Демон бездны', 'demon', 300, 2.3),
      e('Некромант', 'cultist', 280, 2.5, { cloth: '#432a5c', clothShade: '#291a39', weapon: 'staff', eye: '#b977ff' }),
    ],
    boss: boss('Тёмный Маршал', 'demon', 620, 2.0,
      { body: 'brute', head: 'helm', cloth: '#4a1c2c', clothShade: '#2a0e18', weapon: 'sword', eye: '#ff5d7a' }),
  },
  {
    name: 'Логово Дракона', subtitle: 'Последний рубеж', scenery: 'lair',
    sky: ['#2c0a10', '#b0401f'], orb: '#ffb347',
    far: '#6a211d', mid: '#481713', near: '#2c0c0c',
    ground: ['#4a2018', '#210c0a'], accent: '#ffb347',
    enemies: [
      e('Виверна', 'dragon', 520, 2.2, { skin: '#7a9b4c', skinShade: '#4b6630' }),
      e('Молодой дракон', 'dragon', 600, 2.4),
      e('Культист пламени', 'cultist', 560, 2.5, { weapon: 'orb' }),
    ],
    boss: boss('Дракон Азрагон', 'dragon', 1250, 2.0,
      { skin: '#b8322a', skinShade: '#741c18', horns: 'large', scale: 1.3 }),
  },
];

export const WAVES_PER_REGION = 25;

export function regionIndex(wave: number): number {
  return Math.floor((wave - 1) / WAVES_PER_REGION) % REGIONS.length;
}
export function regionCycle(wave: number): number {
  return Math.floor((wave - 1) / (WAVES_PER_REGION * REGIONS.length));
}
export function regionName(wave: number): string {
  const r = REGIONS[regionIndex(wave)];
  const cycle = regionCycle(wave);
  return cycle > 0 ? `${r.name} · круг ${cycle + 1}` : r.name;
}

/* -------------------------------------------------------------------- heroes */

export const HEROES: HeroDef[] = [
  { id: 'squire', name: 'Тим', title: 'Оруженосец', quote: '«Я ношу ваш щит, мой господин!»', baseCost: 25, baseDps: 2,
    art: cr({ head: 'human', hair: '#c58b3c', cloth: '#4c6fa8', clothShade: '#2f4870', weapon: 'dagger', scale: 0.9 }),
    kind: 'knight', palette: palette('knight', cr({ skin: '#e7b58c', skinShade: '#b9825e', cloth: '#4c6fa8', clothShade: '#2f4870', eye: '#ffd166' })) },
  { id: 'archer', name: 'Эльза', title: 'Лучница', quote: '«Стрела быстрее молвы.»', baseCost: 320, baseDps: 16,
    art: cr({ head: 'hood', cloth: '#3f7a58', clothShade: '#264c37', hair: '#8c4a2a', weapon: 'bow' }),
    kind: 'bandit', palette: palette('bandit', cr({ skin: '#e7b58c', skinShade: '#b9825e', cloth: '#3f7a58', clothShade: '#264c37', eye: '#ffd166' })) },
  { id: 'monk', name: 'Брат Ансельм', title: 'Боевой монах', quote: '«Вера — мой посох, кулак — мой меч.»', baseCost: 4200, baseDps: 130,
    art: cr({ head: 'human', hair: '#6b4a2c', cloth: '#a06a3c', clothShade: '#6b4426', weapon: 'staff' }),
    kind: 'bandit', palette: palette('bandit', cr({ skin: '#e7b58c', skinShade: '#b9825e', cloth: '#a06a3c', clothShade: '#6b4426', eye: '#ffd166' })) },
  { id: 'alchemist', name: 'Лиза', title: 'Алхимик', quote: '«Не отворачивайся от колбы.»', baseCost: 60000, baseDps: 1000,
    art: cr({ head: 'human', hair: '#7b3f7a', cloth: '#7a4aa3', clothShade: '#4b2b67', weapon: 'orb', eye: '#b977ff' }),
    kind: 'cultist', palette: palette('cultist', cr({ skin: '#e7b58c', skinShade: '#b9825e', cloth: '#7a4aa3', clothShade: '#4b2b67', eye: '#b977ff' })) },
  { id: 'mage', name: 'Мерлин', title: 'Придворный маг', quote: '«Звёзды шепчут мне ответ.»', baseCost: 850000, baseDps: 8000,
    art: cr({ head: 'hood', cloth: '#3a4f9c', clothShade: '#232f63', hair: '#d8d8e8', weapon: 'staff', eye: '#8ef2ff', glow: true }),
    kind: 'wraith', palette: palette('wraith', cr({ skin: '#cfe0f5', skinShade: '#88a5c9', cloth: '#3a4f9c', clothShade: '#232f63', eye: '#8ef2ff' })) },
  { id: 'templar', name: 'Сэр Годфри', title: 'Тамплиер', quote: '«Свет не отступает.»', baseCost: 1.2e7, baseDps: 65000,
    art: cr({ head: 'helm', cloth: '#b8b8bd', clothShade: '#7a7a82', metal: '#e8e8ee', weapon: 'sword', cape: true }),
    kind: 'knight', palette: palette('knight', cr({ skin: '#e7b58c', skinShade: '#b9825e', cloth: '#b8b8bd', clothShade: '#7a7a82', eye: '#ffd166' })) },
  { id: 'druid', name: 'Старейшина', title: 'Друид', quote: '«Лес помнит каждое имя.»', baseCost: 1.8e8, baseDps: 500000,
    art: cr({ head: 'human', hair: '#c9c2a0', horns: 'antlers', cloth: '#4a7f52', clothShade: '#2b5232', weapon: 'staff', eye: '#9be07a' }),
    kind: 'treant', palette: palette('treant', cr({ skin: '#d9c9a6', skinShade: '#9c8965', cloth: '#4a7f52', clothShade: '#2b5232', eye: '#9be07a' })) },
  { id: 'slayer', name: 'Ингрид', title: 'Драконоборец', quote: '«Чешуя — всего лишь доспех.»', baseCost: 3e9, baseDps: 4.5e6,
    art: cr({ head: 'helm', horns: 'small', cloth: '#8c3038', clothShade: '#551c22', metal: '#d9b25e', weapon: 'spear', cape: true, eye: '#ffb347' }),
    kind: 'demon', palette: palette('demon', cr({ skin: '#e7b58c', skinShade: '#b9825e', cloth: '#8c3038', clothShade: '#551c22', eye: '#ffb347' })) },
];

/* --------------------------------------------------------------- blacksmith */

export const FORGE: ForgeDef[] = [
  { id: 'blade', name: 'Сила клинка', desc: '+4 к урону от касания', icon: '⚔️', baseCost: 25, growth: 1.17 },
  { id: 'crit', name: 'Меткий глаз', desc: '+1,5% к шансу крита', icon: '🎯', baseCost: 150, growth: 1.3, max: 20 },
  { id: 'coin', name: 'Королевская десятина', desc: '+8% золота с врагов', icon: '🪙', baseCost: 180, growth: 1.24 },
  { id: 'warcry', name: 'Боевой клич', desc: '+6% к урону героев', icon: '📯', baseCost: 400, growth: 1.28 },
  { id: 'autotap', name: 'Авто-удар', desc: '+0,5 автоатаки в секунду', icon: '🌀', baseCost: 600, growth: 1.36, max: 12 },
  { id: 'camp', name: 'Походный лагерь', desc: '+45 мин офлайн-капы, +5% золота', icon: '⛺', baseCost: 300, growth: 1.3, max: 12 },
  { id: 'vitality', name: 'Закалка тела', desc: '+12 макс. HP героя и +0,3 регена', icon: '🛡️', baseCost: 500, growth: 1.32 },
  { id: 'banner', name: 'Знамя дружины', desc: '+10% к DPS дружины', icon: '🚩', baseCost: 900, growth: 1.35 },
];

/* --------------------------------------------------------------- equipment */

export const SLOTS: SlotDef[] = [
  { id: 'weapon', name: 'Оружие', icon: '🗡️', stat: 'damage', statName: 'урон' },
  { id: 'shield', name: 'Щит', icon: '🛡️', stat: 'armor', statName: 'броня' },
  { id: 'helm', name: 'Шлем', icon: '⛑️', stat: 'crit', statName: 'крит' },
  { id: 'armor', name: 'Доспех', icon: '🥋', stat: 'armor', statName: 'броня' },
  { id: 'boots', name: 'Сапоги', icon: '👢', stat: 'regen', statName: 'реген' },
  { id: 'amulet', name: 'Амулет', icon: '📿', stat: 'gold', statName: 'золото' },
];

export const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary'] as const;

export const RARITY_NAME: Record<string, string> = {
  common: 'Обычный', rare: 'Редкий', epic: 'Эпический', legendary: 'Легендарный',
};

export const RARITY_COLOR: Record<string, string> = {
  common: '#9aa6ba', rare: '#6db8f2', epic: '#c58bff', legendary: '#f3b64a',
};

const ITEM_NAMES: Record<EquipSlot, string[]> = {
  weapon: ['Ржавый клинок', 'Стальной меч', 'Королевский клинок', 'Клинок Зари'],
  shield: ['Деревянный щит', 'Кованый щит', 'Щит Стража', 'Щит Древних'],
  helm: ['Кожаный капюшон', 'Шлем наёмника', 'Коронный шлем', 'Венец Победы'],
  armor: ['Потёртая куртка', 'Кольчуга', 'Латный доспех', 'Доспех Дракона'],
  boots: ['Стоптанные сапоги', 'Походные сапоги', 'Сапоги Скорости', 'Сандалии Ветра'],
  amulet: ['Медный амулет', 'Талисман Удачи', 'Печать Короля', 'Сердце Феникса'],
};

export function itemName(slot: EquipSlot, rarityIndex: number): string {
  return ITEM_NAMES[slot][Math.min(rarityIndex, ITEM_NAMES[slot].length - 1)];
}

/* -------------------------------------------------------------------- glory */

export const PERKS: PerkDef[] = [
  { id: 'steel', name: 'Королевская сталь', desc: '+15% к урону от касания', icon: '🗡️' },
  { id: 'treasury', name: 'Казённый двор', desc: '+15% ко всему золоту', icon: '👑' },
  { id: 'banner', name: 'Знамя предков', desc: '+15% к урону героев', icon: '🚩' },
  { id: 'wrath', name: 'Ярость предков', desc: '+25% к силе критического удара', icon: '🔥' },
  { id: 'vitality', name: 'Живучесть рода', desc: '+20% к макс. HP героя', icon: '🛡️' },
  { id: 'fortune', name: 'Дар судьбы', desc: '+12% к шансу выпадения предметов', icon: '✨' },
];

/* ------------------------------------------------------------------- skills */

export const SKILLS: SkillDef[] = [
  { id: 'smite', name: 'Удар возмездия', desc: 'Мощный удар: ×15 урона касания', icon: '⚔️', cooldown: 25 },
  { id: 'storm', name: 'Гнев небес', desc: 'Обрушить на врага 30 сек. урона героев', icon: '🌩️', cooldown: 60 },
  { id: 'chest', name: 'Королевская казна', desc: 'Получить золото за 30 волн', icon: '💰', cooldown: 100 },
  { id: 'mend', name: 'Молитва о жизни', desc: 'Восстановить 60% здоровья героя', icon: '✨', cooldown: 45 },
];

/* ------------------------------------------------------------- achievements
 * Multi-step chains: each has 5 tiers with growing goals and rewards.
 * A tier becomes claimable as soon as the lifetime stat reaches its goal.
 * -------------------------------------------------------------------------- */

function chain(id: string, name: string, desc: string, icon: string,
               stat: keyof import('./types').GameStats,
               goals: number[], rewards: number[], tierNames: string[]): AchievementChain {
  return {
    id, name, desc, icon, stat,
    tiers: goals.map((goal, i) => ({ goal, reward: rewards[i], name: tierNames[i] })),
  };
}

export const ACHIEVEMENT_CHAINS: AchievementChain[] = [
  chain('kills', 'Кровавый путь', 'Побеждайте врагов', '🩸', 'kills',
    [10, 100, 1000, 10000, 100000], [1, 2, 4, 8, 16],
    ['Первая кровь', 'Десяток', 'Сотня', 'Легион', 'Тысячи']),
  chain('wave', 'Знамя похода', 'Продвигайтесь по волнам', '🚩', 'maxWave',
    [10, 25, 50, 100, 250], [1, 2, 4, 8, 18],
    ['Первый рубеж', 'За горизонтом', 'Ходячая легенда', 'Сотня побед', 'Бессмертный']),
  chain('boss', 'Охотник на командиров', 'Побеждайте боссов', '💀', 'bosses',
    [1, 10, 50, 200, 1000], [1, 3, 6, 12, 24],
    ['Первый трофей', 'Гроза командиров', 'Конец тирании', 'Головорез', 'Победитель']),
  chain('gold', 'Королевская казна', 'Соберите золото за всю игру', '🪙', 'goldEarned',
    [1e4, 1e7, 1e10, 1e14, 1e18], [1, 2, 5, 10, 20],
    ['Кошелёк', 'Казнохранитель', 'Богаче короля', 'Гора монет', 'Бесценный']),
  chain('taps', 'Неутомимая рука', 'Наносите удары вручную', '👊', 'taps',
    [100, 1000, 10000, 100000, 1e6], [1, 2, 4, 8, 16],
    ['Разминка', 'Твёрдая рука', 'Мастер удара', 'Железный кулак', 'Легенда кулака']),
  chain('crits', 'Точный глаз', 'Наносите критические удары', '🎯', 'crits',
    [50, 500, 5000, 50000, 500000], [1, 2, 4, 8, 16],
    ['Удача', 'Меткость', 'Острое зрение', 'Снайпер', 'Ясновидец']),
  chain('heroes', 'Полководец', 'Нанимайте и улучшайте героев', '🦸', 'heroesBought',
    [25, 100, 500, 2500, 10000], [1, 3, 6, 12, 24],
    ['Отряд', 'Рота', 'Батальон', 'Армия', 'Орда']),
  chain('forge', 'Мастер-кузнец', 'Улучшайте снаряжение в кузнице', '🔨', 'forgeBought',
    [10, 50, 200, 1000, 5000], [1, 3, 6, 12, 24],
    ['Подмастерье', 'Кузнец', 'Мастер', 'Оружейник', 'Легенда горна']),
  chain('items', 'Коллекционер', 'Соберите предметы с монстров', '📦', 'itemsFound',
    [5, 50, 500, 5000, 50000], [1, 3, 6, 12, 24],
    ['Первая находка', 'Сумка трофеев', 'Кладовая', 'Арсенал', 'Музей']),
  chain('pains', 'Живучий', 'Получайте урон и возрождайтесь', '🛡️', 'damageTaken',
    [100, 5000, 1e5, 1e7, 1e9], [1, 3, 6, 12, 24],
    ['Первый синяк', 'Закалка', 'Крепкие рёбра', 'Железная кожа', 'Несгибаемый']),
  chain('prestige', 'Наследие короны', 'Начинайте новые походы', '👑', 'prestiges',
    [1, 3, 10, 30, 100], [2, 5, 10, 20, 40],
    ['Новая глава', 'Второй шанс', 'Вечный поход', 'Колесо истории', 'Бесконечность']),
  chain('time', 'Верная служба', 'Проводите время в игре', '⏳', 'playTime',
    [300, 3600, 21600, 86400, 604800], [1, 2, 4, 8, 16],
    ['Первые минуты', 'Час службы', 'Дневной дозор', 'Сутки в седле', 'Неделя славы']),
  chain('skills', 'Заклинатель', 'Используйте умения', '✨', 'skillsUsed',
    [10, 100, 1000, 10000, 100000], [1, 2, 4, 8, 16],
    ['Первый опыт', 'Подмастерье', 'Чародей', 'Магистр', 'Архимаг']),
];

export const TOTAL_TIERS = ACHIEVEMENT_CHAINS.reduce((n, c) => n + c.tiers.length, 0);

/** Legacy flat list — kept only so old saves with `achievements` still validate. */
export const ACHIEVEMENTS: AchievementDef[] = ACHIEVEMENT_CHAINS.flatMap((c) =>
  c.tiers.map((t, i) => ({
    id: `${c.id}:${i}`, name: t.name, desc: c.desc, icon: c.icon,
    reward: t.reward, stat: c.stat, goal: () => t.goal,
  })));
