'use strict';

/**
 * MainMenuScene — title screen with an animated strait backdrop built from
 * the same procedural textures used in-game.
 */
class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenu');
  }

  create() {
    const { width, height } = this.scale;
    const cfg = LEVELS[0];

    // sky gradient
    const sky = this.add.graphics();
    Textures.verticalGradient(sky, 0, 0, width, height * 0.5, cfg.skyTop, cfg.skyBottom);

    // parallax coastline + water
    this.rocksFar = this.add.tileSprite(width / 2, height * 0.36, width, 200, 'rocksFar')
      .setAlpha(0.8);
    this.rocksNear = this.add.tileSprite(width / 2, height * 0.44, width, 260, 'rocksNear');
    this.water = this.add.tileSprite(width / 2, height * 0.75, width, height * 0.5, 'water1');

    // idling ship
    this.ship = this.add.image(width * 0.32, height * 0.62, 'ship').setScale(0.9);
    this.radar = this.add.image(this.ship.x - 76, this.ship.y - 46, 'radar').setScale(0.9);

    // title
    this.add.text(width / 2, height * 0.20, 'HORMUZ ESCAPE', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '72px',
      color: '#f4e9d8',
      stroke: '#1a2b3c',
      strokeThickness: 8
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.29, 'Run the Strait. Deliver the crude. Stay afloat.', {
      fontFamily: 'Georgia, serif',
      fontSize: '22px',
      color: '#d8e2ea',
      fontStyle: 'italic'
    }).setOrigin(0.5);

    const touch = typeof IS_TOUCH !== 'undefined' && IS_TOUCH;
    const lift = adBottomLift(this);
    this.add.text(width / 2, height * 0.76 - lift, touch
      ? 'Drag the left side to steer  •  FLARE button  •  II to pause'
      : 'ARROWS / WASD — helm    SPACE — decoy flare    P — pause    M — mute    (gamepad supported)', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#bcd2e0'
    }).setOrigin(0.5);

    const best = Store.highScores()[0];
    this.add.text(width / 2, height * 0.82 - lift,
      best ? `BEST  ${best.score}  (${best.label})` : '', {
      fontFamily: 'monospace', fontSize: '16px', color: '#8fb4cc'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: [this.ship],
      y: this.ship.y + 6,
      angle: 1.2,
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    Ads.showBanner();

    const begin = (mode) => {
      Sound.init();
      Sound.resume();
      const st = Store.settings();
      Sound.setVolume(st.volume);
      this.registry.set('mode', mode === 'endless' ? 'endless' : null);
      this.registry.set('levelIndex', 0);
      this.registry.set('hull', 100);
      this.registry.set('score', 0);
      this.registry.set('continuesUsed', 0);
      this.scene.start('Game');
    };

    // tappable buttons (work with mouse and touch); keyboard shortcuts remain
    const by = height * 0.91 - lift;
    const sail = uiButton(this, width / 2 - 250, by, 'SET SAIL', () => begin(), { primary: true });
    uiButton(this, width / 2, by, 'ENDLESS', () => begin('endless'));
    uiButton(this, width / 2 + 250, by, 'SETTINGS', () => { Sound.init(); this.scene.start('Settings'); });
    this.tweens.add({ targets: sail.bg, alpha: 0.6, duration: 800, yoyo: true, repeat: -1 });

    this.input.keyboard.on('keydown-ENTER', () => begin());
    this.input.keyboard.on('keydown-SPACE', () => begin());
    this.input.keyboard.on('keydown-E', () => begin('endless'));
    this.input.keyboard.on('keydown-S', () => { Sound.init(); this.scene.start('Settings'); });
    if (this.input.gamepad) {
      this.input.gamepad.once('down', () => begin());
    }
  }

  update(time, delta) {
    this.rocksFar.tilePositionX += 0.06 * delta;
    this.rocksNear.tilePositionX += 0.14 * delta;
    this.water.tilePositionX += 0.25 * delta;
    this.radar.angle += 0.18 * delta;
    this.radar.setPosition(this.ship.x - 76, this.ship.y - 46 + Math.sin(this.ship.angle * 0.6) * 2);
  }
}
