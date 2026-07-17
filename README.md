# Hormuz Escape

A 2D physics-based side-scroller. You are the master of a loaded oil tanker
running the Strait of Hormuz, left to right, through five increasingly hostile
legs — drifting naval mines, shore-launched homing missiles, narrowing
channels, and water currents that shove your heavy hull off course.

Everything is procedural: all graphics are generated at boot from Phaser
primitives, and all sound is synthesized live with the Web Audio API. There
are no image or audio assets.

By M7rgy. MIT licensed.

## Controls

| Key | Action |
| --- | --- |
| Arrow keys / WASD | Helm and throttle |
| Space | Launch decoy flare (in game) / start (in menu) |
| P / Esc | Pause |
| Enter | Start campaign |
| E | Start endless gauntlet (from menu) |
| S | Settings (from menu) |
| M | Mute |

Gamepads are supported: left stick or d-pad steers, A launches a flare,
Start pauses.

**Touch devices** (phones/tablets): on-screen controls appear automatically —
a thumb-stick on the left half of the screen steers (touch anywhere in that
zone), a **FLARE** button is bottom-right, and a pause button (**II**) is
bottom-centre. All menus are tappable. The game is landscape; in portrait it
shows a "rotate your device" prompt.

The tanker is heavy: it accelerates slowly, keeps its momentum, and reversing
is weaker than steaming ahead. Touching the rocky shorelines scrapes the hull;
mines and missiles do serious damage. Reach the green buoy line to clear a
level. The hull is partially patched (+25) between legs.

You carry a limited stock of decoy flares — launch one and any missile whose
seeker picks it up chases the flare and detonates on it. Floating supply
buoys drift in the channel: white crates repair +20 hull, orange canisters
add +2 flares (max 6). A missile that detonates close by without connecting
scores a +50 close-call bonus, and clearing a leg without a scratch is +200.

## Modes and enemies

- **Campaign** — five hand-tuned legs of the Strait. Beyond the mines and
  homing missiles, later legs add **patrol gunboats** that fire aimed shells
  and **strafing jets** that drop bomb sticks. The final leg is guarded by a
  **blockade destroyer** that saturates the channel with missiles and cannon
  fire — thread past it to reach open ocean.
- **Endless Gauntlet** (menu: **E**) — a single unbroken run with no hull
  repairs between waves and steadily thickening missile volleys. Score climbs
  with distance survived. See how far you get.

The top five runs are saved locally and shown on the menu and end screens.
**Settings** (menu: **S**) lets you set master volume and toggle screen shake
and the ambient music pad; choices persist between sessions.

## Tech stack

- **Node.js** + **Phaser 3** (arcade physics, procedural textures)
- **Electron** desktop wrapper (`electron/main.js`)
- **Web Audio API** synthesizer (`src/audio/SoundSynth.js`): diesel engine
  rumble, missile lock-on beeps, white-noise explosions, cannon reports, and
  an ambient minor-key music pad

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

The app icon is generated procedurally (no image editor needed) into
`build/icon.ico` / `build/icon.png`; regenerate after tweaking the artwork
in `tools/make-icon.js`:

```bash
npm run icon
```

### Automated releases

`.github/workflows/release.yml` builds Windows, Linux, and macOS binaries in
parallel and attaches them to a **draft** GitHub Release. To cut a release,
tag a commit and push the tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

(You can also trigger it manually from the Actions tab.) When the run
finishes, open the draft release under **Releases**, review it, and publish.
The builds are unsigned, so direct downloaders will see an "unknown
publisher" prompt until a code-signing certificate is configured.

## Play in the browser / itch.io

The game runs unmodified in a browser, so it can be published on
[itch.io](https://itch.io) as an **HTML5 game** — no download, players hit
"Run game" and play in the page. Build the upload bundle:

```bash
npm run web        # -> dist-web/hormuz-escape-web.zip
```

Then on itch.io:

1. **Dashboard → Create new project.**
2. Set **Kind of project** to **HTML**.
3. Under **Uploads**, upload `dist-web/hormuz-escape-web.zip` and tick
   **"This file will be played in the browser."** (The zip has `index.html`
   at its root, which itch.io requires.)
4. Set **Embed options → Viewport dimensions** to **1280 × 720**, enable the
   **fullscreen button**, and tick **"Mobile friendly"** (orientation:
   default) — the game has touch controls and scales to fit any screen.
5. Add a title, description, and a screenshot or two, set pricing (free or
   pay-what-you-want), then **Save & view page** and publish.

To also offer a downloadable desktop version on the same page, upload the
Windows/macOS/Linux binaries from a `npm run dist` build (or a GitHub
release) as additional, non-browser files.

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
  main.js                  Electron main process (window + Steam bootstrap + IPC)
  preload.js               Context-isolated bridge (window.steamAPI)
  steamworks.config.json   Placeholder Steamworks integration config
src/
  game.js                  Phaser game config / entry point
  config/levels.js         The 5-level array + endless config
  audio/SoundSynth.js      Web Audio sound synthesizer
  gfx/Textures.js          Procedural texture generation
  ui/TouchControls.js      On-screen touch controls + tappable button helper
  util/Storage.js          localStorage settings + high scores, Steam helper
  scenes/                  Splash, Boot, MainMenu, Settings, Game, Pause, GameOver, Victory
index.html                 Renderer entry page
tools/make-icon.js         Procedural app-icon generator (build/icon.ico|png)
tools/make-web.js          Assembles the itch.io HTML5 bundle (dist-web/)
test/render-check.js       Headless rendering smoke test
.github/workflows/ci.yml       CI: render smoke test on every push
.github/workflows/release.yml  CI: build + attach binaries on version tags
```

## Steam

`electron/steamworks.config.json` is a placeholder. To wire up Steamworks:
set your real App ID, flip `enabled` to `true`, `npm install steamworks.js`,
and drop a `steam_appid.txt` in the project root for local testing.

The integration is already scaffolded end to end: `electron/main.js`
initialises the Steamworks client and listens for achievement unlocks over
IPC, `electron/preload.js` exposes a safe `window.steamAPI` to the game, and
the game fires achievements through it (`steamAchievement()` in
`src/util/Storage.js`) at natural moments — first leg cleared, full transit,
and a no-damage leg. All of it is a silent no-op when Steam isn't present, so
the game runs identically off-Steam (browser or bare Electron). Fill in the
matching achievement IDs in the Steamworks partner backend to light them up.
