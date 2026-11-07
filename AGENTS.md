# AGENTS.md

## Purpose

LofiCity is a lo-fi pixel-art web app: scenes for several cities (Esperança, Campina Grande, João Pessoa, Areia, Remígio, Tokyo) that follow each city's real clock and live weather, plus two radio stations. See `README.md` for cities, URL options (`#city=`, `#scene=`, `#at=`, `#wx=`, `#debug`) and keys.

Stack: TypeScript (strict), Vite, `vite-plugin-singlefile` (the build is one self-contained `dist/index.html`), pnpm.

## Structure (`src/`)

- `main.ts`, `style.css`: entry point and styles (`index.html` at the root)
- `engine/`: indexed framebuffer, palette, WebGL2 post-processing
- `sky/`: cities, clock and astronomy, climate models, live weather, palette grading
- `fx/`: rain, snow, lightning, fireworks and other effects
- `actors/`: pedestrians, animals, cars/motorcycles, trees
- `scenes/`: shared passes, the Esperança prop kit (`br-kit.ts`) and one file per scene
- `audio/`: generative ambience, synthesized SFX and the radio

## Commands

```bash
pnpm install     # install dependencies
pnpm dev         # Vite dev server, http://localhost:5173
pnpm typecheck   # tsc --noEmit
pnpm build       # tsc --noEmit && vite build -> dist/index.html
pnpm shot        # Playwright screenshots into ./shots (needs a build first)
```

**Before opening a PR, run `pnpm typecheck` and `pnpm build`.** There are no tests, lint or CI; do not invent any.

## Project rules

- **No image assets.** Everything is drawn in code into an indexed framebuffer with a palette. Do not add images or sprite files.
- **Weather** comes from Open-Meteo (no API key) and falls back to the simulated climate if the network fails. Keep that fallback working.
- **Music** is streamed from the Internet Archive under Creative Commons licenses. It is not part of the repo or its MIT license; never vendor audio files.
- **Public repo:** never commit secrets, keys or `.env` files (`.env*` is gitignored). `node_modules`, `dist`, `shots` and `.vercel` are also ignored.

## Workflow

- One feature branch per change; open a PR to `main`.
- Merge only when the owner says so.
- The coding agent is Claude Code (not Cursor): Sonnet for docs and simple tasks, Opus for app code.
