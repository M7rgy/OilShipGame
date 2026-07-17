'use strict';

/** GameOverScene — the tanker went down. Offer retry of the current level. */
class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create() {
    const { width, height } = this.scale;
    const levelIdx = this.registry.get('levelIndex');
    const endless = this.registry.get('mode') === 'endless';
    const cfg = endless ? ENDLESS_LEVEL : LEVELS[levelIdx];

    this.add.rectangle(width / 2, height / 2, width, height, 0x04121f, 1);
    this.water = this.add.tileSprite(width / 2, height * 0.8, width, height * 0.4, 'water5')
      .setAlpha(0.8);

    // slick of burning oil on the surface
    this.add.particles(width / 2, height * 0.62, 'smoke', {
      x: { min: -220, max: 220 },
      speedY: { min: -30, max: -12 },
      scale: { start: 0.8, end: 2.6 },
      alpha: { start: 0.3, end: 0 },
      tint: 0x333333,
      lifespan: 2600,
      frequency: 90
    });
    this.add.particles(width / 2, height * 0.64, 'spark', {
      x: { min: -200, max: 200 },
      speedY: { min: -40, max: -10 },
      scale: { start: 1.2, end: 0 },
      tint: [0xff7733, 0xffb347],
      lifespan: 900,
      frequency: 60
    });

    this.add.text(width / 2, height * 0.30, 'SHIP LOST', {
      fontFamily: 'Georgia, serif',
      fontSize: '68px',
      color: '#ff5544',
      stroke: '#1a0500',
      strokeThickness: 8
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.40,
      `She went down in the ${cfg.name}.`, {
      fontFamily: 'Georgia, serif', fontSize: '22px', color: '#d8e2ea', fontStyle: 'italic'
    }).setOrigin(0.5);

    const rank = this.registry.get('lastRank');
    const scoreColor = (rank !== undefined && rank >= 0) ? '#ffd27a' : '#d8e2ea';
    this.add.text(width / 2, height * 0.47, `SCORE  ${this.registry.get('score')}`, {
      fontFamily: 'monospace', fontSize: '22px', color: scoreColor
    }).setOrigin(0.5);
    if (rank !== undefined && rank >= 0) {
      const nb = this.add.text(width / 2, height * 0.52, `NEW #${rank + 1} HIGH SCORE!`, {
        fontFamily: 'monospace', fontSize: '18px', color: '#37e07a'
      }).setOrigin(0.5);
      this.tweens.add({ targets: nb, scale: 1.12, duration: 500, yoyo: true, repeat: -1 });
    }

    this.drawHighScores(width / 2, height * 0.60);

    const retry = this.add.text(width / 2, height * 0.90,
      `ENTER — ${endless ? 'run again' : 'retry level'}        ESC — main menu`, {
      fontFamily: 'monospace', fontSize: '22px', color: '#bcd2e0'
    }).setOrigin(0.5);
    this.tweens.add({ targets: retry, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });

    this.input.keyboard.on('keydown-ENTER', () => {
      this.registry.set('hull', 100);
      this.registry.set('score', 0);
      this.registry.set('lastRank', -1);
      this.scene.start('Game');
    });
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('MainMenu'));
  }

  drawHighScores(cx, cy) {
    const scores = Store.highScores();
    this.add.text(cx, cy, 'TOP RUNS', {
      fontFamily: 'monospace', fontSize: '16px', color: '#8fb4cc'
    }).setOrigin(0.5);
    if (scores.length === 0) {
      this.add.text(cx, cy + 24, '—', {
        fontFamily: 'monospace', fontSize: '15px', color: '#5d7488'
      }).setOrigin(0.5);
      return;
    }
    scores.forEach((s, i) => {
      const line = `${i + 1}.  ${String(s.score).padStart(6)}   ${s.label}`;
      this.add.text(cx, cy + 24 + i * 22, line, {
        fontFamily: 'monospace', fontSize: '15px', color: '#d8e2ea'
      }).setOrigin(0.5);
    });
  }

  update(time, delta) {
    this.water.tilePositionX += 0.08 * delta;
  }
}
