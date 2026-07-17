'use strict';

/**
 * SplashScene — the very first thing shown. It paints instantly (using only
 * primitives and text, since the procedural textures are not generated until
 * BootScene) so there's no black frame on load, and it waits for a tap/click/
 * key. That first gesture unlocks the Web Audio context (required on iOS and
 * other mobile browsers) before any sound plays.
 *
 * Only after the gesture does BootScene run the heavy texture generation,
 * behind a "LOADING" indicator, so the wait is explicit rather than a freeze.
 */
class SplashScene extends Phaser.Scene {
  constructor() {
    super('Splash');
  }

  create() {
    const { width, height } = this.scale;
    const touch = typeof IS_TOUCH !== 'undefined' && IS_TOUCH;

    // gradient backdrop (no textures needed — draws straight onto graphics)
    const sky = this.add.graphics();
    Textures.verticalGradient(sky, 0, 0, width, height, 0x1a3a52, 0x04121f);

    // simple drawn horizon wave line for a touch of life
    const waves = this.add.graphics().setDepth(1);
    this.waves = waves;
    this.waveT = 0;

    this.add.text(width / 2, height * 0.34, 'HORMUZ ESCAPE', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '72px',
      color: '#f4e9d8',
      stroke: '#1a2b3c',
      strokeThickness: 8
    }).setOrigin(0.5).setDepth(2);

    this.add.text(width / 2, height * 0.44, 'Run the Strait. Deliver the crude. Stay afloat.', {
      fontFamily: 'Georgia, serif', fontSize: '22px', color: '#d8e2ea', fontStyle: 'italic'
    }).setOrigin(0.5).setDepth(2);

    this.prompt = this.add.text(width / 2, height * 0.60,
      touch ? 'TAP TO START' : 'CLICK OR PRESS ANY KEY', {
      fontFamily: 'monospace', fontSize: '28px', color: '#ffd27a'
    }).setOrigin(0.5).setDepth(2);
    this.tweens.add({ targets: this.prompt, alpha: 0.25, duration: 700, yoyo: true, repeat: -1 });

    // author credit
    this.add.text(width / 2, height * 0.90, 'by M7rgy', {
      fontFamily: 'monospace', fontSize: '18px', color: '#8fb4cc'
    }).setOrigin(0.5).setDepth(2);

    this.started = false;
    const begin = () => this.begin();
    this.input.once('pointerdown', begin);
    this.input.keyboard.once('keydown', begin);
    if (this.input.gamepad) {
      this.input.gamepad.once('down', begin);
    }
  }

  begin() {
    if (this.started) {
      return;
    }
    this.started = true;

    // unlock/create the audio context on this user gesture
    Sound.init();
    Sound.resume();
    Sound.setVolume(Store.settings().volume);

    // kick off ad SDK init (async, safe no-op off mobile)
    Ads.init();

    // swap the prompt for a loading indicator, then generate textures on the
    // next frame so the indicator actually paints before the blocking work
    this.tweens.killTweensOf(this.prompt);
    this.prompt.setText('LOADING…').setAlpha(1).setColor('#bcd2e0');
    this.time.delayedCall(60, () => this.scene.start('Boot'));
  }

  update(time, delta) {
    // gently animated horizon wave
    this.waveT += delta * 0.002;
    const { width, height } = this.scale;
    const y = height * 0.72;
    const g = this.waves;
    g.clear();
    g.lineStyle(3, 0x2a6f97, 0.5);
    g.beginPath();
    for (let x = 0; x <= width; x += 12) {
      const yy = y + Math.sin(x * 0.02 + this.waveT) * 8;
      if (x === 0) { g.moveTo(x, yy); } else { g.lineTo(x, yy); }
    }
    g.strokePath();
  }
}
