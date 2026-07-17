'use strict';

/** Game entry point — Phaser configuration and scene wiring. */

// `?canvas` forces the Canvas renderer — useful for headless test runs where
// software WebGL is too slow to hold a playable frame rate.
const params = new URLSearchParams(window.location.search);
const forceCanvas = params.has('canvas');

// Touch device? Show on-screen controls and skip the "press key" prompts.
// `?touch` forces it on for testing on desktop.
const IS_TOUCH = params.has('touch')
  || (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches)
  || (navigator.maxTouchPoints > 0)
  || ('ontouchstart' in window);

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
    gamepad: true,
    activePointers: 3 // steer + fire + one spare, simultaneously
  },
  scene: [SplashScene, BootScene, MainMenuScene, SettingsScene, GameScene, PauseScene, GameOverScene, VictoryScene]
};

window.game = new Phaser.Game(config);
