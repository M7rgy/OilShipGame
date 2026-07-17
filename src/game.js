'use strict';

/** Game entry point — Phaser configuration and scene wiring. */

// `?canvas` forces the Canvas renderer — useful for headless test runs where
// software WebGL is too slow to hold a playable frame rate.
const forceCanvas = new URLSearchParams(window.location.search).has('canvas');

const config = {
  type: forceCanvas ? Phaser.CANVAS : Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: 'game-container',
  backgroundColor: '#04121f',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  input: {
    gamepad: true
  },
  scene: [BootScene, MainMenuScene, GameScene, PauseScene, GameOverScene, VictoryScene]
};

window.game = new Phaser.Game(config);
