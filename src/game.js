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

// Adaptive canvas: keep a fixed 720 logical height (so all gameplay tuning
// stays valid) but flex the width to the device's landscape aspect ratio, so
// on a phone the game fills the screen instead of pillar-boxing. Desktop keeps
// the classic 1280x720. Height-based so vertical layout never changes.
const GAME_H = 720;
let GAME_W = 1280;
if (IS_TOUCH) {
  const longSide = Math.max(window.innerWidth, window.innerHeight);
  const shortSide = Math.min(window.innerWidth, window.innerHeight);
  const aspect = Phaser.Math.Clamp((longSide / shortSide) || (16 / 9), 1.55, 2.4);
  GAME_W = Math.round(GAME_H * aspect);
}

const config = {
  type: forceCanvas ? Phaser.CANVAS : Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
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
  scene: [SplashScene, BootScene, MainMenuScene, SettingsScene, LevelIntroScene, GameScene, PauseScene, ContinueScene, GameOverScene, VictoryScene]
};

window.game = new Phaser.Game(config);
