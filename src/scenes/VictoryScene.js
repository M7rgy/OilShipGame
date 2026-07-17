'use strict';

/** VictoryScene — all five legs cleared, open ocean ahead. */
class VictoryScene extends Phaser.Scene {
  constructor() {
    super('Victory');
  }

  create() {
    const { width, height } = this.scale;

    // dawn sky over open water
    const sky = this.add.graphics();
    Textures.verticalGradient(sky, 0, 0, width, height * 0.55, 0x2a6f97, 0xf2c078);
    this.water = this.add.tileSprite(width / 2, height * 0.78, width, height * 0.46, 'water1');

    // sun
    const sun = this.add.image(width * 0.78, height * 0.30, 'flare')
      .setScale(7).setTint(0xffe8b0).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: sun, scale: 7.8, duration: 2400, yoyo: true, repeat: -1 });

    // the tanker steams away to open sea
    this.ship = this.add.image(width * 0.3, height * 0.60, 'ship').setScale(0.8);
    this.radar = this.add.image(0, 0, 'radar').setScale(0.8);
    this.add.particles(0, 0, 'foam', {
      speedX: { min: -80, max: -30 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 700,
      frequency: 50,
      follow: this.ship,
      followOffset: { x: -100, y: 16 }
    });
    this.tweens.add({
      targets: this.ship, x: width * 1.3, y: height * 0.55, scale: 0.5,
      duration: 16000, ease: 'Sine.easeIn'
    });

    this.add.text(width / 2, height * 0.16, 'OPEN OCEAN', {
      fontFamily: 'Georgia, serif',
      fontSize: '64px',
      color: '#f4e9d8',
      stroke: '#1a2b3c',
      strokeThickness: 8
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.26,
      'All five legs of the Strait are behind you. The cargo is safe.', {
      fontFamily: 'Georgia, serif', fontSize: '22px', color: '#d8e2ea', fontStyle: 'italic'
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.34, `FINAL SCORE  ${this.registry.get('score')}`, {
      fontFamily: 'monospace', fontSize: '26px', color: '#ffd27a'
    }).setOrigin(0.5);

    const rank = this.registry.get('lastRank');
    if (rank !== undefined && rank >= 0) {
      const nb = this.add.text(width / 2, height * 0.40, `NEW #${rank + 1} HIGH SCORE!`, {
        fontFamily: 'monospace', fontSize: '18px', color: '#37e07a'
      }).setOrigin(0.5);
      this.tweens.add({ targets: nb, scale: 1.12, duration: 500, yoyo: true, repeat: -1 });
    }

    // top-runs table
    const scores = Store.highScores();
    scores.slice(0, 5).forEach((s, i) => {
      this.add.text(width / 2, height * 0.46 + i * 20,
        `${i + 1}.  ${String(s.score).padStart(6)}   ${s.label}`, {
        fontFamily: 'monospace', fontSize: '14px', color: '#d8e2ea'
      }).setOrigin(0.5);
    });

    const again = this.add.text(width / 2, height * 0.90, 'ENTER — sail again        ESC — main menu', {
      fontFamily: 'monospace', fontSize: '22px', color: '#bcd2e0'
    }).setOrigin(0.5);
    this.tweens.add({ targets: again, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });

    Sound.fanfare();

    this.input.keyboard.on('keydown-ENTER', () => {
      this.registry.set('mode', null);
      this.registry.set('levelIndex', 0);
      this.registry.set('hull', 100);
      this.registry.set('score', 0);
      this.registry.set('lastRank', -1);
      this.scene.start('Game');
    });
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('MainMenu'));
  }

  update(time, delta) {
    this.water.tilePositionX += 0.12 * delta;
    this.radar.angle += 0.2 * delta;
    this.radar.setPosition(
      this.ship.x - 66 * this.ship.scaleX / 0.8,
      this.ship.y - 46 * this.ship.scaleY / 0.8
    );
    this.radar.setScale(this.ship.scaleX);
  }
}
