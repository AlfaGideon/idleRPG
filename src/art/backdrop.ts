import type { Region } from '../game/types';
import { rgba, shade } from './colors';

let serial = 0;

function stars(seed: number, color = '#dce7ff'): string {
  let out = '';
  let x = seed * 7919;
  const rnd = () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; };
  for (let i = 0; i < 34; i++) {
    const px = Math.round(rnd() * 400);
    const py = Math.round(rnd() * 150);
    const r = (rnd() * 1.3 + 0.4).toFixed(1);
    out += `<circle cx="${px}" cy="${py}" r="${r}" fill="${color}" opacity="${(0.25 + rnd() * 0.6).toFixed(2)}"/>`;
  }
  return out;
}

function clouds(y: number, color: string, opacity = 0.5): string {
  return `<g fill="${color}" opacity="${opacity}">
    <ellipse cx="60" cy="${y}" rx="46" ry="11"/><ellipse cx="82" cy="${y - 7}" rx="30" ry="13"/>
    <ellipse cx="270" cy="${y + 18}" rx="54" ry="12"/><ellipse cx="292" cy="${y + 10}" rx="34" ry="14"/>
    <ellipse cx="370" cy="${y - 12}" rx="34" ry="9"/>
  </g>`;
}

function pine(x: number, y: number, h: number, color: string): string {
  return `<path d="M${x} ${y - h} l${h * 0.34} ${h * 0.55} h${-h * 0.2} l${h * 0.27} ${h * 0.45} h${-h * 0.82} l${h * 0.27} ${-h * 0.45} h${-h * 0.2} z" fill="${color}"/>
    <rect x="${x - 2}" y="${y - h * 0.06}" width="4" height="${h * 0.12}" fill="${color}"/>`;
}

function tree(x: number, y: number, s: number, trunk: string, leaf: string): string {
  return `<rect x="${x - 4 * s}" y="${y - 34 * s}" width="${8 * s}" height="${36 * s}" rx="${3 * s}" fill="${trunk}"/>
    <circle cx="${x}" cy="${y - 44 * s}" r="${22 * s}" fill="${leaf}"/>
    <circle cx="${x - 16 * s}" cy="${y - 34 * s}" r="${15 * s}" fill="${leaf}"/>
    <circle cx="${x + 16 * s}" cy="${y - 34 * s}" r="${15 * s}" fill="${leaf}"/>`;
}

function deadTree(x: number, y: number, s: number, color: string): string {
  return `<path d="M${x} ${y} q${-3 * s} ${-30 * s} ${2 * s} ${-58 * s} l${-18 * s} ${-14 * s} m${18 * s} ${14 * s} l${20 * s} ${-20 * s} m${-20 * s} ${20 * s} l${-14 * s} ${-24 * s} m${14 * s} ${24 * s} l${16 * s} ${-6 * s} m${-16 * s} ${-20 * s} l${-12 * s} ${-16 * s}"
    fill="none" stroke="${color}" stroke-width="${5 * s}" stroke-linecap="round"/>`;
}

function tombstones(color: string): string {
  return `<g fill="${color}">
    <path d="M28 250 v-22 a12 12 0 0 1 24 0 v22 z"/>
    <path d="M74 254 v-16 h18 v16 z"/>
    <path d="M322 252 v-26 a13 13 0 0 1 26 0 v26 z"/>
    <path d="M366 256 v-18 h16 v18 z"/>
  </g>`;
}

function scenery(region: Region): string {
  const { far, mid, near, orb } = region;
  switch (region.scenery) {
    case 'vale':
      return `
        <circle cx="318" cy="66" r="30" fill="${orb}" opacity=".9"/>
        <circle cx="318" cy="66" r="52" fill="${orb}" opacity=".13"/>
        ${clouds(52, '#ffffff', .55)}
        <path d="M0 208 Q70 150 130 196 Q196 142 252 190 Q320 140 400 196 V320 H0 Z" fill="${far}" opacity=".65"/>
        <path d="M212 196 v-52 h10 v-12 h10 v-12 h10 v-12 h10 v12 h10 v12 h10 v12 h10 v52 z" fill="${shade(far, -.18)}" opacity=".8"/>
        <path d="M0 232 Q60 198 130 224 Q200 190 270 222 Q340 194 400 226 V320 H0 Z" fill="${mid}"/>
        ${tree(38, 244, 1.15, '#4a3626', shade(mid, -.2))}
        ${tree(92, 250, 0.8, '#4a3626', shade(mid, -.2))}
        ${tree(352, 248, 1.05, '#4a3626', shade(mid, -.2))}
        <path d="M0 262 Q100 238 200 258 Q300 236 400 260 V320 H0 Z" fill="${near}"/>
        <path d="M0 286 Q120 268 240 286 Q330 272 400 288 V320 H0 Z" fill="${shade(near, -.14)}"/>
        <g stroke="${shade(near, .3)}" stroke-width="2" opacity=".6">
          <path d="M20 296 l-4 -12 M24 296 l6 -10 M160 300 l-4 -12 M164 300 l6 -10 M300 296 l-4 -12 M304 296 l6 -10"/>
        </g>`;
    case 'road':
      return `
        <circle cx="84" cy="92" r="38" fill="${orb}" opacity=".85"/>
        <circle cx="84" cy="92" r="70" fill="${orb}" opacity=".12"/>
        ${clouds(58, '#ffe3c0', .35)}
        <path d="M0 214 Q90 168 180 208 Q280 160 400 206 V320 H0 Z" fill="${far}" opacity=".7"/>
        <g fill="${shade(far, -.2)}" opacity=".85">
          <rect x="146" y="150" width="18" height="60"/><rect x="168" y="132" width="26" height="78"/>
          <rect x="198" y="150" width="18" height="60"/><rect x="136" y="146" width="84" height="10"/>
          <path d="M181 114 l9 18 h-18 z"/>
        </g>
        <path d="M0 240 Q110 214 210 240 Q310 212 400 238 V320 H0 Z" fill="${mid}"/>
        <path d="M158 236 L242 236 L340 320 L60 320 Z" fill="${region.ground[0]}" opacity=".8"/>
        <path d="M0 264 Q100 250 200 266 Q300 250 400 264 V320 H0 Z" fill="${near}"/>
        <g fill="${shade(near, -.16)}">
          <rect x="24" y="238" width="6" height="30"/><rect x="60" y="242" width="6" height="28"/>
          <rect x="332" y="240" width="6" height="30"/><rect x="366" y="244" width="6" height="26"/>
        </g>
        <path d="M0 290 Q120 276 240 292 Q330 278 400 292 V320 H0 Z" fill="${shade(near, -.12)}"/>`;
    case 'crypt':
      return `
        ${stars(3)}
        <circle cx="310" cy="62" r="26" fill="${orb}" opacity=".9"/>
        <circle cx="310" cy="62" r="48" fill="${orb}" opacity=".13"/>
        <path d="M0 210 Q80 176 150 208 Q230 172 300 206 Q350 180 400 206 V320 H0 Z" fill="${far}" opacity=".6"/>
        <g fill="${shade(far, -.25)}" opacity=".9">
          <path d="M40 214 v-54 h12 v-8 h20 v8 h12 v54 z"/>
          <path d="M244 212 v-62 h12 v-8 h18 v8 h12 v62 z"/>
          <rect x="120" y="176" width="8" height="40"/><rect x="176" y="176" width="8" height="40"/>
          <path d="M112 176 q40 -34 80 0 z"/>
        </g>
        <path d="M0 238 Q100 220 200 238 Q300 218 400 238 V320 H0 Z" fill="${mid}"/>
        ${deadTree(56, 254, 1.1, shade(mid, -.45))}
        ${deadTree(348, 252, 0.9, shade(mid, -.45))}
        ${tombstones(shade(mid, -.32))}
        <path d="M0 268 Q100 254 200 270 Q300 252 400 268 V320 H0 Z" fill="${near}"/>
        <g fill="${shade(near, .28)}" opacity=".55">
          <rect x="148" y="262" width="34" height="6" rx="2"/><rect x="262" y="270" width="24" height="5" rx="2"/>
        </g>`;
    case 'wastes':
      return `
        <circle cx="200" cy="54" r="40" fill="${orb}" opacity=".35"/>
        <circle cx="200" cy="54" r="66" fill="${orb}" opacity=".1"/>
        <path d="M0 220 L90 132 L126 168 L172 96 L226 166 L268 140 L400 224 V320 H0 Z" fill="${far}" opacity=".7"/>
        <path d="M150 118 L172 96 L194 122 L182 116 L172 126 L162 114 Z" fill="${orb}" opacity=".8"/>
        <path d="M0 240 L60 206 L110 230 L170 198 L230 232 L300 196 L360 234 L400 214 V320 H0 Z" fill="${mid}"/>
        <g fill="${shade(mid, -.2)}">
          <path d="M28 252 l14 -34 16 34 z"/><path d="M330 250 l18 -40 20 40 z"/>
        </g>
        <path d="M0 268 Q100 248 200 268 Q300 248 400 268 V320 H0 Z" fill="${near}"/>
        <g stroke="${orb}" stroke-width="2.5" opacity=".5" fill="none">
          <path d="M40 300 q30 -14 56 0 M180 294 q40 -18 76 2 M280 306 q30 -10 60 2"/>
        </g>`;
    case 'frost':
      return `
        <circle cx="96" cy="68" r="26" fill="${orb}" opacity=".75"/>
        <circle cx="96" cy="68" r="50" fill="${orb}" opacity=".12"/>
        <path d="M0 222 L64 140 L102 180 L148 112 L196 172 L240 128 L300 186 L344 140 L400 214 V320 H0 Z" fill="${far}" opacity=".75"/>
        <path d="M124 142 L148 112 L172 142 L158 136 L148 146 L138 136 Z" fill="#ffffff" opacity=".75"/>
        <path d="M226 158 L240 128 L256 156 L245 150 L240 158 L233 150 Z" fill="#ffffff" opacity=".65"/>
        <path d="M0 240 Q80 210 170 238 Q250 206 330 236 Q370 224 400 236 V320 H0 Z" fill="${mid}"/>
        ${pine(38, 252, 56, shade(mid, -.2))}${pine(80, 258, 42, shade(mid, -.2))}
        ${pine(334, 254, 60, shade(mid, -.2))}${pine(372, 260, 40, shade(mid, -.2))}
        <path d="M0 270 Q100 250 200 270 Q300 250 400 270 V320 H0 Z" fill="${near}"/>
        <g fill="${shade(orb, .2)}" opacity=".8">
          <path d="M20 288 l6 -18 6 18 z"/><path d="M286 292 l8 -22 8 22 z"/><path d="M370 286 l5 -14 5 14 z"/>
        </g>`;
    case 'forest':
      return `
        ${stars(9, '#e6d4ff')}
        <circle cx="316" cy="72" r="28" fill="${orb}" opacity=".55"/>
        <circle cx="316" cy="72" r="54" fill="${orb}" opacity=".1"/>
        <path d="M0 226 Q90 190 180 224 Q280 186 400 222 V320 H0 Z" fill="${far}" opacity=".55"/>
        ${deadTree(46, 236, 1.5, shade(far, -.3))}${deadTree(348, 232, 1.3, shade(far, -.3))}
        <path d="M0 244 Q110 222 220 244 Q310 220 400 242 V320 H0 Z" fill="${mid}"/>
        ${deadTree(104, 258, 1.0, shade(mid, -.4))}${deadTree(292, 256, 1.1, shade(mid, -.4))}
        <path d="M0 272 Q100 256 200 272 Q300 256 400 272 V320 H0 Z" fill="${near}"/>
        <g fill="${orb}" opacity=".55">
          <circle cx="60" cy="286" r="5"/><circle cx="72" cy="282" r="4"/>
          <circle cx="240" cy="292" r="5"/><circle cx="252" cy="288" r="3"/>
        </g>
        <ellipse cx="200" cy="250" rx="180" ry="16" fill="${orb}" opacity=".07"/>`;
    case 'throne':
      return `
        ${stars(17, '#ffb6d0')}
        <circle cx="200" cy="72" r="34" fill="${orb}" opacity=".38"/>
        <circle cx="200" cy="72" r="70" fill="${orb}" opacity=".1"/>
        <path d="M0 226 Q100 194 200 224 Q300 190 400 224 V320 H0 Z" fill="${far}" opacity=".65"/>
        <g fill="${shade(far, -.28)}">
          <rect x="96" y="140" width="30" height="86"/><rect x="274" y="140" width="30" height="86"/>
          <path d="M90 140 l21 -34 21 34 z M268 140 l21 -34 21 34 z"/>
          <rect x="126" y="170" width="148" height="56"/>
          <path d="M126 170 l74 -40 74 40 z"/>
          <rect x="188" y="192" width="24" height="34" rx="12"/>
        </g>
        <rect x="188" y="180" width="24" height="16" fill="${orb}" opacity=".55"/>
        <path d="M0 244 Q100 226 200 244 Q300 224 400 242 V320 H0 Z" fill="${mid}"/>
        <path d="M0 272 Q100 256 200 272 Q300 254 400 270 V320 H0 Z" fill="${near}"/>
        <g fill="${orb}" opacity=".3">
          <path d="M40 262 l4 -26 4 26 z M360 260 l4 -26 4 26 z"/>
        </g>`;
    case 'lair':
      return `
        <circle cx="200" cy="60" r="44" fill="${orb}" opacity=".3"/>
        <circle cx="200" cy="60" r="78" fill="${orb}" opacity=".09"/>
        <path d="M0 220 L50 120 L82 176 L132 106 L180 172 L228 96 L282 170 L330 118 L400 220 V320 H0 Z" fill="${far}" opacity=".75"/>
        <path d="M0 242 L58 202 L108 236 L170 196 L228 238 L292 198 L348 236 L400 206 V320 H0 Z" fill="${mid}"/>
        <path d="M0 272 Q100 250 200 270 Q300 250 400 270 V320 H0 Z" fill="${near}"/>
        <g fill="${orb}" opacity=".65">
          <ellipse cx="80" cy="300" rx="46" ry="7"/><ellipse cx="286" cy="306" rx="56" ry="8"/>
        </g>
        <g fill="${shade(near, .2)}" opacity=".8">
          <path d="M188 272 q-14 -18 2 -26 q-4 12 12 12 q18 2 14 16 z"/>
        </g>`;
  }
}

export function renderBackdrop(region: Region): string {
  const id = 'bg' + (++serial).toString(36);
  return `<svg class="backdrop-svg" viewBox="0 0 400 320" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${region.sky[0]}"/>
        <stop offset="100%" stop-color="${region.sky[1]}"/>
      </linearGradient>
      <linearGradient id="${id}-ground" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${region.ground[0]}"/>
        <stop offset="100%" stop-color="${region.ground[1]}"/>
      </linearGradient>
      <radialGradient id="${id}-vig">
        <stop offset="55%" stop-color="#000" stop-opacity="0"/>
        <stop offset="100%" stop-color="#000" stop-opacity=".45"/>
      </radialGradient>
    </defs>
    <rect width="400" height="320" fill="url(#${id}-sky)"/>
    ${scenery(region)}
    <rect y="286" width="400" height="34" fill="url(#${id}-ground)" opacity=".55"/>
    <rect width="400" height="320" fill="url(#${id}-vig)"/>
    <rect y="294" width="400" height="26" fill="${rgba(region.ground[1], .5)}"/>
  </svg>`;
}
