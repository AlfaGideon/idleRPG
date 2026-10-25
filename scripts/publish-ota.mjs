#!/usr/bin/env node
/**
 * Build the over-the-air bundle and its manifest.
 *
 *   node scripts/publish-ota.mjs                       # same version, refresh bundle
 *   node scripts/publish-ota.mjs 2.0.1 "Исправления"   # bump version + notes
 *
 * After committing ota/game.html and ota/manifest.json, every running copy of
 * the game (APK, PWA, standalone HTML) will notice the new version, download
 * the bundle and offer a restart. Progress is never touched.
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VERSION_FILE = join(ROOT, 'src', 'game', 'version.ts');
const PKG_FILE = join(ROOT, 'package.json');
const MOBILE_HTML = join(ROOT, 'mobile', 'Корона_и_Клинок.html');
const OTA_DIR = join(ROOT, 'ota');
const MANIFEST = join(OTA_DIR, 'manifest.json');
const BUNDLE = join(OTA_DIR, 'game.html');
const REPO_URL = 'https://raw.githubusercontent.com/AlfaGideon/idleRPG/main/ota/game.html';

const [, , rawVersion, ...noteParts] = process.argv;
const notes = noteParts.join(' ').trim()
  || (existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')).notes : 'Новая версия игры.');

let version = rawVersion;
if (!version) {
  const src = readFileSync(VERSION_FILE, 'utf8');
  version = /APP_VERSION\s*=\s*'([^']+)'/.exec(src)?.[1] ?? '2.0.0';
}
if (!/^\d+\.\d+\.\d+/.test(version)) {
  console.error(`Неверная версия: ${version}`);
  process.exit(1);
}

/* Keep all version sources in sync. */
const pkg = JSON.parse(readFileSync(PKG_FILE, 'utf8'));
pkg.version = version;
writeFileSync(PKG_FILE, JSON.stringify(pkg, null, 2) + '\n');
writeFileSync(VERSION_FILE,
  `/** Bumped by \`node scripts/publish-ota.mjs <version> <notes>\`. */\nexport const APP_VERSION = '${version}';\n`);

/* Rebuild AFTER bumping so the shipped bundle carries the new APP_VERSION. */
if (!process.argv.includes('--no-build')) {
  execFileSync('npm', ['run', 'build:mobile'], { cwd: ROOT, stdio: 'inherit' });
}

if (!existsSync(MOBILE_HTML)) {
  console.error('Нет mobile/Корона_и_Клинок.html. Сначала: npm ci && npm run build:mobile');
  process.exit(1);
}
mkdirSync(OTA_DIR, { recursive: true });
copyFileSync(MOBILE_HTML, BUNDLE);

const html = readFileSync(BUNDLE);
const manifest = {
  version,
  notes,
  url: REPO_URL,
  size: html.length,
  sha256: createHash('sha256').update(html).digest('hex'),
  publishedAt: new Date().toISOString(),
};
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');

console.log(`OTA ${version}: game.html ${(html.length / 1024).toFixed(0)} КБ, sha256 ${manifest.sha256.slice(0, 12)}…`);
console.log('Запушьте ota/ — игры сами предложат обновление.');
