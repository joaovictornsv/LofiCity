# AGENTS.md

## Purpose

LofiCity is a lo-fi pixel-art web app: scenes for several cities (Esperança, Campina Grande, João Pessoa, Areia, Remígio, Tokyo) that follow each city's real clock and live weather, plus two radio stations. `README.md` is a short pt-BR overview with screenshots (`public/screens/`); the full reference (cities, scenes, URL options `#city=`, `#scene=`, `#at=`, `#wx=`, `#debug`, keys, sharing, credits) is `docs/DEVELOPING.md`. Scene lists, `#scene=` ids and reference-photo credits go there.

Stack: TypeScript (strict), Vite, `vite-plugin-singlefile` (the build is one self-contained `dist/index.html`), pnpm.

## Structure (`src/`)

- `main.ts`, `style.css`: entry point and styles (`index.html` at the root)
- `share.ts`, `share-rules.ts`: permalink hash, copy link and the 1080x1920 story card (local only, never posts)
- `engine/`: indexed framebuffer, palette, WebGL2 post-processing
- `sky/`: cities, clock and astronomy, live weather, palette grading
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
pnpm shot        # Playwright screenshots into ./shots (needs a build first; --hud-off hides the panels)
pnpm test        # node --test on test/*.test.ts (Node >= 22.18 strips types; no test deps)
```

**Before opening a PR, run `pnpm typecheck`, `pnpm build` and `pnpm test`.** The only tests are the unit tests in `test/` for pure logic (currently the bell schedule and its timer, the weather live / stale / unavailable rules, the daily rhythm in `src/sky/rhythm.ts`, the street and depth-traffic rules in `src/actors/street-rules.ts` and `persp-rules.ts` including queue spacing at crossings, the one-way road at Praça da Matriz in `src/actors/matriz-road.ts` (vehicles only go away from the viewer and yield at the zebra), the rain reactions (umbrellas, shelters) in `src/actors/rain-rules.ts`, the traffic-light phases, yellow stop/go and pedestrian phase in `src/actors/signal-rules.ts`, the speech-bubble phrase choice (place, hour, real-weather-only lines, no repeats), placement and lifetime in `src/actors/speech-rules.ts` (pool in `src/actors/phrases.ts`), the ambient life events in `src/actors/ambient-rules.ts` (rare, one at a time per scene, seeded by scene + time slot, only the dog at madrugada, scene exclusions incl. Capelinha and Matriz, fair-weather events blocked by real rain or unknown weather, sound cue only with ambience on, audio unlocked and radio off), the share permalink hash, copied link (no `#debug`/`#wx=`/`#car=`) and card file name in `src/share-rules.ts`, the Campo da Rodoviária match schedule (a match every 1h30 from 08:00 to 21:00), kit colour rotation and the match simulation (players stay on the turf, goals, rain pause) in `src/scenes/campo-matches.ts`, and a source-level check of the scene list); test modules must import nothing from the DOM. There is no lint or CI; do not invent any.

## Project rules

- **No image assets.** Everything is drawn in code into an indexed framebuffer with a palette. Do not add images or sprite files (exceptions: the approved app icons and manifest in `public/`, and the README screenshots in `public/screens/`, which are real captures from `pnpm shot` and are never used by the app).
- **Weather** comes only from Open-Meteo (no API key). Never simulate or randomize weather: when a fetch fails, show the last real reading for that city marked stale, or "clima indisponível" over a neutral sky (rules in `src/sky/weather-feed.ts`, tested in `test/weather-feed.test.ts`). `#wx=` is a test override and must stay labelled as one.
- **Music** is streamed from the Internet Archive under Creative Commons licenses. It is not part of the repo or its MIT license; never vendor audio files.
- **Sharing** only copies a link or saves a PNG locally; never post, message or upload on the user's behalf.
- **Public repo:** never commit secrets, keys or `.env` files (`.env*` is gitignored). `node_modules`, `dist`, `shots` and `.vercel` are also ignored.

## Working economically

- Plan related changes together and land them in one batch; read the targeted files and diffs, not the whole repo, on every task.
- Reuse context already gathered in the session when it is still valid; keep output and logs short (tail failures only).
- No repeated status polling, and no re-running full checks for code that has not changed since the last green run.
- While working, run only the tests you touched (`node --test test/<file>.test.ts`) plus `pnpm typecheck`; run the full `pnpm typecheck`, `pnpm test` and `pnpm build` (plus the essential visual checks with `pnpm shot`) once before merge.
- After the same failure twice, stop and report what failed instead of retrying.
- Claude Code runs Opus at `--effort medium` (not high).
- Economy never overrides the rules above: security, review, the API-only weather and the no-assets rules stay as they are.

## Workflow

- One feature branch per change; open a PR to `main`.
- Merge only when the owner says so.
- **Never force push** (`git push --force`, `--force-with-lease`, `+refspec`) to any branch, including your own feature branches. It is forbidden. To bring a branch up to date, merge `main` into it and push normally; if history really has to be rewritten, stop and ask the owner.
- The coding agent is Claude Code (not Cursor): Sonnet for docs and simple tasks, Opus for app code.
