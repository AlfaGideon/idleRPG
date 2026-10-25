# Third-party notices

## Twemoji (emoji SVG icons)

The files in `public/icons/emoji/*.svg` are derived from
[Twemoji](https://github.com/twitter/twemoji) (Copyright 2019 Twitter, Inc. and
other contributors) and are licensed under
[CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/).

They are copied verbatim from the `@twemoji/svg` npm package by
`scripts/prepare-emoji.mjs`. Only the glyphs actually used by the game are
included, which keeps the offline bundle small.

## Fonts

- **Cormorant Garamond** — Copyright (c) Christian Thalmann,
  [SIL Open Font License 1.1](https://openfontlicense.org/).
- **Cinzel** — Copyright (c) Natanael Gama,
  [SIL Open Font License 1.1](https://openfontlicense.org/).

Both are bundled locally through `@fontsource/*` packages; no font is fetched
from Google Fonts or any other external host at runtime.

## Build tooling

Vite, TypeScript and Fontsource are development/runtime dependencies licensed
under MIT (see each package's LICENSE file in `node_modules`).

## APK build toolchain (not shipped)

`download/corona-i-klinok.apk` was assembled locally with these third-party
tools; none of their code is included in the APK itself:

- `aapt2` from the npm package `aaptjs3` (Android SDK Build Tools, Apache-2.0).
- `android.jar`, `d8.jar`, `apksigner.jar` and `ecj.jar` from the npm package
  `@drxiaozhi/minapk` (Android SDK / R8 / Eclipse JDT, Apache-2.0 / EPL).
- A Temurin JRE from the PyPI package `jdk4py` (GPLv2 + Classpath Exception).

They are used only at build time. The APK contains just the game's own code,
Twemoji SVGs and the two OFL fonts listed above.

## QA / asset tooling (not shipped)

Screenshots were produced with `playwright-core` (Apache-2.0) and
`@sparticuz/chromium` (MIT); JPEG conversion used `Pillow` (HPND).
The game's creature art, backgrounds, monsters, characters and logo are drawn
procedurally on a Canvas 2D context at runtime — no third-party image assets
are embedded in the game bundle.
