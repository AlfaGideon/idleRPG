import { readFileSync, readdirSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const ROOT = process.cwd();
const FINAL = join(ROOT, 'mobile', 'Корона_и_Клинок.html');
const ASSETS = join(ROOT, 'android', 'app', 'src', 'main', 'assets', 'index.html');

function svgData(path: string): string {
  return 'data:image/svg+xml;base64,' + Buffer.from(readFileSync(path, 'utf8').trim()).toString('base64');
}

/**
 * Inlines every Twemoji SVG as a data URI and removes links to files that do
 * not exist next to a standalone HTML file (manifest, apple-touch-icon).
 */
function standaloneShell(): Plugin {
  return {
    name: 'standalone-shell',
    apply: 'build',
    transformIndexHtml: {
      order: 'pre',
      handler(html: string) {
        const dir = join(ROOT, 'public', 'icons', 'emoji');
        const inline: Record<string, string> = {};
        for (const file of readdirSync(dir)) {
          if (file.endsWith('.svg')) inline[file.replace(/\.svg$/, '')] = svgData(join(dir, file));
        }
        const favicon = svgData(join(ROOT, 'public', 'icons', 'icon.svg'));
        const script = `<script>globalThis.__EMOJI_INLINE__=${JSON.stringify(inline)};</script>`;
        return html
          .replace(/<link\s+rel="manifest"[^>]*>\s*/gi, '')
          .replace(/<link\s+rel="apple-touch-icon"[^>]*>\s*/gi, '')
          .replace(/<link\s+rel="icon"[^>]*>\s*/gi, `<link rel="icon" type="image/svg+xml" href="${favicon}">\n    `)
          .replace('</head>', `    ${script}\n  </head>`);
      },
    },
  };
}

/** Turn the module script into a classic one and publish the final files. */
function publishStandalone(): Plugin {
  return {
    name: 'publish-standalone',
    apply: 'build',
    enforce: 'post',
    writeBundle(options) {
      const outDir = options.dir ?? join(ROOT, 'mobile-build');
      const file = join(outDir, 'index.html');
      let html = readFileSync(file, 'utf8');
      // No imports remain (IIFE) — a classic script also runs from file:// URLs,
      // whereas Chrome blocks module scripts loaded from the file scheme.
      html = html
        .replace(/<script\s+type="module"([^>]*)>/gi, '<script$1>')
        .replace(/\s+crossorigin(?:="[^"]*")?/gi, '')
        .replace(/<link\s+rel="modulepreload"[^>]*>\s*/gi, '');
      // Module scripts are deferred; classic inline scripts are not. Move all
      // inline scripts to the end of <body> so #app already exists when the
      // bundle runs (critical for file:// where defer is not available).
      const scripts: string[] = [];
      html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (match) => {
        scripts.push(match);
        return '';
      });
      html = html.replace('</body>', scripts.join('\n') + '\n  </body>');
      writeFileSync(file, html);
      mkdirSync(join(ROOT, 'mobile'), { recursive: true });
      mkdirSync(join(ROOT, 'android', 'app', 'src', 'main', 'assets'), { recursive: true });
      writeFileSync(FINAL, html);
      copyFileSync(file, ASSETS);
      console.log(`\n  📱 Один файл: mobile/Корона_и_Клинок.html (${(Buffer.byteLength(html) / 1024).toFixed(0)} КБ)`);
      console.log('  📦 Ассет для APK: android/app/src/main/assets/index.html\n');
    },
  };
}

export default defineConfig({
  base: './',
  publicDir: false,
  plugins: [
    standaloneShell(),
    viteSingleFile({ removeViteModuleLoader: true }),
    publishStandalone(),
  ],
  build: {
    target: 'es2020',
    outDir: 'mobile-build',
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000, // inline woff2/woff into the CSS
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions: {
      output: { format: 'iife', inlineDynamicImports: true },
    },
  },
});
