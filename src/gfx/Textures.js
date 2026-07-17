'use strict';

/**
 * Textures — all game art is generated at boot time from Phaser Graphics
 * primitives. No image assets are loaded from disk.
 */
const Textures = {
  /** Generate every texture the game needs. Called once from BootScene. */
  createAll(scene) {
    this.ship(scene);
    this.radar(scene);
    this.mine(scene);
    this.missile(scene);
    this.particles(scene);
    this.water(scene);
    this.coastlines(scene);
  },

  _g(scene) {
    return scene.make.graphics({ x: 0, y: 0, add: false });
  },

  /**
   * Draw a vertical gradient as horizontal bands. Works on both renderers
   * (Graphics.fillGradientStyle is WebGL-only).
   */
  verticalGradient(g, x, y, w, h, topColor, bottomColor, steps = 32) {
    const top = Phaser.Display.Color.IntegerToColor(topColor);
    const bot = Phaser.Display.Color.IntegerToColor(bottomColor);
    const bandH = h / steps;
    for (let i = 0; i < steps; i++) {
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(top, bot, steps - 1, i);
      g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
      g.fillRect(x, y + i * bandH, w, bandH + 1);
    }
  },

  _shade(colorInt, amount) {
    // amount > 0 lightens, < 0 darkens (percent)
    const c = Phaser.Display.Color.IntegerToColor(colorInt);
    if (amount >= 0) {
      c.lighten(amount);
    } else {
      c.darken(-amount);
    }
    return c.color;
  },

  // ------------------------------------------------------------------- ship

  /**
   * Side view of a loaded oil tanker, bow pointing right.
   * 240x88. Hull, deck pipework, tank domes, aft superstructure, funnel.
   */
  ship(scene) {
    const g = this._g(scene);

    // hull: main body with raked bow
    g.fillStyle(0x8a2f2b, 1); // rust red below waterline band
    g.fillRect(10, 58, 200, 16);
    g.fillStyle(0x3d4854, 1); // steel grey hull
    g.beginPath();
    g.moveTo(4, 58);
    g.lineTo(226, 58);
    g.lineTo(238, 44);
    g.lineTo(232, 40);
    g.lineTo(10, 40);
    g.lineTo(4, 50);
    g.closePath();
    g.fillPath();

    // waterline stripe
    g.fillStyle(0xc7cdd4, 1);
    g.fillRect(8, 56, 210, 3);

    // deck
    g.fillStyle(0x55616e, 1);
    g.fillRect(10, 38, 222, 4);

    // oil tank domes along the deck
    g.fillStyle(0x9aa5ae, 1);
    for (let i = 0; i < 5; i++) {
      g.fillCircle(38 + i * 34, 38, 9);
    }
    g.fillStyle(0xb8c2ca, 1);
    for (let i = 0; i < 5; i++) {
      g.fillCircle(35 + i * 34, 35, 3); // highlight
    }

    // deck pipework
    g.lineStyle(3, 0x77828c, 1);
    g.lineBetween(20, 34, 200, 34);
    g.lineStyle(2, 0x8d979f, 1);
    g.lineBetween(20, 30, 200, 30);
    g.lineStyle(2, 0x6a747d, 1);
    for (let i = 0; i < 6; i++) {
      g.lineBetween(30 + i * 32, 30, 30 + i * 32, 40);
    }

    // aft superstructure (bridge) — ships steam bow-first, bridge at stern
    g.fillStyle(0xd8dde2, 1);
    g.fillRect(18, 6, 34, 34);
    g.fillStyle(0xbfc7cd, 1);
    g.fillRect(14, 20, 42, 20);
    // bridge windows
    g.fillStyle(0x14344c, 1);
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 4; c++) {
        g.fillRect(20 + c * 8, 10 + r * 8, 5, 4);
      }
    }
    // funnel with stripe
    g.fillStyle(0x2e353c, 1);
    g.fillRect(24, -6, 14, 14);
    g.fillStyle(0xc94b3f, 1);
    g.fillRect(24, -2, 14, 5);

    // bow rail + anchor
    g.fillStyle(0x2c343c, 1);
    g.fillCircle(224, 50, 3);
    g.lineStyle(2, 0x77828c, 1);
    g.lineBetween(210, 38, 236, 42);

    g.generateTexture('ship', 240, 92);
    g.destroy();
  },

  /** Rotating radar bar mounted on the bridge mast. */
  radar(scene) {
    const g = this._g(scene);
    g.fillStyle(0xe8edf0, 1);
    g.fillRect(0, 5, 28, 4); // bar
    g.fillStyle(0xaab4bc, 1);
    g.fillCircle(14, 7, 3); // hub
    g.generateTexture('radar', 28, 14);
    g.destroy();
  },

  // ------------------------------------------------------------------- mine

  /** Naval contact mine: dark sphere with detonation horns + red glow layer. */
  mine(scene) {
    const g = this._g(scene);
    const cx = 28;
    const cy = 28;

    // detonation horns
    g.fillStyle(0x4a4038, 1);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const x1 = cx + Math.cos(a) * 16;
      const y1 = cy + Math.sin(a) * 16;
      const x2 = cx + Math.cos(a) * 26;
      const y2 = cy + Math.sin(a) * 26;
      const px = Math.cos(a + Math.PI / 2) * 3;
      const py = Math.sin(a + Math.PI / 2) * 3;
      g.beginPath();
      g.moveTo(x1 + px, y1 + py);
      g.lineTo(x1 - px, y1 - py);
      g.lineTo(x2, y2);
      g.closePath();
      g.fillPath();
      g.fillCircle(x2, y2, 2.4); // horn tip
    }

    // body
    g.fillStyle(0x23282e, 1);
    g.fillCircle(cx, cy, 18);
    g.fillStyle(0x394049, 1);
    g.fillCircle(cx - 5, cy - 5, 12); // sheen
    g.fillStyle(0x191d22, 1);
    g.fillCircle(cx + 6, cy + 6, 9); // shadow

    // central detonator light (tinted/pulsed at runtime)
    g.fillStyle(0xff2222, 1);
    g.fillCircle(cx, cy, 5);
    g.fillStyle(0xff9a9a, 1);
    g.fillCircle(cx - 1.5, cy - 1.5, 2);

    g.generateTexture('mine', 56, 56);
    g.destroy();

    // soft red radial glow, pulsed behind the mine
    const glow = this._g(scene);
    for (let r = 30; r > 2; r -= 2) {
      glow.fillStyle(0xff3030, 0.028 * (30 - r) / 2 + 0.02);
      glow.fillCircle(32, 32, r);
    }
    glow.generateTexture('mineGlow', 64, 64);
    glow.destroy();
  },

  // ---------------------------------------------------------------- missile

  /** Sleek anti-ship missile, nose pointing right, with engine glow. */
  missile(scene) {
    const g = this._g(scene);

    // exhaust glow
    for (let r = 9; r > 2; r--) {
      g.fillStyle(0xffb347, 0.10);
      g.fillCircle(9, 10, r);
    }
    g.fillStyle(0xfff2c0, 0.9);
    g.fillCircle(9, 10, 3);

    // body
    g.fillStyle(0x9fb2bd, 1);
    g.fillRect(12, 6, 34, 8);
    // nose cone
    g.fillStyle(0xd7e2e8, 1);
    g.beginPath();
    g.moveTo(46, 6);
    g.lineTo(56, 10);
    g.lineTo(46, 14);
    g.closePath();
    g.fillPath();
    // canards + tail fins
    g.fillStyle(0x7c8d98, 1);
    g.beginPath(); g.moveTo(14, 6); g.lineTo(20, 6); g.lineTo(14, 0); g.closePath(); g.fillPath();
    g.beginPath(); g.moveTo(14, 14); g.lineTo(20, 14); g.lineTo(14, 20); g.closePath(); g.fillPath();
    g.beginPath(); g.moveTo(38, 6); g.lineTo(43, 6); g.lineTo(40, 2); g.closePath(); g.fillPath();
    g.beginPath(); g.moveTo(38, 14); g.lineTo(43, 14); g.lineTo(40, 18); g.closePath(); g.fillPath();
    // warning band + seeker window
    g.fillStyle(0xc94b3f, 1);
    g.fillRect(43, 6, 3, 8);
    g.fillStyle(0x18424f, 1);
    g.fillRect(30, 8, 6, 4);

    g.generateTexture('missile', 58, 20);
    g.destroy();
  },

  // -------------------------------------------------------------- particles

  particles(scene) {
    // smoke puff
    const smoke = this._g(scene);
    for (let r = 12; r > 2; r -= 2) {
      smoke.fillStyle(0xcccccc, 0.10);
      smoke.fillCircle(14, 14, r);
    }
    smoke.generateTexture('smoke', 28, 28);
    smoke.destroy();

    // white-hot flare (explosions, missile glow)
    const flare = this._g(scene);
    for (let r = 16; r > 1; r -= 1) {
      flare.fillStyle(0xffffff, 0.07);
      flare.fillCircle(16, 16, r);
    }
    flare.generateTexture('flare', 32, 32);
    flare.destroy();

    // spark
    const spark = this._g(scene);
    spark.fillStyle(0xffd27a, 1);
    spark.fillCircle(3, 3, 3);
    spark.generateTexture('spark', 6, 6);
    spark.destroy();

    // foam fleck for the propeller wash / bow wake
    const foam = this._g(scene);
    foam.fillStyle(0xeaf6fb, 1);
    foam.fillCircle(3, 3, 2.4);
    foam.generateTexture('foam', 6, 6);
    foam.destroy();

    // repair kit: floating white crate with a green cross
    const kit = this._g(scene);
    kit.fillStyle(0x11324a, 1);
    kit.fillRoundedRect(1, 5, 30, 24, 4); // buoy ring
    kit.fillStyle(0xe8eef2, 1);
    kit.fillRoundedRect(4, 8, 24, 18, 3);
    kit.fillStyle(0x2fae5f, 1);
    kit.fillRect(13, 10, 6, 14);
    kit.fillRect(9, 14, 14, 6);
    kit.generateTexture('repairKit', 32, 34);
    kit.destroy();

    // flare resupply: orange canister with warning stripes
    const fk = this._g(scene);
    fk.fillStyle(0x11324a, 1);
    fk.fillRoundedRect(3, 4, 26, 26, 4);
    fk.fillStyle(0xe07b2f, 1);
    fk.fillRoundedRect(6, 7, 20, 20, 3);
    fk.fillStyle(0xf4e9d8, 1);
    fk.fillRect(6, 12, 20, 4);
    fk.fillRect(6, 20, 20, 4);
    fk.fillStyle(0xffd27a, 1);
    fk.fillCircle(16, 7, 3); // igniter cap
    fk.generateTexture('flareKit', 32, 34);
    fk.destroy();
  },

  // ------------------------------------------------------------------ water

  /**
   * Deep-water tiles: layered wave streaks + speckle. One tile is baked per
   * level palette (runtime tint is WebGL-only, so colours are baked in).
   */
  water(scene) {
    const size = 256;
    for (const cfg of LEVELS) {
      this._waterTile(scene, `water${cfg.id}`, cfg.waterTint, size);
    }

    // faint large-scale caustic overlay tile for a second parallax water layer
    const g2 = this._g(scene);
    g2.fillStyle(0x000000, 0); // transparent base
    g2.fillRect(0, 0, size, size);
    const rnd2 = new Phaser.Math.RandomDataGenerator(['hormuz-caustics']);
    for (let i = 0; i < 18; i++) {
      const y = rnd2.between(0, size);
      const x = rnd2.between(0, size);
      const w = rnd2.between(30, 90);
      g2.lineStyle(2, 0xffffff, 0.10);
      for (const ox of [-size, 0, size]) {
        for (const oy of [-size, 0, size]) {
          g2.beginPath();
          g2.moveTo(x + ox, y + oy);
          g2.lineTo(x + ox + w * 0.4, y + oy - 4);
          g2.lineTo(x + ox + w, y + oy);
          g2.strokePath();
        }
      }
    }
    g2.generateTexture('waterOverlay', size, size);
    g2.destroy();
  },

  _waterTile(scene, key, baseColor, size) {
    const g = this._g(scene);
    g.fillStyle(baseColor, 1);
    g.fillRect(0, 0, size, size);

    const darker = this._shade(baseColor, -22);
    const lighter = this._shade(baseColor, 16);
    const rnd = new Phaser.Math.RandomDataGenerator(['hormuz-water']);
    // draw every shape at all 9 wrap offsets so the tile repeats seamlessly
    const wrapped = (x, y, draw) => {
      for (const ox of [-size, 0, size]) {
        for (const oy of [-size, 0, size]) {
          draw(x + ox, y + oy);
        }
      }
    };

    // broad darker swells
    for (let i = 0; i < 26; i++) {
      const w = rnd.between(50, 130);
      const h = rnd.between(6, 14);
      g.fillStyle(darker, 0.55);
      wrapped(rnd.between(0, size), rnd.between(0, size), (x, y) => g.fillEllipse(x, y, w, h));
    }
    // brighter wave crests
    for (let i = 0; i < 34; i++) {
      const w = rnd.between(24, 80);
      const h = rnd.between(2, 5);
      g.fillStyle(lighter, 0.65);
      wrapped(rnd.between(0, size), rnd.between(0, size), (x, y) => g.fillEllipse(x, y, w, h));
    }
    // fine speckle
    for (let i = 0; i < 120; i++) {
      const r = rnd.between(1, 2);
      g.fillStyle(lighter, 0.45);
      wrapped(rnd.between(0, size), rnd.between(0, size), (x, y) => g.fillCircle(x, y, r));
    }
    g.generateTexture(key, size, size);
    g.destroy();
  },

  // -------------------------------------------------------------- coastline

  /**
   * Rocky coastline silhouette tiles for parallax scrolling. Colours are
   * baked in, and each ridge also gets a pre-flipped variant for the top
   * shore (runtime tint/flip on TileSprites is WebGL-only).
   */
  coastlines(scene) {
    this._ridge(scene, 'rocksFar', 512, 200, ['hormuz-far'], 6, 0x53718c, false);
    this._ridge(scene, 'rocksFarFlip', 512, 200, ['hormuz-far'], 6, 0x53718c, true);
    this._ridge(scene, 'rocksNear', 512, 260, ['hormuz-near'], 10, 0x223648, false);
    this._ridge(scene, 'rocksNearFlip', 512, 260, ['hormuz-near-top'], 10, 0x2b3f52, true);
  },

  /**
   * Jagged mountain ridge tile whose left and right edges line up so a
   * TileSprite can repeat it seamlessly. `flip` bakes an upside-down copy
   * (rocks hanging from the top of the screen).
   */
  _ridge(scene, key, w, h, seed, roughness, baseColor, flip) {
    const g = this._g(scene);
    const rnd = new Phaser.Math.RandomDataGenerator(seed);
    const Y = (y) => (flip ? h - y : y);

    const steps = 16;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      pts.push(h * 0.35 + rnd.between(-h, h) * 0.02 * roughness + Math.sin(i * 1.7) * h * 0.12);
    }
    pts[steps] = pts[0]; // seamless wrap

    // back ridge (lighter)
    g.fillStyle(this._shade(baseColor, 26), 1);
    g.beginPath();
    g.moveTo(0, Y(h));
    for (let i = 0; i <= steps; i++) {
      g.lineTo((i / steps) * w, Y(pts[i] - 24));
    }
    g.lineTo(w, Y(h));
    g.closePath();
    g.fillPath();

    // front ridge with jagged rock facets
    g.fillStyle(baseColor, 1);
    g.beginPath();
    g.moveTo(0, Y(h));
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * w;
      g.lineTo(x, Y(pts[i]));
      if (i < steps) {
        // jagged sub-peak between control points
        g.lineTo(x + w / steps / 2, Y(pts[i] + rnd.between(-18, 26)));
      }
    }
    g.lineTo(w, Y(h));
    g.closePath();
    g.fillPath();

    // rock facet shading
    g.fillStyle(this._shade(baseColor, -24), 1);
    for (let i = 0; i < steps; i += 2) {
      const x = (i / steps) * w + rnd.between(0, 18);
      const y = pts[i] + rnd.between(6, 30);
      g.beginPath();
      g.moveTo(x, Y(y));
      g.lineTo(x + rnd.between(14, 30), Y(y + rnd.between(10, 24)));
      g.lineTo(x + rnd.between(-6, 8), Y(y + rnd.between(26, 44)));
      g.closePath();
      g.fillPath();
    }

    g.generateTexture(key, w, h);
    g.destroy();
  }
};
