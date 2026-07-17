'use strict';

/**
 * Headless rendering smoke test.
 *
 * Boots the real game in headless Chromium, walks Menu -> Game, lets a few
 * seconds of gameplay run with helm input, and screenshots each state into
 * test/screenshots/. Fails on page errors, a missing scene transition, or a
 * blank canvas.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const ROOT = path.join(__dirname, '..');
const SHOTS = path.join(__dirname, 'screenshots');
const PORT = 8127;

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css'
};

/**
 * Find a Chromium binary: explicit override, the preinstalled sandbox copy,
 * or whatever playwright has in its browser cache (CI installs it there via
 * `npx playwright install chromium`).
 */
function resolveChromium() {
  if (process.env.CHROMIUM_PATH) {
    return process.env.CHROMIUM_PATH;
  }
  if (fs.existsSync('/opt/pw-browsers/chromium')) {
    return '/opt/pw-browsers/chromium';
  }
  return chromium.executablePath();
}

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(req.url.split('?')[0]);
      let file = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
      if (!file.startsWith(ROOT)) {
        res.writeHead(403).end();
        return;
      }
      fs.readFile(file, (err, data) => {
        if (err) {
          res.writeHead(404).end('not found: ' + urlPath);
          return;
        }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(PORT, () => resolve(server));
  });
}

async function canvasIsPainted(page) {
  // Use Phaser's snapshot (works with WebGL where reading the live canvas
  // does not) and count distinct sampled colours: a real frame has many.
  return page.evaluate(() => new Promise((resolve) => {
    if (!window.game || !window.game.renderer) {
      resolve({ ok: false, reason: 'no game/renderer' });
      return;
    }
    window.game.renderer.snapshot((img) => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      const colors = new Set();
      for (let i = 0; i < d.length; i += 397 * 4) {
        colors.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
      }
      resolve({ ok: colors.size > 8, reason: `distinct colours sampled: ${colors.size}` });
    });
  }));
}

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  const server = await serve();
  const browser = await chromium.launch({
    executablePath: resolveChromium(),
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') { pageErrors.push(msg.text()); }
  });

  const fail = (msg) => {
    console.error('FAIL:', msg);
    if (pageErrors.length) { console.error('Page errors:', pageErrors); }
    process.exitCode = 1;
  };

  try {
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });

    // 0. splash: shows instantly, waits for a gesture, then boots
    await page.waitForFunction(
      () => window.game && window.game.scene.isActive('Splash'),
      null, { timeout: 15000 }
    );
    let paint = await canvasIsPainted(page);
    console.log('Splash painted:', paint.reason);
    if (!paint.ok) { fail('Splash canvas looks blank'); }
    await page.screenshot({ path: path.join(SHOTS, '0-splash.png') });
    await page.keyboard.press('Space'); // dismiss splash -> Boot -> MainMenu

    // 1. main menu
    await page.waitForFunction(
      () => window.game && window.game.scene.isActive('MainMenu'),
      null, { timeout: 15000 }
    );
    await page.waitForTimeout(800);
    paint = await canvasIsPainted(page);
    console.log('MainMenu painted:', paint.reason);
    if (!paint.ok) { fail('MainMenu canvas looks blank'); }
    await page.screenshot({ path: path.join(SHOTS, '1-menu.png') });

    // 2. start game (menu -> LevelIntro gate -> Game)
    await page.keyboard.press('Enter');
    await page.waitForFunction(
      () => window.game.scene.isActive('LevelIntro'),
      null, { timeout: 10000 }
    );
    await page.keyboard.press('Enter'); // START LEVEL
    await page.waitForFunction(
      () => window.game.scene.isActive('Game'),
      null, { timeout: 10000 }
    );
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SHOTS, '2-game-briefing.png') });

    // 3. play a bit: steam ahead and steer
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(2500);
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(1200);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(2500);
    await page.keyboard.up('ArrowRight');

    paint = await canvasIsPainted(page);
    console.log('Gameplay painted:', paint.reason);
    if (!paint.ok) { fail('Gameplay canvas looks blank'); }
    await page.screenshot({ path: path.join(SHOTS, '3-gameplay.png') });

    // 4. a missile should launch and track the ship
    await page.waitForFunction(() => {
      const s = window.game.scene.getScene('Game');
      return s && s.missiles && s.missiles.length > 0;
    }, null, { timeout: 25000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SHOTS, '4-missile.png') });
    console.log('Missile launched and tracking.');

    // 5. launch a decoy flare
    await page.keyboard.press('Space');
    const flareState = await page.evaluate(() => {
      const s = window.game.scene.getScene('Game');
      return { stock: s.flareStock, burning: s.activeFlares.length };
    });
    console.log('Flare state:', JSON.stringify(flareState));
    if (flareState.stock !== 2 || flareState.burning < 1) {
      fail('decoy flare did not launch');
    }
    await page.screenshot({ path: path.join(SHOTS, '5-flare.png') });

    const state = await page.evaluate(() => {
      const s = window.game.scene.getScene('Game');
      const alive = s && s.ship && s.ship.active;
      return {
        activeScene: window.game.scene.getScenes(true).map((sc) => sc.scene.key),
        shipX: alive ? Math.round(s.ship.x) : -1,
        shipY: alive ? Math.round(s.ship.y) : -1,
        hull: s ? s.hull : -1,
        mines: s && s.mines ? s.mines.filter((m) => m.active).length : 0,
        missiles: s && s.missiles ? s.missiles.length : 0,
        level: s && s.cfg ? s.cfg.id : -1
      };
    });
    console.log('Game state:', JSON.stringify(state));

    if (!state.activeScene.includes('Game') && !state.activeScene.includes('GameOver')) {
      fail('Game scene not active after input');
    }
    if (state.shipX !== -1 && state.shipX <= 230) {
      fail(`ship did not move forward (x=${state.shipX})`);
    }
    if (state.mines < 1 && state.activeScene.includes('Game')) {
      fail('no mines were spawned');
    }

    // 6. settings menu opens, toggles, and persists to localStorage
    await page.evaluate(() => { window.game.scene.stop('Game'); window.game.scene.start('MainMenu'); });
    await page.waitForFunction(() => window.game.scene.isActive('MainMenu'), null, { timeout: 8000 });
    await page.keyboard.press('KeyS');
    await page.waitForFunction(() => window.game.scene.isActive('Settings'), null, { timeout: 8000 });
    const settleKey = async (k) => { await page.keyboard.press(k); await page.waitForTimeout(70); };
    await settleKey('ArrowDown'); // Screen Shake
    await settleKey('ArrowLeft'); // off
    await settleKey('Enter');     // save + back
    const savedSettings = await page.evaluate(() => JSON.parse(localStorage.getItem('hormuz-settings') || 'null'));
    if (!savedSettings || savedSettings.shake !== false) {
      fail(`settings did not persist: ${JSON.stringify(savedSettings)}`);
    } else {
      console.log('Settings persisted:', JSON.stringify(savedSettings));
    }

    // 7. endless mode starts, streams hazards, and shows the distance HUD
    await page.waitForFunction(() => window.game.scene.isActive('MainMenu'), null, { timeout: 8000 });
    await page.keyboard.press('KeyE');
    await page.waitForFunction(() => window.game.scene.isActive('LevelIntro'), null, { timeout: 10000 });
    await page.keyboard.press('Enter'); // BEGIN
    await page.waitForFunction(() => window.game.scene.isActive('Game'), null, { timeout: 15000 });
    const endless = await page.evaluate(() => {
      const s = window.game.scene.getScene('Game');
      return { endless: s.endless, hasDistText: !!s.distText, mines: s.mines.length };
    });
    console.log('Endless mode:', JSON.stringify(endless));
    if (!endless.endless || !endless.hasDistText || endless.mines < 1) {
      fail('endless mode did not initialise correctly');
    }
    await page.screenshot({ path: path.join(SHOTS, '6-endless.png') });

    if (pageErrors.length) {
      fail('page errors were logged');
    } else if (process.exitCode !== 1) {
      console.log('PASS: menu + gameplay render, ship responds to input.');
    }
  } catch (err) {
    fail(err.message);
    try {
      await page.screenshot({ path: path.join(SHOTS, 'error.png') });
    } catch (_) { /* ignore */ }
  } finally {
    await browser.close();
    server.close();
  }
}

main();
