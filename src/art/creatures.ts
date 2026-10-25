import type { CreatureConfig, HeadKind, WeaponKind } from '../game/types';
import { rgba, shade } from './colors';

let serial = 0;
const OUT = '#10131c';
const OUT_W = 3.2;

interface Palette {
  id: string;
  c: CreatureConfig;
  skin: string;
  cloth: string;
  metal: string;
}

function defs(p: Palette): string {
  const { id, c } = p;
  return `<defs>
    <linearGradient id="${id}-s" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${shade(c.skin, .18)}"/>
      <stop offset="60%" stop-color="${c.skin}"/>
      <stop offset="100%" stop-color="${c.skinShade}"/>
    </linearGradient>
    <linearGradient id="${id}-c" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${shade(c.cloth, .16)}"/>
      <stop offset="65%" stop-color="${c.cloth}"/>
      <stop offset="100%" stop-color="${c.clothShade}"/>
    </linearGradient>
    <linearGradient id="${id}-m" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${shade(c.metal, .3)}"/>
      <stop offset="50%" stop-color="${c.metal}"/>
      <stop offset="100%" stop-color="${shade(c.metal, -.35)}"/>
    </linearGradient>
    <radialGradient id="${id}-g">
      <stop offset="0%" stop-color="${shade(c.eye, .5)}" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="${c.eye}" stop-opacity="0"/>
    </radialGradient>
  </defs>`;
}

const stroke = `stroke="${OUT}" stroke-width="${OUT_W}" stroke-linejoin="round" stroke-linecap="round"`;

/* ------------------------------------------------------------------ weapons */

function weapon(p: Palette, kind: WeaponKind): string {
  const { id, c } = p;
  const gold = '#e9c46a';
  const wood = '#79502e';
  const eyeGlow = c.glow ? `<circle cx="0" cy="-74" r="30" fill="url(#${id}-g)"/>` : '';
  switch (kind) {
    case 'sword':
      return `<path d="M0 -104 L9 -88 L9 -10 L-9 -10 L-9 -88 Z" fill="url(#${id}-m)" ${stroke}/>
        <path d="M-2 -88 L-2 -12 L-8 -12 L-8 -86 Z" fill="#ffffff" opacity=".45"/>
        <rect x="-24" y="-12" width="48" height="10" rx="4" fill="${gold}" ${stroke}/>
        <rect x="-6" y="-2" width="12" height="26" rx="3" fill="${wood}" ${stroke}/>
        <circle cx="0" cy="28" r="8" fill="${gold}" ${stroke}/>`;
    case 'dagger':
      return `<path d="M0 -70 L7 -58 L7 -8 L-7 -8 L-7 -58 Z" fill="url(#${id}-m)" ${stroke}/>
        <rect x="-15" y="-10" width="30" height="8" rx="3" fill="${gold}" ${stroke}/>
        <rect x="-5" y="-2" width="10" height="19" rx="3" fill="${wood}" ${stroke}/>
        <circle cx="0" cy="20" r="6" fill="${gold}" ${stroke}/>`;
    case 'axe':
      return `<rect x="-5" y="-92" width="10" height="116" rx="4" fill="${wood}" ${stroke}/>
        <path d="M2 -96 Q42 -92 44 -64 Q42 -40 2 -44 Z" fill="url(#${id}-m)" ${stroke}/>
        <path d="M-2 -96 Q-30 -92 -32 -70 Q-30 -52 -2 -50 Z" fill="${shade(c.metal, -.15)}" ${stroke}/>
        <path d="M6 -90 Q30 -86 32 -68" fill="none" stroke="#fff" stroke-width="2" opacity=".45"/>`;
    case 'club':
      return `<rect x="-6" y="-64" width="12" height="86" rx="5" fill="${wood}" ${stroke}/>
        <path d="M-22 -96 Q-4 -112 18 -98 Q34 -78 18 -46 Q0 -34 -20 -48 Q-34 -72 -22 -96 Z" fill="url(#${id}-m)" ${stroke}/>
        <circle cx="-6" cy="-86" r="4" fill="${shade(c.metal, -.3)}"/>
        <circle cx="10" cy="-70" r="5" fill="${shade(c.metal, -.3)}"/>
        <circle cx="-8" cy="-58" r="3.5" fill="${shade(c.metal, -.3)}"/>`;
    case 'staff':
      return `<rect x="-5" y="-96" width="10" height="120" rx="5" fill="${wood}" ${stroke}/>
        <rect x="-7" y="-60" width="14" height="7" rx="3" fill="${gold}"/>
        ${eyeGlow}
        <circle cx="0" cy="-99" r="13" fill="${c.glow ? c.eye : '#7ec8e3'}" ${stroke}/>
        <circle cx="-4" cy="-104" r="4" fill="#fff" opacity=".7"/>
        <path d="M0 -116 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z" fill="${gold}"/>`;
    case 'bow':
      return `<path d="M-6 -90 Q34 -48 -6 -6" fill="none" stroke="${wood}" stroke-width="9" stroke-linecap="round"/>
        <path d="M-6 -90 Q34 -48 -6 -6" fill="none" stroke="${OUT}" stroke-width="2" opacity=".6"/>
        <path d="M-6 -90 L-6 -6" fill="none" stroke="#e8dcc0" stroke-width="2"/>
        <path d="M-6 -48 L26 -48 L20 -53 M26 -48 L20 -43" fill="none" stroke="${c.metal}" stroke-width="3" stroke-linecap="round"/>`;
    case 'spear':
      return `<rect x="-4.5" y="-98" width="9" height="126" rx="4" fill="${wood}" ${stroke}/>
        <path d="M0 -128 L11 -102 L0 -94 L-11 -102 Z" fill="url(#${id}-m)" ${stroke}/>
        <path d="M-9 -94 L9 -94" stroke="${gold}" stroke-width="5"/>`;
    case 'scythe':
      return `<rect x="-5" y="-100" width="10" height="128" rx="4" fill="#4a3b2c" ${stroke}/>
        <path d="M2 -100 Q58 -112 74 -66 Q52 -94 2 -84 Z" fill="url(#${id}-m)" ${stroke}/>
        <path d="M14 -98 Q52 -100 68 -72" fill="none" stroke="#fff" stroke-width="2" opacity=".4"/>`;
    case 'orb':
      return `<circle cx="0" cy="-46" r="40" fill="url(#${id}-g)"/>
        <circle cx="0" cy="-46" r="19" fill="${c.glow ? c.eye : '#9ad8ef'}" ${stroke}/>
        <circle cx="-6" cy="-52" r="6" fill="#fff" opacity=".65"/>
        <path d="M0 -74 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z" fill="#fff" opacity=".9"/>
        <path d="M-34 -46 a34 12 0 0 0 68 0 a34 12 0 0 0 -68 0" fill="none" stroke="${gold}" stroke-width="2.5" opacity=".8" transform="rotate(-24 0 -46)"/>`;
    case 'flame':
      return `<circle cx="0" cy="-46" r="42" fill="url(#${id}-g)"/>
        <path d="M0 -100 Q18 -78 12 -64 Q26 -74 20 -54 Q30 -34 12 -20 Q0 -10 -12 -20 Q-30 -36 -12 -56 Q-10 -70 -4 -78 Q-6 -62 0 -58 Q10 -76 0 -100 Z" fill="#ffb347" ${stroke}/>
        <path d="M0 -76 Q10 -58 6 -46 Q12 -34 0 -26 Q-12 -34 -6 -46 Q-8 -58 0 -76 Z" fill="#fff2a8"/>`;
    case 'none':
    default:
      return '';
  }
}

/* -------------------------------------------------------------------- heads */

function eyes(p: Palette, x1: number, x2: number, y: number, glow = false): string {
  const { c, id } = p;
  if (glow || c.glow) {
    return `<ellipse cx="${x1}" cy="${y}" rx="10" ry="8" fill="url(#${id}-g)"/>
      <ellipse cx="${x2}" cy="${y}" rx="10" ry="8" fill="url(#${id}-g)"/>
      <ellipse cx="${x1}" cy="${y}" rx="5" ry="6" fill="${c.eye}"/>
      <ellipse cx="${x2}" cy="${y}" rx="5" ry="6" fill="${c.eye}"/>
      <circle cx="${x1 - 1}" cy="${y - 2}" r="1.8" fill="#fff"/>
      <circle cx="${x2 - 1}" cy="${y - 2}" r="1.8" fill="#fff"/>`;
  }
  return `<ellipse cx="${x1}" cy="${y}" rx="4.6" ry="5.6" fill="#161821"/>
    <ellipse cx="${x2}" cy="${y}" rx="4.6" ry="5.6" fill="#161821"/>
    <circle cx="${x1 - 1.4}" cy="${y - 1.8}" r="1.7" fill="#fff"/>
    <circle cx="${x2 - 1.4}" cy="${y - 1.8}" r="1.7" fill="#fff"/>`;
}

function horns(p: Palette, kind: CreatureConfig['horns']): string {
  if (!kind || kind === 'none') return '';
  const { c } = p;
  const bone = shade(c.skin, .45);
  const dark = shade(c.skin, -.2);
  if (kind === 'antlers') {
    return `<g fill="none" stroke="${bone}" stroke-width="8" stroke-linecap="round" ${stroke}>
      <path d="M94 60 Q76 42 66 48 M78 50 L68 32 M78 50 L58 44"/>
      <path d="M146 60 Q164 42 174 48 M162 50 L172 32 M162 50 L182 44"/>
    </g>`;
  }
  if (kind === 'small') {
    return `<path d="M92 64 Q78 50 74 34 Q90 42 100 58 Z" fill="${bone}" ${stroke}/>
      <path d="M148 64 Q162 50 166 34 Q150 42 140 58 Z" fill="${bone}" ${stroke}/>`;
  }
  return `<path d="M94 62 Q72 54 62 22 Q84 32 102 54 Z" fill="${bone}" ${stroke}/>
    <path d="M146 62 Q168 54 178 22 Q156 32 138 54 Z" fill="${bone}" ${stroke}/>
    <path d="M94 60 Q80 48 74 30" fill="none" stroke="${dark}" stroke-width="3" opacity=".5"/>
    <path d="M146 60 Q160 48 166 30" fill="none" stroke="${dark}" stroke-width="3" opacity=".5"/>`;
}

function ears(p: Palette, kind: CreatureConfig['ears']): string {
  if (kind === 'pointy') {
    return `<path d="M90 78 L58 60 L84 100 Z" fill="url(#${p.id}-s)" ${stroke}/>
      <path d="M150 78 L182 60 L156 100 Z" fill="url(#${p.id}-s)" ${stroke}/>`;
  }
  if (kind === 'round') {
    return `<circle cx="86" cy="76" r="13" fill="url(#${p.id}-s)" ${stroke}/>
      <circle cx="154" cy="76" r="13" fill="url(#${p.id}-s)" ${stroke}/>`;
  }
  return '';
}

function crown(): string {
  return `<path d="M92 50 L90 26 L106 40 L120 18 L134 40 L150 26 L148 50 Z" fill="#e9c46a" ${stroke}/>
    <rect x="91" y="48" width="58" height="10" rx="3" fill="#ffe9a8" ${stroke}/>
    <circle cx="120" cy="22" r="5" fill="#e0555f"/>
    <circle cx="106" cy="42" r="3.5" fill="#5bc0eb"/>
    <circle cx="134" cy="42" r="3.5" fill="#5bc0eb"/>`;
}

function head(p: Palette, kind: HeadKind): string {
  const { id, c } = p;
  const s = `url(#${id}-s)`;
  const cl = `url(#${id}-c)`;
  const m = `url(#${id}-m)`;
  let art = '';
  switch (kind) {
    case 'human':
      art = `<path d="M88 80 Q86 46 120 44 Q154 46 152 80 L152 98 Q152 122 120 128 Q88 122 88 98 Z" fill="${s}" ${stroke}/>
        <path d="M88 80 Q82 44 120 42 Q158 44 152 80 Q142 62 126 60 Q106 60 94 74 Z" fill="${c.hair}" ${stroke}/>
        <path d="M88 82 Q82 68 90 62 Q88 80 96 86 Z" fill="${c.hair}"/>
        ${eyes(p, 107, 133, 95)}
        <path d="M113 112 Q120 117 127 112" fill="none" stroke="${shade(c.skin, -.45)}" stroke-width="2.6" stroke-linecap="round"/>
        <ellipse cx="97" cy="105" rx="5" ry="3.5" fill="${shade(c.skin, -.12)}" opacity=".55"/>
        <ellipse cx="143" cy="105" rx="5" ry="3.5" fill="${shade(c.skin, -.12)}" opacity=".55"/>`;
      break;
    case 'hood':
      art = `<path d="M80 120 Q74 52 120 40 Q166 52 160 120 Q140 132 120 132 Q100 132 80 120 Z" fill="${cl}" ${stroke}/>
        <path d="M84 112 Q82 56 120 46 Q158 56 156 112 Q140 124 120 124 Q100 124 84 112 Z" fill="${shade(c.cloth, -.12)}"/>
        <path d="M96 118 Q94 70 120 68 Q146 70 144 118 Q120 130 96 118 Z" fill="#131725" ${stroke}/>
        ${eyes(p, 109, 131, 96, true)}
        <path d="M84 112 Q120 128 156 112" fill="none" stroke="${c.clothShade}" stroke-width="5" opacity=".7"/>
        <path d="M120 44 Q120 32 128 28" fill="none" stroke="${c.clothShade}" stroke-width="6"/>`;
      break;
    case 'skull':
      art = `<path d="M88 78 Q88 44 120 44 Q152 44 152 78 L152 98 Q152 110 138 114 L138 124 Q120 132 102 124 L102 114 Q88 110 88 98 Z" fill="${s}" ${stroke}/>
        <ellipse cx="106" cy="92" rx="10" ry="11" fill="#171a24"/>
        <ellipse cx="134" cy="92" rx="10" ry="11" fill="#171a24"/>
        <circle cx="108" cy="90" r="4" fill="${c.eye}"/><circle cx="136" cy="90" r="4" fill="${c.eye}"/>
        <path d="M120 100 l-5 10 h10 z" fill="#171a24"/>
        <path d="M106 116 h28 M112 116 v8 M120 116 v9 M128 116 v8" stroke="${shade(c.skin, -.35)}" stroke-width="2.6" fill="none"/>
        <path d="M94 66 Q106 56 120 56" fill="none" stroke="#fff" stroke-width="3" opacity=".35"/>`;
      break;
    case 'goblin':
      art = `${ears(p, 'pointy')}
        <path d="M90 76 Q88 48 120 46 Q152 48 150 76 L152 100 Q150 122 120 128 Q90 122 88 100 Z" fill="${s}" ${stroke}/>
        <path d="M92 70 Q104 54 120 56 Q138 54 148 70 Q132 62 120 66 Q106 62 92 70 Z" fill="${shade(c.skin, -.28)}"/>
        ${eyes(p, 106, 134, 90, true)}
        <path d="M120 96 Q126 106 118 110 Q110 108 114 98 Z" fill="${shade(c.skin, -.18)}" ${stroke}/>
        <path d="M106 116 Q120 126 134 116" fill="none" stroke="#201a16" stroke-width="3"/>
        <path d="M110 118 l3 8 3 -7 M126 119 l3 7 3 -8" fill="#fff8e0" ${stroke}/>`;
      break;
    case 'beast':
      art = `<path d="M84 92 Q80 62 112 60 Q146 58 150 88 L176 98 Q188 106 176 116 L152 122 Q124 136 96 120 Z" fill="${s}" ${stroke}/>
        <path d="M90 66 L78 38 L108 58 Z" fill="${shade(c.skin, -.15)}" ${stroke}/>
        <path d="M132 60 L144 34 L152 72 Z" fill="${shade(c.skin, -.15)}" ${stroke}/>
        <path d="M150 92 Q176 88 180 100 Q176 108 156 106 Z" fill="${shade(c.skin, .12)}"/>
        ${eyes(p, 116, 132, 86, true)}
        <ellipse cx="177" cy="99" rx="6" ry="4.5" fill="#171a24"/>
        <path d="M104 114 Q124 126 142 114" fill="none" stroke="#241a18" stroke-width="3"/>
        <path d="M110 116 l4 10 4 -9 M122 120 l4 9 4 -10 M134 117 l3 8 4 -9" fill="#fff8e0" ${stroke}/>
        <path d="M158 108 Q172 112 176 104" fill="none" stroke="#241a18" stroke-width="2.5"/>`;
      break;
    case 'dragon':
      art = `<path d="M78 92 Q74 58 110 54 Q148 50 154 82 L184 94 Q196 104 182 114 L158 122 Q126 138 94 118 Z" fill="${s}" ${stroke}/>
        <path d="M92 60 Q80 30 66 18 Q86 24 106 52 Z" fill="${shade(c.skin, .3)}" ${stroke}/>
        <path d="M140 58 Q150 28 168 16 Q160 36 154 60 Z" fill="${shade(c.skin, .3)}" ${stroke}/>
        <path d="M86 92 L58 78 L76 108 Z" fill="${shade(c.skin, -.2)}" ${stroke}/>
        ${eyes(p, 116, 134, 84, true)}
        <ellipse cx="180" cy="98" rx="6" ry="4" fill="#201514"/>
        <path d="M104 112 Q128 128 150 112" fill="none" stroke="#2b1714" stroke-width="3"/>
        <path d="M110 114 l4 12 4 -10 M122 119 l4 10 4 -11 M136 116 l3 9 4 -9 M152 112 l3 8 3 -8" fill="#fff8e0" ${stroke}/>
        <path d="M96 66 Q120 56 140 68" fill="none" stroke="${shade(c.skin, .25)}" stroke-width="3" opacity=".6"/>`;
      break;
    case 'horned':
      art = `${horns(p, c.horns === 'none' ? 'large' : c.horns)}
        <path d="M88 76 Q86 46 120 44 Q154 46 152 76 L152 98 Q152 122 120 128 Q88 122 88 98 Z" fill="${s}" ${stroke}/>
        <path d="M90 68 Q104 56 120 58 Q138 56 150 68 Q132 62 120 64 Q106 62 90 68 Z" fill="${shade(c.skin, -.3)}"/>
        <path d="M100 86 L114 92 L104 94 Z M140 86 L126 92 L136 94 Z" fill="${shade(c.skin, -.4)}"/>
        ${eyes(p, 108, 132, 96, true)}
        <path d="M108 114 Q120 122 132 114" fill="none" stroke="#2b1714" stroke-width="3"/>
        <path d="M112 116 l3 8 3 -7 M126 116 l3 8 3 -7" fill="#fff8e0" ${stroke}/>`;
      break;
    case 'helm':
      art = `<path d="M86 84 Q86 44 120 42 Q154 44 154 84 L154 106 Q150 122 120 128 Q90 122 86 106 Z" fill="${m}" ${stroke}/>
        <path d="M86 84 Q120 74 154 84 L154 96 Q120 86 86 96 Z" fill="#1b202c" ${stroke}/>
        <rect x="94" y="88" width="52" height="7" rx="3" fill="${shade(c.eye, .1)}"/>
        <path d="M120 44 L120 126" stroke="${shade(c.metal, -.3)}" stroke-width="4" opacity=".8"/>
        <path d="M88 100 L84 116 L96 120 L100 104 Z" fill="${shade(c.metal, -.2)}" ${stroke}/>
        <path d="M152 100 L156 116 L144 120 L140 104 Z" fill="${shade(c.metal, -.2)}" ${stroke}/>
        <path d="M116 46 Q104 30 114 16 Q124 8 134 14 Q142 19 138 26 Q130 22 128 30 Q126 40 124 46 Z" fill="${c.cloth}" ${stroke}/>
        <path d="M100 48 Q120 42 140 48" fill="none" stroke="#fff" stroke-width="3" opacity=".45"/>`;
      break;
    case 'wraith':
      art = `<path d="M82 116 Q74 54 120 40 Q166 54 158 116 Q150 134 140 122 Q132 140 120 126 Q108 142 100 122 Q88 136 82 116 Z" fill="${cl}" ${stroke}/>
        <path d="M96 116 Q94 70 120 66 Q146 70 144 116 Q120 132 96 116 Z" fill="#101828"/>
        ${eyes(p, 109, 131, 94, true)}
        <path d="M112 108 Q120 116 128 108" fill="none" stroke="${shade(c.eye, -.2)}" stroke-width="2.5" opacity=".8"/>
        <circle cx="120" cy="90" r="34" fill="url(#${id}-g)" opacity=".55"/>`;
      break;
  }
  return art;
}

/* -------------------------------------------------------------------- bodies */

function humanoidBody(p: Palette, brute: boolean): string {
  const { id, c } = p;
  const w = brute ? 12 : 0;
  const cloth = `url(#${id}-c)`;
  const skin = `url(#${id}-s)`;
  return `
    <path d="M${100 - w} 166 h18 v40 q0 8 -9 8 h-9 q-8 0 -8 -8 z" fill="${shade(c.cloth, -.35)}" ${stroke}/>
    <path d="M${122 + w} 166 h18 v40 q0 8 -9 8 h-9 q-8 0 -8 -8 z" fill="${shade(c.cloth, -.35)}" ${stroke}/>
    <path d="M${92 - w} 202 h26 v12 q0 5 -6 5 h-20 q-6 0 -6 -5 z" fill="#3b2a20" ${stroke}/>
    <path d="M${122 + w} 202 h26 v12 q0 5 -6 5 h-20 q-6 0 -6 -5 z" fill="#3b2a20" ${stroke}/>
    <path d="M${88 - w} 122 Q120 ${108 - w / 2} ${152 + w} 122 L${160 + w} 178 Q120 ${188 + w / 3} ${80 - w} 178 Z" fill="${cloth}" ${stroke}/>
    <path d="M108 118 h24 l-5 20 h-14 z" fill="${skin}" ${stroke}/>
    <path d="M${88 - w} 128 Q120 140 ${152 + w} 128" fill="none" stroke="${shade(c.cloth, .25)}" stroke-width="4" opacity=".55"/>
    <rect x="${82 - w}" y="164" width="${76 + w * 2}" height="11" rx="4" fill="#4b3222" ${stroke}/>
    <rect x="114" y="163" width="13" height="13" rx="3" fill="#e9c46a" ${stroke}/>
    ${(c.head === 'helm' || brute) ? `
      <ellipse cx="${88 - w}" cy="126" rx="15" ry="11" fill="url(#${id}-m)" ${stroke}/>
      <ellipse cx="${152 + w}" cy="126" rx="15" ry="11" fill="url(#${id}-m)" ${stroke}/>` : ''}
    <path d="M${88 - w} 130 Q${68 - w} 146 ${72 - w} 166" fill="none" stroke="${OUT}" stroke-width="22" stroke-linecap="round"/>
    <path d="M${88 - w} 130 Q${68 - w} 146 ${72 - w} 166" fill="none" stroke="${skin}" stroke-width="15" stroke-linecap="round"/>
    <path d="M${152 + w} 130 Q${172 + w} 146 ${168 + w} 166" fill="none" stroke="${OUT}" stroke-width="22" stroke-linecap="round"/>
    <path d="M${152 + w} 130 Q${172 + w} 146 ${168 + w} 166" fill="none" stroke="${skin}" stroke-width="15" stroke-linecap="round"/>
    <circle cx="${72 - w}" cy="168" r="10" fill="${skin}" ${stroke}/>
    <circle cx="${168 + w}" cy="168" r="10" fill="${skin}" ${stroke}/>`;
}

function beastBody(p: Palette): string {
  const { id, c } = p;
  const s = `url(#${id}-s)`;
  return `
    <path d="M158 158 Q198 148 206 112 Q210 96 198 100 Q190 122 166 134" fill="${shade(c.skin, -.15)}" ${stroke}/>
    <ellipse cx="122" cy="158" rx="58" ry="36" fill="${s}" ${stroke}/>
    <path d="M84 180 q-6 20 0 32 h16 q4 -18 0 -30 z" fill="${shade(c.skin, -.2)}" ${stroke}/>
    <path d="M112 184 q-4 18 2 30 h16 q4 -18 0 -30 z" fill="${s}" ${stroke}/>
    <path d="M146 182 q-2 18 4 32 h16 q2 -20 -4 -32 z" fill="${shade(c.skin, -.2)}" ${stroke}/>
    <path d="M172 174 q2 18 8 30 h14 q0 -22 -8 -32 z" fill="${s}" ${stroke}/>
    <path d="M96 132 Q122 118 152 134" fill="none" stroke="${shade(c.skin, .22)}" stroke-width="6" opacity=".5"/>
    <path d="M104 148 q14 12 30 4 M142 152 q12 8 24 0" fill="none" stroke="${shade(c.skin, -.25)}" stroke-width="3" opacity=".6"/>`;
}

function dragonBody(p: Palette): string {
  const { id, c } = p;
  const s = `url(#${id}-s)`;
  return `
    <path d="M166 172 Q216 162 220 118 Q222 104 210 110 Q204 138 176 144" fill="${shade(c.skin, -.15)}" ${stroke}/>
    <path d="M204 116 l14 -12 -4 18 z" fill="${shade(c.skin, .2)}" ${stroke}/>
    <path d="M74 132 Q52 76 40 46 Q62 62 96 96 Q110 110 104 136 Z" fill="${shade(c.skin, -.18)}" ${stroke}/>
    <path d="M122 108 Q100 66 112 44 Q120 34 136 46 Q154 66 146 108 Z" fill="${s}" ${stroke}/>
    <ellipse cx="132" cy="164" rx="66" ry="40" fill="${s}" ${stroke}/>
    <path d="M96 184 q-6 20 0 32 h18 q4 -18 0 -30 z" fill="${shade(c.skin, -.2)}" ${stroke}/>
    <path d="M150 188 q0 18 6 28 h18 q0 -20 -8 -30 z" fill="${shade(c.skin, -.2)}" ${stroke}/>
    <path d="M84 150 Q120 128 168 150" fill="none" stroke="${shade(c.skin, .22)}" stroke-width="7" opacity=".45"/>
    <path d="M126 136 L146 146 L126 156 L106 146 Z" fill="${shade(c.skin, .3)}" ${stroke}/>`;
}

function wraithBody(p: Palette): string {
  const { id, c } = p;
  return `
    <circle cx="120" cy="140" r="72" fill="url(#${id}-g)" opacity=".35"/>
    <path d="M86 118 Q120 104 154 118 L172 192 Q160 204 150 186 Q142 208 132 188 Q124 210 116 188 Q106 208 98 186 Q86 204 68 192 Z" fill="url(#${id}-c)" ${stroke}/>
    <path d="M96 128 Q120 118 144 128" fill="none" stroke="${shade(c.cloth, .35)}" stroke-width="5" opacity=".6"/>
    <path d="M104 150 Q120 144 136 150" fill="none" stroke="${shade(c.cloth, .3)}" stroke-width="4" opacity=".45"/>
    <path d="M74 190 Q64 202 70 212 M166 188 Q176 200 170 210" fill="none" stroke="${c.eye}" stroke-width="4" opacity=".6" stroke-linecap="round"/>`;
}

function wings(p: Palette): string {
  const { c } = p;
  const wing = shade(c.skin, -.32);
  return `<g opacity=".95">
    <path d="M110 128 Q72 62 18 66 Q34 84 30 92 Q48 94 46 102 Q28 110 24 122 Q40 122 44 130 Q34 142 38 152 Q66 146 108 152 Z" fill="${wing}" ${stroke}/>
    <path d="M110 130 Q78 84 34 74 M106 136 Q72 106 42 100 M108 144 Q78 128 50 128" fill="none" stroke="${shade(c.skin, -.5)}" stroke-width="3" opacity=".7"/>
    <path d="M130 128 Q168 62 222 66 Q206 84 210 92 Q192 94 194 102 Q212 110 216 122 Q200 122 196 130 Q206 142 202 152 Q174 146 132 152 Z" fill="${wing}" ${stroke}/>
    <path d="M130 130 Q162 84 206 74 M134 136 Q168 106 198 100 M132 144 Q162 128 190 128" fill="none" stroke="${shade(c.skin, -.5)}" stroke-width="3" opacity=".7"/>
  </g>`;
}

/* ------------------------------------------------------------------- compose */

export function renderCreature(config: CreatureConfig, className = ''): string {
  const id = 'cr' + (++serial).toString(36);
  const p: Palette = {
    id, c: config,
    skin: `url(#${id}-s)`, cloth: `url(#${id}-c)`, metal: `url(#${id}-m)`,
  };
  const body = config.body === 'beast' ? beastBody(p)
    : config.body === 'dragon' ? dragonBody(p)
      : config.body === 'wraith' ? wraithBody(p)
        : humanoidBody(p, config.body === 'brute');

  const headShift = config.body === 'beast' ? 'translate(-36,42) scale(0.86)'
    : config.body === 'dragon' ? 'translate(-6,-24) scale(0.95)'
      : config.body === 'wraith' ? 'translate(0,-6)'
        : '';
  // Head is shifted for non-humanoid creatures so it sits on the snout/neck.
  const headGroup = headShift
    ? `<g transform="translate(120 100) ${headShift} translate(-120 -100)">${head(p, config.head)}</g>`
    : head(p, config.head);

  const weaponAt = config.weapon === 'none' ? '' :
    `<g transform="translate(${config.body === 'beast' || config.body === 'dragon' ? 186 : 170} ${config.body === 'wraith' ? 158 : 168}) rotate(-14) scale(${config.body === 'beast' || config.body === 'dragon' ? 0.72 : 0.86})">${weapon(p, config.weapon)}</g>`;

  const cape = config.cape
    ? `<path d="M84 116 Q120 104 156 116 L176 202 Q152 216 120 202 Q88 216 64 202 Z" fill="${shade(config.cloth, -.25)}" ${stroke}/>
       <path d="M84 116 Q120 128 156 116" fill="none" stroke="${shade(config.cloth, .3)}" stroke-width="5"/>`
    : '';

  const glowAura = config.glow
    ? `<ellipse cx="120" cy="150" rx="88" ry="80" fill="url(#${id}-g)" opacity=".22"/>`
    : '';

  return `<svg class="creature-svg ${className}" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    ${defs(p)}
    <ellipse cx="120" cy="222" rx="58" ry="9" fill="#000" opacity=".25"/>
    ${glowAura}
    <g transform="translate(120 130) scale(${config.scale ?? 1}) translate(-120 -130)">
      ${config.wings ? wings(p) : ''}
      ${cape}
      ${body}
      ${headGroup}
      ${config.crown ? crown() : ''}
      ${config.head === 'human' || config.head === 'horned' || config.head === 'goblin' || config.head === 'skull' ? horns(p, config.horns) : ''}
      ${weaponAt}
    </g>
  </svg>`;
}

export function creatureCssVars(c: CreatureConfig): string {
  return `--enemy-accent:${c.eye};--enemy-shadow:${rgba(c.skinShade, .5)}`;
}
