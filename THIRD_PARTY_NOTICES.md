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
