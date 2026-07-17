'use strict';

/**
 * SettingsScene — volume, screen-shake, and music toggles, persisted to
 * localStorage via Store. Reachable from the main menu (S).
 */
class SettingsScene extends Phaser.Scene {
  constructor() {
    super('Settings');
  }

  create() {
    const { width, height } = this.scale;
    this.settings = Store.settings();

    const sky = this.add.graphics();
    Textures.verticalGradient(sky, 0, 0, width, height, 0x123049, 0x081f38);
    this.water = this.add.tileSprite(width / 2, height * 0.82, width, height * 0.4, 'water1')
      .setAlpha(0.7);

    this.add.text(width / 2, height * 0.16, 'SETTINGS', {
      fontFamily: 'Georgia, serif', fontSize: '52px', color: '#f4e9d8',
      stroke: '#1a2b3c', strokeThickness: 6
    }).setOrigin(0.5);

    // rows: {label, type, get, set}
    this.rows = [
      {
        label: 'Master Volume',
        type: 'slider',
        get: () => this.settings.volume,
        set: (v) => { this.settings.volume = Phaser.Math.Clamp(v, 0, 1); Sound.setVolume(this.settings.volume); }
      },
      {
        label: 'Screen Shake',
        type: 'toggle',
        get: () => this.settings.shake,
        set: (v) => { this.settings.shake = v; }
      },
      {
        label: 'Ambient Music',
        type: 'toggle',
        get: () => this.settings.music,
        set: (v) => {
          this.settings.music = v;
          if (v) { Sound.startMusic(); } else { Sound.stopMusic(); }
        }
      }
    ];
    this.selected = 0;

    this.rowTexts = this.rows.map((row, i) => {
      const ry = height * 0.38 + i * 60;
      const t = this.add.text(width / 2, ry, '', {
        fontFamily: 'monospace', fontSize: '24px', color: '#e8f0f6'
      }).setOrigin(0.5);
      // tap a row to select it, and on touch, tapping a toggle flips it
      t.setInteractive({ useHandCursor: true });
      t.on('pointerdown', () => {
        this.selected = i;
        if (row.type === 'toggle') { this.adjust(1); } else { this.refresh(); }
      });
      // on-screen -/+ for the volume slider (touch has no arrow keys)
      if (row.type === 'slider') {
        uiButton(this, width / 2 - 250, ry, '-', () => { this.selected = i; this.adjust(-1); }, { w: 52, h: 44 });
        uiButton(this, width / 2 + 250, ry, '+', () => { this.selected = i; this.adjust(1); }, { w: 52, h: 44 });
      }
      return t;
    });

    this.hint = this.add.text(width / 2, height * 0.80,
      'UP/DOWN — select    LEFT/RIGHT — change    (or tap the rows)', {
      fontFamily: 'monospace', fontSize: '16px', color: '#bcd2e0'
    }).setOrigin(0.5);

    uiButton(this, width / 2, height * 0.90, 'DONE', () => this.exit(), { primary: true, w: 200 });

    this.input.keyboard.on('keydown-UP', () => this.move(-1));
    this.input.keyboard.on('keydown-DOWN', () => this.move(1));
    this.input.keyboard.on('keydown-LEFT', () => this.adjust(-1));
    this.input.keyboard.on('keydown-RIGHT', () => this.adjust(1));
    this.input.keyboard.on('keydown-ENTER', () => this.exit());
    this.input.keyboard.on('keydown-ESC', () => this.exit());

    this.refresh();
  }

  move(dir) {
    this.selected = Phaser.Math.Wrap(this.selected + dir, 0, this.rows.length);
    this.refresh();
  }

  adjust(dir) {
    const row = this.rows[this.selected];
    if (row.type === 'slider') {
      row.set(row.get() + dir * 0.1);
      Sound.pickup();
    } else {
      row.set(!row.get());
      Sound.clank();
    }
    this.refresh();
  }

  refresh() {
    this.rows.forEach((row, i) => {
      const arrow = i === this.selected ? '> ' : '  ';
      let value;
      if (row.type === 'slider') {
        const pips = Math.round(row.get() * 10);
        value = `[${'|'.repeat(pips)}${'.'.repeat(10 - pips)}] ${Math.round(row.get() * 100)}%`;
      } else {
        value = row.get() ? 'ON' : 'OFF';
      }
      this.rowTexts[i].setText(`${arrow}${row.label.padEnd(16)} ${value}`);
      this.rowTexts[i].setColor(i === this.selected ? '#ffd27a' : '#e8f0f6');
    });
  }

  exit() {
    Store.saveSettings(this.settings);
    this.scene.start('MainMenu');
  }

  update(time, delta) {
    this.water.tilePositionX += 0.08 * delta;
  }
}
