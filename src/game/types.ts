/* Creature config is kept for the procedural SVG fallback (used in generated
 * preview art). The live battle renderer uses `MonsterKind` instead. */
export type HeadKind =
  | 'human' | 'hood' | 'skull' | 'goblin' | 'beast'
  | 'dragon' | 'horned' | 'helm' | 'wraith';

export type BodyKind = 'humanoid' | 'brute' | 'beast' | 'dragon' | 'wraith';

export type WeaponKind =
  | 'dagger' | 'sword' | 'axe' | 'club' | 'staff'
  | 'bow' | 'spear' | 'orb' | 'scythe' | 'flame' | 'none';

export type HornKind = 'none' | 'small' | 'large' | 'antlers';

export interface CreatureConfig {
  skin: string;
  skinShade: string;
  cloth: string;
  clothShade: string;
  metal: string;
  eye: string;
  hair: string;
  head: HeadKind;
  body: BodyKind;
  weapon: WeaponKind;
  horns?: HornKind;
  ears?: 'pointy' | 'round' | 'none';
  wings?: boolean;
  cape?: boolean;
  crown?: boolean;
  glow?: boolean;
  scale?: number;
}

/** Kinds understood by the animated Canvas renderer. */
export type MonsterKind =
  | 'wolf' | 'bandit' | 'goblin' | 'skeleton' | 'orc'
  | 'yeti' | 'wraith' | 'treant' | 'demon' | 'dragon' | 'knight' | 'cultist';

export interface MonsterPalette {
  main: string;
  shade: string;
  accent: string;
  eye: string;
  kind: MonsterKind;
}

export interface EnemyDef {
  name: string;
  art: CreatureConfig;
  kind: MonsterKind;
  palette: MonsterPalette;
  attack: number;
  attackSpeed: number;
}

export interface Region {
  name: string;
  subtitle: string;
  scenery: 'vale' | 'road' | 'crypt' | 'wastes' | 'frost' | 'forest' | 'throne' | 'lair';
  sky: [string, string];
  orb: string;
  far: string;
  mid: string;
  near: string;
  ground: [string, string];
  accent: string;
  enemies: EnemyDef[];
  boss: EnemyDef;
}

export interface HeroDef {
  id: string;
  name: string;
  title: string;
  quote: string;
  baseCost: number;
  baseDps: number;
  art: CreatureConfig;
  kind: MonsterKind;
  palette: MonsterPalette;
}

export interface ForgeDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  baseCost: number;
  growth: number;
  max?: number;
}

export interface PerkDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
}

export interface SkillDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  cooldown: number;
}

/* --------------------------------------------------------------- equipment */

export type EquipSlot = 'weapon' | 'shield' | 'helm' | 'armor' | 'boots' | 'amulet';
export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface ItemStats {
  damage: number;   // flat tap / hero strike damage
  armor: number;    // reduces incoming enemy damage
  dps: number;      // multiplies companion damage
  gold: number;     // multiplies gold
  regen: number;    // hp per second
  crit: number;     // crit chance (0..1)
}

export interface EquipmentItem {
  id: string;
  slot: EquipSlot;
  name: string;
  rarity: ItemRarity;
  power: number;
  level: number;    // item level (wave it dropped on)
  stats: ItemStats;
}

export interface SlotDef {
  id: EquipSlot;
  name: string;
  icon: string;
  stat: keyof ItemStats;
  statName: string;
}

/* ----------------------------------------------------------- achievements */

export interface AchievementTier {
  goal: number;
  reward: number;
  name: string;
}

export interface AchievementChain {
  id: string;
  name: string;
  desc: string;
  icon: string;
  stat: keyof GameStats;
  tiers: AchievementTier[];
}

/** Legacy single achievements kept only for migrating old saves. */
export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  reward: number;
  stat: keyof GameStats;
  goal: (level: number) => number;
}

export interface GameStats {
  kills: number;
  bosses: number;
  taps: number;
  crits: number;
  goldEarned: number;
  maxWave: number;
  heroesBought: number;
  forgeBought: number;
  prestiges: number;
  playTime: number;
  itemsFound: number;
  damageTaken: number;
  deaths: number;
  skillsUsed: number;
}

export interface PlayerHero {
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  xpNext: number;
}

export interface GameState {
  version: number;
  gold: number;
  glory: number;
  gloryEarned: number;
  wave: number;
  enemyHp: number;
  enemyMaxHp: number;
  bossTimer: number;
  heroes: number[];
  forge: number[];
  perks: number[];
  achievements: string[];      // legacy, kept for migration
  claimedTiers: string[];      // "chainId:tierIndex"
  stats: GameStats;
  sound: boolean;
  effects: boolean;
  cooldowns: number[];
  fury: number;
  furyTime: number;
  lastSeen: number;
  createdAt: number;
  /* --- v2 additions --- */
  player: PlayerHero;
  equipment: (EquipmentItem | null)[];
  inventory: EquipmentItem[];
  autoSkills: boolean;
  autoEquip: boolean;
  enemyAttackTimer: number;
  respawnTimer: number;
  seenVersion: string;
  lootLog: string[];
}
