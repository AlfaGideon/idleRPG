const SUFFIXES = [
  '', 'тыс.', 'млн', 'млрд', 'трлн', 'квад', 'квинт',
  'секст', 'септ', 'окт', 'нон', 'дец',
];

/** Compact human readable numbers with Russian short-scale suffixes. */
export function fmt(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return '∞';
  if (n < 0) return '−' + fmt(-n, digits);
  if (n < 1000) {
    if (n === 0) return '0';
    if (n < 10 && n % 1 !== 0) return trim(n.toFixed(digits));
    if (n < 100 && n % 1 !== 0) return trim(n.toFixed(1));
    return String(Math.floor(n));
  }
  const tier = Math.min(Math.floor(Math.log10(n) / 3), SUFFIXES.length - 1);
  const scaled = n / Math.pow(1000, tier);
  if (tier >= SUFFIXES.length - 1 && scaled >= 1000) {
    return n.toExponential(2).replace('e+', 'e');
  }
  const decimals = scaled < 10 ? digits : scaled < 100 ? 1 : 0;
  return trim(scaled.toFixed(decimals)) + ' ' + SUFFIXES[tier];
}

export function trim(s: string): string {
  return s.replace(/\.?0+$/, '');
}

export function fmtInt(n: number): string {
  return Math.floor(n).toLocaleString('ru-RU');
}

export function fmtTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  if (s < 60) return `${s} сек`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} мин ${s % 60} сек`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч ${m % 60} мин`;
  return `${Math.floor(h / 24)} д ${h % 24} ч`;
}

export function pct(n: number): string {
  return (n * 100).toFixed(n < 0.1 ? 1 : 0) + '%';
}

const HUD_SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

/** Very short numbers for the narrow HUD (gold, glory, DPS). */
export function fmtHud(n: number): string {
  if (!Number.isFinite(n)) return '∞';
  if (n < 0) return '−' + fmtHud(-n);
  if (n < 1000) {
    if (n === 0) return '0';
    if (n < 10 && n % 1 !== 0) return n.toFixed(1);
    return String(Math.floor(n));
  }
  const tier = Math.min(Math.floor(Math.log10(n) / 3), HUD_SUFFIXES.length - 1);
  const scaled = n / Math.pow(1000, tier);
  if (tier >= HUD_SUFFIXES.length - 1 && scaled >= 1000) return n.toExponential(1).replace('e+', 'e');
  return trim(scaled.toFixed(scaled < 10 ? 1 : 0)) + HUD_SUFFIXES[tier];
}
