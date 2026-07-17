'use strict';

/**
 * GameScene — one run through a leg of the Strait.
 *
 * The camera scrolls left-to-right with the tanker. The navigable channel is
 * bounded by rocky coastlines top and bottom (they narrow per level). Mines
 * drift in the channel, shore batteries fire homing missiles, and the water
 * current constantly shoves the heavy hull off course.
 */
class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.cfg = LEVELS[this.registry.get('levelIndex')];
    const cfg = this.cfg;

    this.worldWidth = cfg.distance * WORLD_SCALE;
    this.finishX = this.worldWidth - 200;
    this.viewW = this.scale.width;
    this.viewH = this.scale.height;

    this.physics.world.setBounds(0, 40, this.worldWidth, this.viewH - 80);

    this.buildBackdrop();
    this.buildShip();
    this.buildMines();
    this.buildPickups();
    this.buildHud();

    // camera: horizontal follow with the ship sitting left-of-centre so the
    // player can see what is coming
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.viewH);
    this.cameras.main.startFollow(this.ship, false, 1, 1, -this.viewW * 0.18, 0);

    // input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.input.keyboard.on('keydown-M', () => {
      Sound.setMuted(!Sound.muted);
      this.muteText.setText(Sound.muted ? 'MUTED' : '');
    });
    this.input.keyboard.on('keydown-SPACE', () => this.launchFlare());
    const pause = () => this.pauseGame();
    this.input.keyboard.on('keydown-P', pause);
    this.input.keyboard.on('keydown-ESC', pause);
    this.padButtons = { flare: false, pause: false }; // edge detection

    // decoy flares: limited supply, missiles chase them instead of the ship
    this.flareStock = 3;
    this.activeFlares = [];

    // water current state
    this.current = new Phaser.Math.Vector2(0, 0);
    this.currentTarget = new Phaser.Math.Vector2(0, 0);
    this.time.addEvent({
      delay: cfg.currentShift * 1000,
      loop: true,
      callback: () => this.shiftCurrent()
    });
    this.shiftCurrent();

    // missile launches
    this.missiles = [];
    this.time.addEvent({
      delay: cfg.missileEvery * 1000,
      loop: true,
      startAt: cfg.missileEvery * 500, // first launch comes at half interval
      callback: () => this.launchMissile()
    });

    this.gameOverStarted = false;
    this.levelDone = false;

    Sound.init();
    Sound.resume();
    Sound.startEngine();

    this.events.once('shutdown', () => {
      Sound.stopEngine();
      Sound.stopLockOn();
    });

    // level briefing card
    this.showBriefing();
  }

  // ------------------------------------------------------------- construction

  buildBackdrop() {
    const cfg = this.cfg;
    const w = this.viewW;
    const h = this.viewH;

    // sky gradient (fixed to camera)
    const sky = this.add.graphics().setScrollFactor(0).setDepth(-40);
    Textures.verticalGradient(sky, 0, 0, w, h, cfg.skyTop, cfg.skyBottom);

    // full-field water (level-specific baked palette)
    this.waterLayer = this.add.tileSprite(w / 2, h / 2, w, h, `water${cfg.id}`)
      .setScrollFactor(0).setDepth(-30).setAlpha(0.96);
    this.waterOverlay = this.add.tileSprite(w / 2, h / 2, w, h, 'waterOverlay')
      .setScrollFactor(0).setDepth(-29).setAlpha(0.5);

    // distant haze ridges (slowest parallax)
    this.rocksHazeTop = this.add.tileSprite(w / 2, 60, w, 200, 'rocksFarFlip')
      .setScrollFactor(0).setDepth(-24).setAlpha(0.55);
    this.rocksHazeBot = this.add.tileSprite(w / 2, h - 60, w, 200, 'rocksFar')
      .setScrollFactor(0).setDepth(-24).setAlpha(0.55);

    // near coastlines marking the actual passage bounds (faster parallax)
    this.rocksTop = this.add.tileSprite(w / 2, cfg.passageTop - 92, w, 260, 'rocksNearFlip')
      .setScrollFactor(0).setDepth(-10);
    this.rocksBot = this.add.tileSprite(w / 2, cfg.passageBottom + 92, w, 260, 'rocksNear')
      .setScrollFactor(0).setDepth(-10);

    // surf line along the rocks
    this.surfTop = this.add.tileSprite(w / 2, cfg.passageTop + 4, w, 6, 'waterOverlay')
      .setScrollFactor(0).setDepth(-9).setAlpha(0.8);
    this.surfBot = this.add.tileSprite(w / 2, cfg.passageBottom - 4, w, 6, 'waterOverlay')
      .setScrollFactor(0).setDepth(-9).setAlpha(0.8);

    // finish-line buoys
    for (let y = this.cfg.passageTop + 30; y < this.cfg.passageBottom - 10; y += 70) {
      const buoy = this.add.image(this.finishX, y, 'spark').setScale(2.4).setTint(0x37e07a).setDepth(-5);
      this.tweens.add({ targets: buoy, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });
    }
  }

  buildShip() {
    this.ship = this.physics.add.image(220, this.viewH / 2, 'ship');
    this.ship.setScale(0.72);
    this.ship.setDepth(10);
    // generous-but-fair hitbox: hull only, not the mast tips
    this.ship.body.setSize(210, 46);
    this.ship.body.setOffset(14, 36);
    this.ship.setCollideWorldBounds(true);

    // heavy-tanker physics: slow to accelerate, slow to stop
    this.ship.setDamping(true);
    this.ship.setDrag(0.45);
    this.ship.setMaxVelocity(255, 185);

    this.hull = this.registry.get('hull');
    this.invulnUntil = 0;

    // rotating radar on the bridge
    this.radar = this.add.image(0, 0, 'radar').setScale(0.72).setDepth(11);

    // propeller wash + bow wake
    this.washEmitter = this.add.particles(0, 0, 'foam', {
      speedX: { min: -90, max: -40 },
      speedY: { min: -18, max: 18 },
      scale: { start: 1.4, end: 0 },
      alpha: { start: 0.9, end: 0 },
      lifespan: 700,
      frequency: 45,
      quantity: 2
    }).setDepth(9);
    this.washEmitter.startFollow(this.ship, -92, 14);

    // funnel smoke
    this.funnelEmitter = this.add.particles(0, 0, 'smoke', {
      speedX: { min: -30, max: -12 },
      speedY: { min: -26, max: -10 },
      scale: { start: 0.5, end: 1.6 },
      alpha: { start: 0.35, end: 0 },
      lifespan: 1600,
      frequency: 120
    }).setDepth(8);
    this.funnelEmitter.startFollow(this.ship, -62, -40);
  }

  buildMines() {
    const cfg = this.cfg;
    this.mines = [];
    const rnd = new Phaser.Math.RandomDataGenerator([`level-${cfg.id}`]);

    for (let x = 900; x < this.finishX - 300; x += cfg.mineEvery + rnd.between(-80, 80)) {
      if (rnd.frac() > cfg.mineChance) {
        continue;
      }
      const slots = rnd.frac() < 0.3 ? 2 : 1; // occasional double mine
      for (let s = 0; s < slots; s++) {
        const y = rnd.between(cfg.passageTop + 50, cfg.passageBottom - 50);
        this.spawnMine(x + s * 60, y);
      }
    }
  }

  spawnMine(x, y) {
    const glow = this.add.image(x, y, 'mineGlow').setDepth(4).setScale(1.2);
    const mine = this.physics.add.image(x, y, 'mine').setDepth(5);
    mine.body.setCircle(20, 8, 8);
    mine.body.setAllowGravity(false);
    mine.setImmovable(true);
    mine.glow = glow;
    mine.baseY = y;
    mine.bobSeed = Math.random() * Math.PI * 2;

    // red pulsing
    this.tweens.add({
      targets: glow,
      scale: 2.1,
      alpha: 0.25,
      duration: 650 + Math.random() * 250,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.physics.add.overlap(this.ship, mine, () => this.hitMine(mine));
    this.mines.push(mine);
  }

  buildPickups() {
    const cfg = this.cfg;
    this.pickups = [];
    const rnd = new Phaser.Math.RandomDataGenerator([`pickups-${cfg.id}`]);

    for (let x = 1600; x < this.finishX - 500; x += 1400 + rnd.between(-200, 300)) {
      if (rnd.frac() > 0.65) {
        continue;
      }
      const key = rnd.frac() < 0.55 ? 'repairKit' : 'flareKit';
      const y = rnd.between(cfg.passageTop + 60, cfg.passageBottom - 60);
      const kit = this.physics.add.image(x, y, key).setDepth(5);
      kit.kind = key;
      kit.body.setAllowGravity(false);
      kit.setImmovable(true);
      kit.baseY = y;
      kit.bobSeed = Math.random() * Math.PI * 2;
      this.tweens.add({
        targets: kit, angle: 6, duration: 1200 + Math.random() * 400,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
      this.physics.add.overlap(this.ship, kit, () => this.collectPickup(kit));
      this.pickups.push(kit);
    }
  }

  collectPickup(kit) {
    if (!kit.active || this.gameOverStarted) {
      return;
    }
    Sound.pickup();
    if (kit.kind === 'repairKit') {
      this.hull = Math.min(100, this.hull + 20);
      this.registry.set('hull', this.hull);
      this.updateHullBar();
      this.floatText(kit.x, kit.y - 30, '+20 HULL', '#37e07a');
    } else {
      this.flareStock = Math.min(6, this.flareStock + 2);
      this.updateFlareHud();
      this.floatText(kit.x, kit.y - 30, '+2 FLARES', '#ffd27a');
    }
    this.add.particles(kit.x, kit.y, 'spark', {
      speed: { min: 40, max: 140 }, scale: { start: 1.2, end: 0 },
      lifespan: 500, quantity: 10, stopAfter: 10
    }).setDepth(15);
    kit.destroy();
  }

  launchFlare() {
    if (this.gameOverStarted || this.levelDone || this.flareStock <= 0) {
      return;
    }
    this.flareStock--;
    this.updateFlareHud();
    Sound.flareLaunch();

    // fired up and back from the stern, then drifts and burns out
    const flare = this.physics.add.image(this.ship.x - 40, this.ship.y - 20, 'flare')
      .setDepth(12).setTint(0xffb347).setBlendMode(Phaser.BlendModes.ADD).setScale(1.4);
    flare.body.setAllowGravity(false);
    flare.setVelocity(this.ship.body.velocity.x - 140, -120);
    flare.setDrag(60, 40);
    flare.bornAt = this.time.now;

    flare.sparkler = this.add.particles(0, 0, 'spark', {
      speed: { min: 10, max: 60 },
      scale: { start: 1.1, end: 0 },
      tint: [0xffd27a, 0xff7733],
      lifespan: 450,
      frequency: 30
    }).setDepth(11);
    flare.sparkler.startFollow(flare);

    this.tweens.add({
      targets: flare, scale: 2.2, duration: 350, yoyo: true, repeat: -1
    });
    this.activeFlares.push(flare);
  }

  killFlare(flare) {
    flare.sparkler.stopFollow();
    flare.sparkler.stop();
    const sparkler = flare.sparkler;
    this.time.delayedCall(600, () => sparkler.destroy());
    flare.destroy();
  }

  pauseGame() {
    if (this.gameOverStarted || this.levelDone || this.scene.isPaused()) {
      return;
    }
    Sound.stopLockOn();
    Sound.setEngineThrottle(0);
    this.scene.launch('Pause');
    this.scene.pause();
  }

  floatText(x, y, str, color) {
    const t = this.add.text(x, y, str, {
      fontFamily: 'monospace', fontSize: '18px', color, stroke: '#04121f', strokeThickness: 4
    }).setOrigin(0.5).setDepth(60);
    this.tweens.add({
      targets: t, y: y - 46, alpha: 0, duration: 1100,
      ease: 'Cubic.easeOut', onComplete: () => t.destroy()
    });
  }

  launchMissile() {
    if (this.gameOverStarted || this.levelDone) {
      return;
    }
    const cfg = this.cfg;
    const cam = this.cameras.main;
    // launch from just off the right edge, biased toward the shorelines
    const fromTop = Math.random() < 0.5;
    const x = cam.scrollX + this.viewW + 60;
    const y = fromTop
      ? Phaser.Math.Between(cfg.passageTop - 40, cfg.passageTop + 60)
      : Phaser.Math.Between(cfg.passageBottom - 60, cfg.passageBottom + 40);

    const missile = this.physics.add.image(x, y, 'missile').setDepth(7);
    missile.body.setSize(40, 12);
    missile.body.setAllowGravity(false);
    missile.rotation = Math.PI; // flying left
    missile.alive = true;
    missile.hitShip = false;
    missile.minDistToShip = Infinity;

    // glow sprite riding the airframe
    missile.glowSprite = this.add.image(x, y, 'flare').setDepth(6)
      .setTint(0xffc76b).setScale(0.9).setBlendMode(Phaser.BlendModes.ADD);

    // smoke contrail
    missile.trail = this.add.particles(0, 0, 'smoke', {
      speed: { min: 8, max: 30 },
      scale: { start: 0.7, end: 1.8 },
      alpha: { start: 0.45, end: 0 },
      lifespan: 1100,
      frequency: 18
    }).setDepth(6);
    missile.trail.startFollow(missile);

    this.physics.add.overlap(this.ship, missile, () => this.hitMissile(missile));
    this.missiles.push(missile);
  }

  buildHud() {
    const w = this.viewW;
    const pad = 16;

    this.add.rectangle(w / 2, 26, w - 16, 40, 0x061420, 0.55)
      .setScrollFactor(0).setDepth(90);

    this.levelText = this.add.text(pad, 16, `LV ${this.cfg.id}  ${this.cfg.name.toUpperCase()}`, {
      fontFamily: 'monospace', fontSize: '17px', color: '#e8f0f6'
    }).setScrollFactor(0).setDepth(100);

    this.scoreText = this.add.text(pad, 50, '', {
      fontFamily: 'monospace', fontSize: '14px', color: '#9fb4c4'
    }).setScrollFactor(0).setDepth(100);
    this.updateScoreHud();

    this.flareText = this.add.text(pad, 70, '', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffd27a'
    }).setScrollFactor(0).setDepth(100);
    this.updateFlareHud();

    // hull bar
    this.add.text(w * 0.40, 16, 'HULL', {
      fontFamily: 'monospace', fontSize: '15px', color: '#9fb4c4'
    }).setScrollFactor(0).setDepth(100);
    this.add.rectangle(w * 0.40 + 52 + 82, 25, 164, 16, 0x0b2233)
      .setScrollFactor(0).setDepth(99);
    this.hullBar = this.add.rectangle(w * 0.40 + 54, 25, 160, 12, 0x37e07a)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(100);

    // distance bar
    this.add.text(w * 0.66, 16, 'STRAIT', {
      fontFamily: 'monospace', fontSize: '15px', color: '#9fb4c4'
    }).setScrollFactor(0).setDepth(100);
    this.add.rectangle(w * 0.66 + 70 + 102, 25, 204, 16, 0x0b2233)
      .setScrollFactor(0).setDepth(99);
    this.distBar = this.add.rectangle(w * 0.66 + 72, 25, 200, 12, 0x5fb6e8)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(100);
    this.shipDot = this.add.image(w * 0.66 + 72, 25, 'spark').setScrollFactor(0).setDepth(101);

    // current indicator
    this.currentText = this.add.text(w - pad, 16, 'CURRENT →', {
      fontFamily: 'monospace', fontSize: '15px', color: '#ffd27a'
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);

    this.muteText = this.add.text(w - pad, 44, '', {
      fontFamily: 'monospace', fontSize: '13px', color: '#88a0b4'
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);

    this.warnText = this.add.text(w / 2, 88, '! MISSILE LOCK !', {
      fontFamily: 'monospace', fontSize: '24px', color: '#ff5544', stroke: '#2a0400', strokeThickness: 4
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setVisible(false);
    this.tweens.add({ targets: this.warnText, alpha: 0.2, duration: 260, yoyo: true, repeat: -1 });

    this.updateHullBar();
  }

  showBriefing() {
    const card = this.add.container(this.viewW / 2, this.viewH / 2 - 40).setScrollFactor(0).setDepth(120);
    const bg = this.add.rectangle(0, 0, 640, 120, 0x061420, 0.85).setStrokeStyle(2, 0x5fb6e8);
    const title = this.add.text(0, -30, `LEVEL ${this.cfg.id} — ${this.cfg.name}`, {
      fontFamily: 'Georgia, serif', fontSize: '28px', color: '#f4e9d8'
    }).setOrigin(0.5);
    const brief = this.add.text(0, 12, this.cfg.briefing, {
      fontFamily: 'monospace', fontSize: '16px', color: '#bcd2e0'
    }).setOrigin(0.5);
    card.add([bg, title, brief]);
    this.tweens.add({
      targets: card,
      alpha: 0,
      delay: 2600,
      duration: 600,
      onComplete: () => card.destroy()
    });
  }

  // ------------------------------------------------------------------ events

  shiftCurrent() {
    const cfg = this.cfg;
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const mag = cfg.currentForce * Phaser.Math.FloatBetween(0.6, 1.25);
    this.currentTarget.set(Math.cos(angle) * mag, Math.sin(angle) * mag);

    const dx = this.currentTarget.x;
    const dy = this.currentTarget.y;
    let arrow;
    if (Math.abs(dx) > Math.abs(dy)) {
      arrow = dx > 0 ? '→' : '←';
    } else {
      arrow = dy > 0 ? '↓' : '↑';
    }
    this.currentText.setText(`CURRENT ${arrow}`);
  }

  hitMine(mine) {
    if (!mine.active || this.gameOverStarted) {
      return;
    }
    this.explode(mine.x, mine.y, true);
    mine.glow.destroy();
    mine.destroy();
    // mine blast shoves the hull away
    const away = new Phaser.Math.Vector2(this.ship.x - mine.x, this.ship.y - mine.y).normalize().scale(160);
    this.ship.body.velocity.add(away);
    this.damage(34);
  }

  hitMissile(missile) {
    if (!missile.alive || this.gameOverStarted) {
      return;
    }
    missile.hitShip = true;
    this.killMissile(missile, true);
    this.damage(26);
  }

  killMissile(missile, exploded) {
    missile.alive = false;
    if (exploded) {
      this.explode(missile.x, missile.y, false);
    }
    // close-call bonus: it blew up near us but never connected
    if (!missile.hitShip && missile.minDistToShip < 110 && !this.gameOverStarted && !this.levelDone) {
      this.registry.set('score', this.registry.get('score') + 50);
      this.updateScoreHud();
      this.floatText(this.ship.x, this.ship.y - 50, '+50 CLOSE CALL', '#5fb6e8');
    }
    missile.trail.stopFollow();
    missile.trail.stop();
    missile.glowSprite.destroy();
    const trail = missile.trail;
    this.time.delayedCall(1200, () => trail.destroy());
    missile.destroy();
  }

  damage(amount) {
    const now = this.time.now;
    if (now < this.invulnUntil) {
      return;
    }
    this.invulnUntil = now + 1100;
    this.hull = Math.max(0, this.hull - amount);
    this.registry.set('hull', this.hull);
    this.updateHullBar();
    this.cameras.main.shake(220, 0.012);
    this.cameras.main.flash(120, 255, 80, 30);

    this.ship.setTintFill(0xffffff);
    this.time.delayedCall(90, () => this.ship.clearTint());

    if (this.hull <= 0) {
      this.sinkShip();
    }
  }

  updateScoreHud() {
    this.scoreText.setText(`SCORE ${this.registry.get('score')}`);
  }

  updateFlareHud() {
    this.flareText.setText(`FLARES [SPACE] ${'*'.repeat(this.flareStock)}${'.'.repeat(Math.max(0, 6 - this.flareStock))}`);
  }

  updateHullBar() {
    const k = this.hull / 100;
    this.hullBar.width = 160 * k;
    this.hullBar.fillColor = k > 0.55 ? 0x37e07a : (k > 0.25 ? 0xffd27a : 0xff5544);
  }

  explode(x, y, big) {
    Sound.explosion(big);
    const flare = this.add.image(x, y, 'flare').setDepth(20)
      .setBlendMode(Phaser.BlendModes.ADD).setScale(big ? 3 : 2).setTint(0xffe0a0);
    this.tweens.add({
      targets: flare, scale: big ? 9 : 6, alpha: 0,
      duration: 420, ease: 'Cubic.easeOut', onComplete: () => flare.destroy()
    });
    this.add.particles(x, y, 'spark', {
      speed: { min: 80, max: big ? 340 : 240 },
      scale: { start: 1.6, end: 0 },
      lifespan: 700,
      quantity: big ? 26 : 16,
      stopAfter: big ? 26 : 16
    }).setDepth(19);
    this.add.particles(x, y, 'smoke', {
      speed: { min: 20, max: 90 },
      scale: { start: 1.2, end: 3.2 },
      alpha: { start: 0.6, end: 0 },
      lifespan: 1400,
      quantity: big ? 14 : 8,
      stopAfter: big ? 14 : 8
    }).setDepth(18);
  }

  sinkShip() {
    if (this.gameOverStarted) {
      return;
    }
    this.gameOverStarted = true;
    Sound.stopEngine();
    Sound.stopLockOn();
    this.explode(this.ship.x, this.ship.y, true);
    this.ship.body.enable = false;
    this.washEmitter.stop();
    this.funnelEmitter.setFrequency(40); // billowing smoke as she goes down

    this.tweens.add({
      targets: this.ship,
      y: this.ship.y + 140,
      angle: -14,
      alpha: 0.2,
      duration: 2400,
      ease: 'Sine.easeIn'
    });
    this.time.delayedCall(2600, () => this.scene.start('GameOver'));
  }

  completeLevel() {
    if (this.levelDone || this.gameOverStarted) {
      return;
    }
    this.levelDone = true;
    Sound.fanfare();
    Sound.stopLockOn();

    const idx = this.registry.get('levelIndex');
    this.registry.set('score', this.registry.get('score') + Math.round(this.hull * this.cfg.id));
    // patch the hull between legs, never above 100
    this.registry.set('hull', Math.min(100, this.hull + 25));

    if (idx >= LEVELS.length - 1) {
      this.time.delayedCall(900, () => this.scene.start('Victory'));
    } else {
      this.registry.set('levelIndex', idx + 1);
      const note = this.add.text(this.viewW / 2, this.viewH / 2, `${this.cfg.name} CLEARED`, {
        fontFamily: 'Georgia, serif', fontSize: '42px', color: '#37e07a', stroke: '#04121f', strokeThickness: 6
      }).setOrigin(0.5).setScrollFactor(0).setDepth(130);
      this.tweens.add({ targets: note, scale: 1.15, duration: 800, yoyo: true });
      this.time.delayedCall(1800, () => this.scene.start('Game'));
    }
  }

  // ------------------------------------------------------------------ update

  update(time, delta) {
    if (this.gameOverStarted) {
      return;
    }
    const dt = delta / 1000;
    const cfg = this.cfg;
    const ship = this.ship;
    const cam = this.cameras.main;

    // ---- helm input: heavy accelerations, momentum does the rest
    let left = this.cursors.left.isDown || this.wasd.A.isDown;
    let right = this.cursors.right.isDown || this.wasd.D.isDown;
    let up = this.cursors.up.isDown || this.wasd.W.isDown;
    let down = this.cursors.down.isDown || this.wasd.S.isDown;

    // gamepad: left stick / d-pad for helm, A (0) flare, Start (9) pause
    let padX = 0;
    let padY = 0;
    if (this.input.gamepad && this.input.gamepad.total > 0) {
      const pad = this.input.gamepad.getPad(0);
      if (pad) {
        padX = Math.abs(pad.axes.length > 0 ? pad.axes[0].getValue() : 0) > 0.15
          ? pad.axes[0].getValue() : 0;
        padY = Math.abs(pad.axes.length > 1 ? pad.axes[1].getValue() : 0) > 0.15
          ? pad.axes[1].getValue() : 0;
        left = left || pad.left;
        right = right || pad.right;
        up = up || pad.up;
        down = down || pad.down;

        const flarePressed = pad.buttons[0] && pad.buttons[0].pressed;
        if (flarePressed && !this.padButtons.flare) { this.launchFlare(); }
        this.padButtons.flare = flarePressed;

        const pausePressed = pad.buttons[9] && pad.buttons[9].pressed;
        if (pausePressed && !this.padButtons.pause) { this.pauseGame(); }
        this.padButtons.pause = pausePressed;
      }
    }

    const ACCEL_X = 215;
    const ACCEL_Y = 175;
    let ax = 0;
    let ay = 0;
    if (right) { ax += ACCEL_X; }
    if (left) { ax -= ACCEL_X * 0.75; } // reversing a tanker is harder
    if (up) { ay -= ACCEL_Y; }
    if (down) { ay += ACCEL_Y; }
    // analogue stick blends on top of digital input
    if (padX > 0) { ax += ACCEL_X * padX; } else { ax += ACCEL_X * 0.75 * padX; }
    ay += ACCEL_Y * padY;
    ax = Phaser.Math.Clamp(ax, -ACCEL_X * 0.75, ACCEL_X);
    ay = Phaser.Math.Clamp(ay, -ACCEL_Y, ACCEL_Y);

    // ---- water current eases toward its target gust and shoves the hull
    this.current.x = Phaser.Math.Linear(this.current.x, this.currentTarget.x, 0.6 * dt);
    this.current.y = Phaser.Math.Linear(this.current.y, this.currentTarget.y, 0.6 * dt);
    ax += this.current.x;
    ay += this.current.y;

    // baseline forward steam: the loaded tanker never fully stops
    ax += cfg.scrollSpeed * 0.35;

    ship.setAcceleration(ax, ay);

    // engine audio follows throttle
    const throttle = Math.min(1, (Math.abs(ax) + Math.abs(ay)) / (ACCEL_X + ACCEL_Y));
    Sound.setEngineThrottle(throttle);
    this.washEmitter.setFrequency(throttle > 0.35 ? 22 : 60);

    // slight pitch with vertical motion sells the mass
    ship.rotation = Phaser.Math.Clamp(ship.body.velocity.y * 0.0012, -0.12, 0.12);

    // radar rides the bridge mast and spins
    this.radar.setPosition(ship.x - 66 * Math.cos(ship.rotation) , ship.y - 38 + ship.body.velocity.y * 0.004);
    this.radar.angle += 220 * dt;

    // ---- parallax scrolling
    this.waterLayer.tilePositionX = cam.scrollX * 0.55;
    this.waterLayer.tilePositionY += this.current.y * 0.004;
    this.waterOverlay.tilePositionX = cam.scrollX * 0.75 + time * 0.02;
    this.rocksHazeTop.tilePositionX = cam.scrollX * 0.18;
    this.rocksHazeBot.tilePositionX = cam.scrollX * 0.22;
    this.rocksTop.tilePositionX = cam.scrollX * 0.85;
    this.rocksBot.tilePositionX = cam.scrollX * 0.85;
    this.surfTop.tilePositionX = cam.scrollX * 0.85 + time * 0.05;
    this.surfBot.tilePositionX = cam.scrollX * 0.85 - time * 0.05;

    // ---- shoreline scrape damage
    const halfH = ship.displayHeight * 0.28;
    if (ship.y - halfH < cfg.passageTop || ship.y + halfH > cfg.passageBottom) {
      if (time > (this.lastScrape || 0) + 450) {
        this.lastScrape = time;
        Sound.clank();
        this.add.particles(ship.x + Phaser.Math.Between(-60, 60),
          ship.y + (ship.y < this.viewH / 2 ? -halfH : halfH), 'spark', {
            speed: { min: 40, max: 140 }, scale: { start: 1, end: 0 },
            lifespan: 420, quantity: 6, stopAfter: 6
          }).setDepth(15);
        this.hull = Math.max(0, this.hull - 5);
        this.registry.set('hull', this.hull);
        this.updateHullBar();
        this.cameras.main.shake(120, 0.005);
        if (this.hull <= 0) {
          this.sinkShip();
          return;
        }
      }
      // rocks push the hull back toward the channel
      ship.body.velocity.y += (ship.y < this.viewH / 2 ? 1 : -1) * 260 * dt;
    }

    // ---- mines and pickups bob on the swell
    for (const mine of this.mines) {
      if (!mine.active) { continue; }
      mine.y = mine.baseY + Math.sin(time * 0.0016 + mine.bobSeed) * 9;
      mine.glow.setPosition(mine.x, mine.y);
    }
    for (const kit of this.pickups) {
      if (!kit.active) { continue; }
      kit.y = kit.baseY + Math.sin(time * 0.0014 + kit.bobSeed) * 7;
    }

    // ---- decoy flares burn for a few seconds then fizzle
    for (let i = this.activeFlares.length - 1; i >= 0; i--) {
      const f = this.activeFlares[i];
      if (!f.active || time > f.bornAt + 3800) {
        if (f.active) {
          this.killFlare(f);
        }
        this.activeFlares.splice(i, 1);
      }
    }

    // ---- missiles home in on the ship, unless a flare seduces them
    let anyLock = false;
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      if (!m.active || !m.alive) {
        this.missiles.splice(i, 1);
        continue;
      }

      // pick target: nearest burning flare within seeker range, else the ship
      let tx = ship.x;
      let ty = ship.y;
      let chasingFlare = null;
      let best = 620; // seeker decoy-acquisition range
      for (const f of this.activeFlares) {
        if (!f.active) { continue; }
        const df = Phaser.Math.Distance.Between(m.x, m.y, f.x, f.y);
        if (df < best) {
          best = df;
          chasingFlare = f;
          tx = f.x;
          ty = f.y;
        }
      }

      const want = Phaser.Math.Angle.Between(m.x, m.y, tx, ty);
      const turn = Phaser.Math.DegToRad(cfg.missileTurn) * dt;
      m.rotation = Phaser.Math.Angle.RotateTo(m.rotation, want, turn);
      this.physics.velocityFromRotation(m.rotation, cfg.missileSpeed, m.body.velocity);
      m.glowSprite.setPosition(m.x - Math.cos(m.rotation) * 26, m.y - Math.sin(m.rotation) * 26);

      const dist = Phaser.Math.Distance.Between(m.x, m.y, ship.x, ship.y);
      m.minDistToShip = Math.min(m.minDistToShip, dist);
      if (dist < 1000 && !chasingFlare) {
        anyLock = true;
      }

      // a missile that reaches its flare detonates on it
      if (chasingFlare && best < 30) {
        this.killFlare(chasingFlare);
        this.killMissile(m, true);
        this.missiles.splice(i, 1);
        continue;
      }
      // missiles that overshoot far behind the ship ditch into the sea
      if (m.x < cam.scrollX - 150 || m.y < -60 || m.y > this.viewH + 60) {
        this.killMissile(m, true);
        this.missiles.splice(i, 1);
      }
    }
    if (anyLock) {
      Sound.startLockOn();
      this.warnText.setVisible(true);
    } else {
      Sound.stopLockOn();
      this.warnText.setVisible(false);
    }

    // ---- progress
    const k = Phaser.Math.Clamp(ship.x / this.finishX, 0, 1);
    this.shipDot.x = this.distBar.x + 200 * k;
    if (ship.x >= this.finishX) {
      this.completeLevel();
    }
  }
}
