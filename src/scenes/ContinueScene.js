'use strict';

/**
 * ContinueScene — shown over the paused GameScene when the ship sinks and a
 * rewarded-ad continue is available. Watching the ad revives the ship where
 * it went down (leg progress, score, and level all kept). Giving up or letting
 * the timer run out proceeds to the Game Over screen.
 */
class ContinueScene extends Phaser.Scene {
  constructor() {
    super('Continue');
  }

  create(data) {
    const { width, height } = this.scale;
    this.gameScene = this.scene.get('Game');
    this.decided = false;

    this.add.rectangle(width / 2, height / 2, width, height, 0x04121f, 0.8);

    this.add.text(width / 2, height * 0.24, 'SHIP LOST', {
      fontFamily: 'Georgia, serif', fontSize: '60px', color: '#ff5544',
      stroke: '#1a0500', strokeThickness: 7
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.37, 'Watch a short ad to carry on from here.', {
      fontFamily: 'Georgia, serif', fontSize: '22px', color: '#d8e2ea', fontStyle: 'italic'
    }).setOrigin(0.5);

    const left = ADS_CONFIG.maxContinues - (data && data.continuesUsed ? data.continuesUsed : 0);
    this.add.text(width / 2, height * 0.44, `Continues left this run: ${left}`, {
      fontFamily: 'monospace', fontSize: '16px', color: '#9fb4c4'
    }).setOrigin(0.5);

    this.timeLeft = 9;
    this.count = this.add.text(width / 2, height * 0.54, '', {
      fontFamily: 'monospace', fontSize: '20px', color: '#ffd27a'
    }).setOrigin(0.5);
    this.refreshCount();
    this.timer = this.time.addEvent({
      delay: 1000, loop: true, callback: () => {
        this.timeLeft -= 1;
        this.refreshCount();
        if (this.timeLeft <= 0) { this.giveUp(); }
      }
    });

    this.status = this.add.text(width / 2, height * 0.62, '', {
      fontFamily: 'monospace', fontSize: '16px', color: '#8fb4cc'
    }).setOrigin(0.5);

    this.contBtn = uiButton(this, width / 2 - 160, height * 0.74, 'WATCH AD  ↺', () => this.continueRun(), { primary: true, w: 270 });
    this.giveBtn = uiButton(this, width / 2 + 170, height * 0.74, 'GIVE UP', () => this.giveUp(), { w: 200 });
    this.tweens.add({ targets: this.contBtn.bg, alpha: 0.55, duration: 700, yoyo: true, repeat: -1 });

    this.input.keyboard.on('keydown-ENTER', () => this.continueRun());
    this.input.keyboard.on('keydown-SPACE', () => this.continueRun());
    this.input.keyboard.on('keydown-ESC', () => this.giveUp());
  }

  refreshCount() {
    this.count.setText(`Ending in ${Math.max(0, this.timeLeft)}s`);
  }

  async continueRun() {
    if (this.decided) { return; }
    this.decided = true;
    this.timer.remove();
    this.status.setText('Loading ad…');

    const rewarded = await Ads.showRewarded();
    if (rewarded) {
      this.scene.stop();
      this.scene.resume('Game');
      this.gameScene.revive();
    } else {
      // no ad / not completed — treat as give up
      this.endRun();
    }
  }

  giveUp() {
    if (this.decided) { return; }
    this.decided = true;
    this.timer.remove();
    this.endRun();
  }

  endRun() {
    this.scene.stop();
    this.scene.resume('Game');
    this.gameScene.finalizeGameOver();
  }
}
