import type {
  AchievementDef, CreatureConfig, ForgeDef, HeroDef, PerkDef, Region, SkillDef,
} from './types';

const BASE: CreatureConfig = {
  skin: '#e7b58c', skinShade: '#b9825e',
  cloth: '#5b6b8c', clothShade: '#39445e',
  metal: '#c2ccd8', eye: '#ffd166', hair: '#4a3020',
  head: 'human', body: 'humanoid', weapon: 'sword',
  horns: 'none', ears: 'none',
};

function cr(p: Partial<CreatureConfig>): CreatureConfig {
  return { ...BASE, ...p };
}

/* ------------------------------------------------------------------ regions */

export const REGIONS: Region[] = [
  {
    name: 'Зелёный Дол', subtitle: 'Здесь начинается легенда', scenery: 'vale',
    sky: ['#3f82b8', '#a9dbe8'], orb: '#fff3c4',
    far: '#7ba98f', mid: '#4f8a63', near: '#336b48',
    ground: ['#4d8f5a', '#275238'], accent: '#83d68f',
    enemies: [
      { name: 'Разбойник', art: cr({ head: 'hood', cloth: '#6b4a32', clothShade: '#422c1e', weapon: 'dagger' }) },
      { name: 'Серый волк', art: cr({ head: 'beast', body: 'beast', skin: '#8d98a3', skinShade: '#5d6874', cloth: '#8d98a3', clothShade: '#5d6874', eye: '#ffd166', weapon: 'none', scale: 0.9 }) },
      { name: 'Скелет-мечник', art: cr({ head: 'skull', skin: '#e5dfc9', skinShade: '#a9a38a', cloth: '#6d5340', clothShade: '#443425', weapon: 'sword' }) },
    ],
    boss: { name: 'Атаман Грязный Клык', art: cr({ head: 'hood', body: 'brute', cloth: '#7a3a30', clothShade: '#4a231e', weapon: 'axe', cape: true, scale: 1.16 }) },
  },
  {
    name: 'Королевский тракт', subtitle: 'Пыль дорог и звон монет', scenery: 'road',
    sky: ['#b9553f', '#f6bd78'], orb: '#fff0b0',
    far: '#a97462', mid: '#8a594c', near: '#634038',
    ground: ['#9c8156', '#5d4a32'], accent: '#f2b25c',
    enemies: [
      { name: 'Гоблин-грабитель', art: cr({ head: 'goblin', skin: '#93b45c', skinShade: '#63813a', ears: 'pointy', cloth: '#8a6a3c', clothShade: '#5a4426', weapon: 'dagger', scale: 0.88 }) },
      { name: 'Наёмник', art: cr({ head: 'helm', cloth: '#8c6a4a', clothShade: '#59402c', weapon: 'sword' }) },
      { name: 'Копейщик', art: cr({ head: 'human', hair: '#2c211a', cloth: '#6a7a8c', clothShade: '#414c5a', weapon: 'spear' }) },
    ],
    boss: { name: 'Король гоблинов Гнарл', art: cr({ head: 'goblin', body: 'brute', skin: '#9fc45f', skinShade: '#688a3b', ears: 'pointy', cloth: '#7d4c8c', clothShade: '#4e2d59', weapon: 'club', crown: true, cape: true, scale: 1.15 }) },
  },
  {
    name: 'Склеп предков', subtitle: 'Мёртвые не любят гостей', scenery: 'crypt',
    sky: ['#1d2b4a', '#4b6591'], orb: '#cfe0ff',
    far: '#3b4766', mid: '#2b3550', near: '#1d263c',
    ground: ['#394256', '#1a2030'], accent: '#9db8ea',
    enemies: [
      { name: 'Скелет', art: cr({ head: 'skull', skin: '#e5dfc9', skinShade: '#a9a38a', cloth: '#595c6b', clothShade: '#383a46', weapon: 'sword' }) },
      { name: 'Ходячий мертвец', art: cr({ head: 'human', skin: '#8ba17f', skinShade: '#5b6f55', hair: '#3a3f33', cloth: '#6a5a4a', clothShade: '#41372d', weapon: 'none' }) },
      { name: 'Привидение', art: cr({ head: 'wraith', body: 'wraith', skin: '#a9d8e8', skinShade: '#5f9aad', cloth: '#7fb4c9', clothShade: '#4a7f95', eye: '#8ef2ff', weapon: 'orb', glow: true }) },
    ],
    boss: { name: 'Лорд Костей', art: cr({ head: 'skull', body: 'brute', skin: '#e8e1c8', skinShade: '#a9a184', cloth: '#4a2f57', clothShade: '#2c1b34', weapon: 'scythe', horns: 'small', crown: true, cape: true, eye: '#c58bff', glow: true, scale: 1.16 }) },
  },
  {
    name: 'Огненные пустоши', subtitle: 'Пепел вместо снега', scenery: 'wastes',
    sky: ['#5c1b22', '#df7040'], orb: '#ffd08a',
    far: '#8a3f36', mid: '#5f2c2c', near: '#3d1e1e',
    ground: ['#5a332a', '#2a1815'], accent: '#ff9256',
    enemies: [
      { name: 'Орк-громила', art: cr({ head: 'goblin', body: 'brute', skin: '#a25c48', skinShade: '#6d3a2c', ears: 'pointy', cloth: '#6b4a32', clothShade: '#3f2b1c', weapon: 'axe', scale: 1.05 }) },
      { name: 'Огр', art: cr({ head: 'human', body: 'brute', skin: '#b09163', skinShade: '#78603d', cloth: '#7a4a3a', clothShade: '#4c2d22', weapon: 'club', scale: 1.12 }) },
      { name: 'Пепельная саламандра', art: cr({ head: 'beast', body: 'beast', skin: '#e0603a', skinShade: '#9b3523', cloth: '#e0603a', clothShade: '#9b3523', eye: '#ffe066', weapon: 'flame', scale: 0.95 }) },
    ],
    boss: { name: 'Огненный Великан', art: cr({ head: 'horned', body: 'brute', skin: '#c94a2c', skinShade: '#822a18', cloth: '#5d2418', clothShade: '#38140d', horns: 'large', weapon: 'flame', eye: '#ffe066', glow: true, scale: 1.28 }) },
  },
  {
    name: 'Ледяной перевал', subtitle: 'Дыхание замирает', scenery: 'frost',
    sky: ['#3c6b9e', '#bfe3f2'], orb: '#ffffff',
    far: '#a9c7dd', mid: '#6f96b8', near: '#4a6c90',
    ground: ['#c3dbe8', '#88abc6'], accent: '#8fd8f2',
    enemies: [
      { name: 'Ледяной голем', art: cr({ head: 'helm', body: 'brute', skin: '#8fd3e8', skinShade: '#4f94b4', cloth: '#6e9fbd', clothShade: '#426a86', metal: '#cfefff', weapon: 'club', scale: 1.1 }) },
      { name: 'Снежный йети', art: cr({ head: 'beast', body: 'brute', skin: '#e2f1f6', skinShade: '#9dbdcc', cloth: '#e2f1f6', clothShade: '#9dbdcc', hair: '#c6e2ec', horns: 'small', weapon: 'none', scale: 1.1 }) },
      { name: 'Морозный дух', art: cr({ head: 'wraith', body: 'wraith', skin: '#bff0ff', skinShade: '#68b6d4', cloth: '#8dd8f2', clothShade: '#4e93b2', eye: '#ffffff', weapon: 'orb', glow: true }) },
    ],
    boss: { name: 'Страж Перевала', art: cr({ head: 'helm', body: 'brute', skin: '#a5dcf0', skinShade: '#5d9fbd', cloth: '#3d6382', clothShade: '#263f56', metal: '#e2f6ff', horns: 'small', weapon: 'spear', crown: true, cape: true, scale: 1.24 }) },
  },
  {
    name: 'Проклятый лес', subtitle: 'Деревья слушают', scenery: 'forest',
    sky: ['#2c2545', '#71648f'], orb: '#c9a0ff',
    far: '#4c4a6b', mid: '#37364f', near: '#252438',
    ground: ['#3d4a3a', '#1d2720'], accent: '#b48eea',
    enemies: [
      { name: 'Лесной паук', art: cr({ head: 'beast', body: 'beast', skin: '#584267', skinShade: '#34263f', cloth: '#584267', clothShade: '#34263f', eye: '#e47bff', weapon: 'none', scale: 0.95 }) },
      { name: 'Лесная ведьма', art: cr({ head: 'hood', skin: '#b9a1c9', skinShade: '#7b6690', cloth: '#4a3a63', clothShade: '#2c2240', weapon: 'staff', eye: '#c58bff', glow: true }) },
      { name: 'Древооборот', art: cr({ head: 'horned', body: 'brute', skin: '#8a6d45', skinShade: '#58452b', hair: '#4b5c34', cloth: '#6b5636', clothShade: '#40311e', horns: 'antlers', weapon: 'club', scale: 1.15 }) },
    ],
    boss: { name: 'Древний Ужас', art: cr({ head: 'horned', body: 'brute', skin: '#5d4470', skinShade: '#392a48', cloth: '#3a2b4a', clothShade: '#22192c', horns: 'antlers', weapon: 'scythe', eye: '#c58bff', glow: true, cape: true, scale: 1.3 }) },
  },
  {
    name: 'Трон Тьмы', subtitle: 'Сердце врага', scenery: 'throne',
    sky: ['#150d20', '#5a2440'], orb: '#ff5d7a',
    far: '#422243', mid: '#2d1730', near: '#1d0f22',
    ground: ['#3a2038', '#180c1a'], accent: '#e2668e',
    enemies: [
      { name: 'Тёмный рыцарь', art: cr({ head: 'helm', cloth: '#3b3a4d', clothShade: '#22212f', metal: '#8b8fa3', weapon: 'sword', cape: true }) },
      { name: 'Демон бездны', art: cr({ head: 'horned', skin: '#a83a4e', skinShade: '#6e2030', cloth: '#4a1f2b', clothShade: '#2c1119', horns: 'large', weapon: 'axe', eye: '#ffb347', glow: true }) },
      { name: 'Некромант', art: cr({ head: 'hood', cloth: '#432a5c', clothShade: '#291a39', weapon: 'staff', eye: '#b977ff', glow: true }) },
    ],
    boss: { name: 'Тёмный Маршал', art: cr({ head: 'helm', body: 'brute', cloth: '#4a1c2c', clothShade: '#2a0e18', metal: '#9a7b8c', horns: 'large', weapon: 'sword', crown: true, cape: true, eye: '#ff5d7a', glow: true, scale: 1.28 }) },
  },
  {
    name: 'Логово Дракона', subtitle: 'Последний рубеж', scenery: 'lair',
    sky: ['#2c0a10', '#b0401f'], orb: '#ffb347',
    far: '#6a211d', mid: '#481713', near: '#2c0c0c',
    ground: ['#4a2018', '#210c0a'], accent: '#ffb347',
    enemies: [
      { name: 'Виверна', art: cr({ head: 'dragon', body: 'dragon', skin: '#7a9b4c', skinShade: '#4b6630', cloth: '#7a9b4c', clothShade: '#4b6630', eye: '#ffe066', wings: true, weapon: 'none', scale: 1.05 }) },
      { name: 'Молодой дракон', art: cr({ head: 'dragon', body: 'dragon', skin: '#c85a35', skinShade: '#8a3620', cloth: '#c85a35', clothShade: '#8a3620', eye: '#ffe066', wings: true, weapon: 'flame', glow: true, scale: 1.05 }) },
      { name: 'Культист пламени', art: cr({ head: 'hood', cloth: '#7d2d1c', clothShade: '#48180e', weapon: 'orb', eye: '#ffb347', glow: true }) },
    ],
    boss: { name: 'Дракон Азрагон', art: cr({ head: 'dragon', body: 'dragon', skin: '#b8322a', skinShade: '#741c18', cloth: '#b8322a', clothShade: '#741c18', eye: '#ffe066', horns: 'large', wings: true, weapon: 'flame', glow: true, scale: 1.35 }) },
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
    art: cr({ head: 'human', hair: '#c58b3c', cloth: '#4c6fa8', clothShade: '#2f4870', weapon: 'dagger', scale: 0.9 }) },
  { id: 'archer', name: 'Эльза', title: 'Лучница', quote: '«Стрела быстрее молвы.»', baseCost: 320, baseDps: 16,
    art: cr({ head: 'hood', cloth: '#3f7a58', clothShade: '#264c37', hair: '#8c4a2a', weapon: 'bow' }) },
  { id: 'monk', name: 'Брат Ансельм', title: 'Боевой монах', quote: '«Вера — мой посох, кулак — мой меч.»', baseCost: 4200, baseDps: 130,
    art: cr({ head: 'human', hair: '#6b4a2c', cloth: '#a06a3c', clothShade: '#6b4426', weapon: 'staff' }) },
  { id: 'alchemist', name: 'Лиза', title: 'Алхимик', quote: '«Не отворачивайся от колбы.»', baseCost: 60000, baseDps: 1000,
    art: cr({ head: 'human', hair: '#7b3f7a', cloth: '#7a4aa3', clothShade: '#4b2b67', weapon: 'orb', eye: '#b977ff' }) },
  { id: 'mage', name: 'Мерлин', title: 'Придворный маг', quote: '«Звёзды шепчут мне ответ.»', baseCost: 850000, baseDps: 8000,
    art: cr({ head: 'hood', cloth: '#3a4f9c', clothShade: '#232f63', hair: '#d8d8e8', weapon: 'staff', eye: '#8ef2ff', glow: true }) },
  { id: 'templar', name: 'Сэр Годфри', title: 'Тамплиер', quote: '«Свет не отступает.»', baseCost: 1.2e7, baseDps: 65000,
    art: cr({ head: 'helm', cloth: '#b8b8bd', clothShade: '#7a7a82', metal: '#e8e8ee', weapon: 'sword', cape: true }) },
  { id: 'druid', name: 'Старейшина', title: 'Друид', quote: '«Лес помнит каждое имя.»', baseCost: 1.8e8, baseDps: 500000,
    art: cr({ head: 'human', hair: '#c9c2a0', horns: 'antlers', cloth: '#4a7f52', clothShade: '#2b5232', weapon: 'staff', eye: '#9be07a' }) },
  { id: 'slayer', name: 'Ингрид', title: 'Драконоборец', quote: '«Чешуя — всего лишь доспех.»', baseCost: 3e9, baseDps: 4.5e6,
    art: cr({ head: 'helm', horns: 'small', cloth: '#8c3038', clothShade: '#551c22', metal: '#d9b25e', weapon: 'spear', cape: true, eye: '#ffb347' }) },
];

/* --------------------------------------------------------------- blacksmith */

export const FORGE: ForgeDef[] = [
  { id: 'blade', name: 'Сила клинка', desc: '+4 к урону от касания', icon: '⚔️', baseCost: 25, growth: 1.17 },
  { id: 'crit', name: 'Меткий глаз', desc: '+1,5% к шансу крита', icon: '🎯', baseCost: 150, growth: 1.3, max: 20 },
  { id: 'coin', name: 'Королевская десятина', desc: '+8% золота с врагов', icon: '🪙', baseCost: 180, growth: 1.24 },
  { id: 'warcry', name: 'Боевой клич', desc: '+6% к урону героев', icon: '📯', baseCost: 400, growth: 1.28 },
  { id: 'autotap', name: 'Авто-удар', desc: '+0,5 автоатаки в секунду', icon: '🌀', baseCost: 600, growth: 1.36, max: 12 },
  { id: 'camp', name: 'Походный лагерь', desc: '+45 мин офлайн-капы, +5% золота', icon: '⛺', baseCost: 300, growth: 1.3, max: 12 },
];

/* -------------------------------------------------------------------- glory */

export const PERKS: PerkDef[] = [
  { id: 'steel', name: 'Королевская сталь', desc: '+15% к урону от касания', icon: '🗡️' },
  { id: 'treasury', name: 'Казённый двор', desc: '+15% ко всему золоту', icon: '👑' },
  { id: 'banner', name: 'Знамя предков', desc: '+15% к урону героев', icon: '🚩' },
  { id: 'wrath', name: 'Ярость предков', desc: '+25% к силе критического удара', icon: '🔥' },
];

/* ------------------------------------------------------------------- skills */

export const SKILLS: SkillDef[] = [
  { id: 'smite', name: 'Удар возмездия', desc: 'Мощный удар: ×15 урона касания', icon: '⚔️', cooldown: 25 },
  { id: 'storm', name: 'Гнев небес', desc: 'Обрушить на врага 30 сек. урона героев', icon: '🌩️', cooldown: 60 },
  { id: 'chest', name: 'Королевская казна', desc: 'Получить золото за 30 волн', icon: '💰', cooldown: 100 },
];

/* ------------------------------------------------------------- achievements */

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'kills1', name: 'Первая кровь', desc: 'Победить первого врага', icon: '🩸', reward: 1, stat: 'kills', goal: () => 1 },
  { id: 'kills100', name: 'Меч королевства', desc: 'Победить 100 врагов', icon: '⚔️', reward: 2, stat: 'kills', goal: () => 100 },
  { id: 'kills1000', name: 'Целый легион', desc: 'Победить 1000 врагов', icon: '🛡️', reward: 5, stat: 'kills', goal: () => 1000 },
  { id: 'wave25', name: 'За горизонтом', desc: 'Достичь 25-й волны', icon: '🚩', reward: 2, stat: 'maxWave', goal: () => 25 },
  { id: 'wave50', name: 'Ходячая легенда', desc: 'Достичь 50-й волны', icon: '🏰', reward: 3, stat: 'maxWave', goal: () => 50 },
  { id: 'wave100', name: 'Сотня побед', desc: 'Достичь 100-й волны', icon: '🌟', reward: 8, stat: 'maxWave', goal: () => 100 },
  { id: 'wave200', name: 'Бессмертный', desc: 'Достичь 200-й волны', icon: '💫', reward: 15, stat: 'maxWave', goal: () => 200 },
  { id: 'boss1', name: 'Охотник на боссов', desc: 'Победить первого босса', icon: '💀', reward: 1, stat: 'bosses', goal: () => 1 },
  { id: 'boss10', name: 'Гроза командиров', desc: 'Победить 10 боссов', icon: '☠️', reward: 4, stat: 'bosses', goal: () => 10 },
  { id: 'boss50', name: 'Конец тирании', desc: 'Победить 50 боссов', icon: '🦴', reward: 10, stat: 'bosses', goal: () => 50 },
  { id: 'gold10k', name: 'Кошелёк дворянина', desc: 'Собрать 10 тыс. золота', icon: '🪙', reward: 2, stat: 'goldEarned', goal: () => 1e4 },
  { id: 'gold10m', name: 'Казнохранитель', desc: 'Собрать 10 млн золота', icon: '💰', reward: 5, stat: 'goldEarned', goal: () => 1e7 },
  { id: 'gold10b', name: 'Богаче короля', desc: 'Собрать 10 млрд золота', icon: '🏆', reward: 10, stat: 'goldEarned', goal: () => 1e10 },
  { id: 'taps500', name: 'Неутомимая рука', desc: 'Нанести 500 ударов вручную', icon: '👊', reward: 1, stat: 'taps', goal: () => 500 },
  { id: 'crits250', name: 'Точный глаз', desc: 'Нанести 250 критических ударов', icon: '🎯', reward: 3, stat: 'crits', goal: () => 250 },
  { id: 'heroes50', name: 'Полк героев', desc: 'Купить 50 уровней героев', icon: '🦸', reward: 3, stat: 'heroesBought', goal: () => 50 },
  { id: 'forge25', name: 'Мастер-кузнец', desc: 'Купить 25 улучшений в кузнице', icon: '🔨', reward: 3, stat: 'forgeBought', goal: () => 25 },
  { id: 'prestige1', name: 'Новая глава', desc: 'Начать новый поход', icon: '👑', reward: 3, stat: 'prestiges', goal: () => 1 },
  { id: 'time1h', name: 'Верная служба', desc: 'Провести в игре 1 час', icon: '⏳', reward: 3, stat: 'playTime', goal: () => 3600 },
];
