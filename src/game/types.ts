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

export interface EnemyDef {
  name: string;
  art: CreatureConfig;
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
  achievements: string[];
  stats: GameStats;
  sound: boolean;
  effects: boolean;
  cooldowns: number[];
  fury: number;
  furyTime: number;
  lastSeen: number;
  createdAt: number;
}
