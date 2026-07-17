'use strict';

/** PauseScene — translucent overlay launched on top of a paused GameScene. */
class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  create() {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x04121f, 0.72);
    this.add.text(width / 2, height * 0.40, 'PAUSED', {
      fontFamily: 'Georgia, serif',
      fontSize: '56px',
      color: '#f4e9d8',
      stroke: '#1a2b3c',
      strokeThickness: 6
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.52,
      'P / ESC — resume        Q — abandon run', {
      fontFamily: 'monospace', fontSize: '18px', color: '#bcd2e0'
    }).setOrigin(0.5);

    const resume = () => {
      this.scene.stop();
      this.scene.resume('Game');
    };
    const quit = () => {
      this.scene.stop('Game');
      this.scene.stop();
      this.scene.start('MainMenu');
    };
    uiButton(this, width / 2 - 130, height * 0.64, 'RESUME', resume, { primary: true });
    uiButton(this, width / 2 + 130, height * 0.64, 'ABANDON', quit);

    this.input.keyboard.on('keydown-P', resume);
    this.input.keyboard.on('keydown-ESC', resume);
    this.input.keyboard.on('keydown-Q', quit);

    // gamepad Start also resumes (with a small debounce so the same press
    // that opened the pause menu doesn't instantly close it)
    this.padReadyAt = this.time.now + 300;
  }

  update() {
    if (this.input.gamepad && this.input.gamepad.total > 0 && this.time.now > this.padReadyAt) {
      const pad = this.input.gamepad.getPad(0);
      if (pad && pad.buttons[9] && pad.buttons[9].pressed) {
        this.scene.stop();
        this.scene.resume('Game');
      }
    }
  }
}
