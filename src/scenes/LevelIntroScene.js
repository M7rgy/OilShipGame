'use strict';

/**
 * LevelIntroScene — a paused "ready?" gate shown before each leg. It presents
 * the level name and briefing with a START LEVEL button, so the game never
 * begins (and the ship never takes damage) until the player is ready. Reached
 * from the menu, between legs (after the interstitial), and on retry.
 */
class LevelIntroScene extends Phaser.Scene {
  constructor() {
    super('LevelIntro');
  }

  create() {
    const { width, height } = this.scale;
    const endless = this.registry.get('mode') === 'endless';
    const idx = this.registry.get('levelIndex') || 0;
    const cfg = endless ? ENDLESS_LEVEL : LEVELS[idx];

    Ads.showBanner();

    const sky = this.add.graphics();
    Textures.verticalGradient(sky, 0, 0, width, height, cfg.skyTop, cfg.skyBottom);
    this.water = this.add.tileSprite(width / 2, height * 0.7, width, height * 0.6, `water${cfg.id}`)
      .setAlpha(0.9);

    this.ship = this.add.image(width * 0.5, height * 0.58, 'ship').setScale(0.85);
    this.tweens.add({
      targets: this.ship, y: this.ship.y + 6, angle: 1.2,
      duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });

    this.add.text(width / 2, height * 0.20, endless ? 'ENDLESS GAUNTLET' : `LEVEL ${cfg.id}`, {
      fontFamily: 'monospace', fontSize: '20px', color: '#9fb4c4'
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.29, cfg.name, {
      fontFamily: 'Georgia, serif', fontSize: '52px', color: '#f4e9d8',
      stroke: '#1a2b3c', strokeThickness: 7
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.40, cfg.briefing, {
      fontFamily: 'monospace', fontSize: '18px', color: '#bcd2e0',
      align: 'center', wordWrap: { width: width * 0.7 }
    }).setOrigin(0.5);

    const start = () => {
      Sound.init();
      Sound.resume();
      this.scene.start('Game');
    };

    const by = height * 0.78 - adBottomLift(this);
    const btn = uiButton(this, width / 2, by, endless ? 'BEGIN' : 'START LEVEL', start,
      { primary: true, w: 300, fontSize: '26px' });
    this.tweens.add({ targets: btn.bg, alpha: 0.55, duration: 700, yoyo: true, repeat: -1 });

    this.input.keyboard.on('keydown-ENTER', start);
    this.input.keyboard.on('keydown-SPACE', start);
    if (this.input.gamepad) {
      this.input.gamepad.once('down', start);
    }
  }

  update(time, delta) {
    if (this.water) {
      this.water.tilePositionX += 0.06 * delta;
    }
  }
}
