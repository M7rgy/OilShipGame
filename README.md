# Hormuz Escape

A 2D physics-based side-scroller. You are the master of a loaded oil tanker
running the Strait of Hormuz, left to right, through five increasingly hostile
legs — drifting naval mines, shore-launched homing missiles, narrowing
channels, and water currents that shove your heavy hull off course.

Everything is procedural: all graphics are generated at boot from Phaser
primitives, and all sound is synthesized live with the Web Audio API. There
are no image or audio assets.

## Controls

| Key | Action |
| --- | --- |
| Arrow keys / WASD | Helm and throttle |
| Space | Launch decoy flare (in game) / start (in menu) |
| P / Esc | Pause |
| Enter | Start / confirm |
| M | Mute |

Gamepads are supported: left stick or d-pad steers, A launches a flare,
Start pauses.

The tanker is heavy: it accelerates slowly, keeps its momentum, and reversing
is weaker than steaming ahead. Touching the rocky shorelines scrapes the hull;
mines and missiles do serious damage. Reach the green buoy line to clear a
level. The hull is partially patched (+25) between legs.

You carry a limited stock of decoy flares — launch one and any missile whose
seeker picks it up chases the flare and detonates on it. Floating supply
buoys drift in the channel: white crates repair +20 hull, orange canisters
add +2 flares (max 6). A missile that detonates close by without connecting
scores a +50 close-call bonus.

## Tech stack

- **Node.js** + **Phaser 3** (arcade physics, procedural textures)
- **Electron** desktop wrapper (`electron/main.js`)
- **Web Audio API** synthesizer (`src/audio/SoundSynth.js`): diesel engine
  rumble, missile lock-on beeps, white-noise explosions

## Run it

```bash
npm install
npm start          # launches the Electron desktop window
```

You can also open `index.html` with any static file server for a quick
browser check (script paths resolve against `node_modules/`):

```bash
npx http-server -p 8080 .    # then visit http://localhost:8080
```

## Desktop builds

```bash
npm run dist          # package for the current platform (output in dist/)
npm run dist:win      # Windows NSIS installer + portable exe
npm run dist:linux    # Linux AppImage
npm run dist:mac      # macOS dmg
```

Packaging is handled by electron-builder using the `build` section of
package.json. Cross-compiling Windows builds from Linux/macOS generally
works; macOS builds must be made on macOS.

## Rendering smoke test

A headless-Chromium check that boots the real game, plays through menu →
gameplay, and screenshots each state:

```bash
npm run test:render
```

Screenshots land in `test/screenshots/`. The same test runs in GitHub
Actions on every push (`.github/workflows/ci.yml`).

## Project layout

```
electron/
  main.js                  Electron main process (window + Steam bootstrap)
  steamworks.config.json   Placeholder Steamworks integration config
src/
  game.js                  Phaser game config / entry point
  config/levels.js         The 5-level difficulty array
  audio/SoundSynth.js      Web Audio sound synthesizer
  gfx/Textures.js          Procedural texture generation
  scenes/                  Boot, MainMenu, Game, Pause, GameOver, Victory
index.html                 Renderer entry page
test/render-check.js       Headless rendering smoke test
.github/workflows/ci.yml   CI: render smoke test on every push
```

## Steam

`electron/steamworks.config.json` is a placeholder. To wire up Steamworks:
set your real App ID, flip `enabled` to `true`, `npm install steamworks.js`,
and drop a `steam_appid.txt` in the project root for local testing. The
bootstrap hook already lives in `electron/main.js`.
