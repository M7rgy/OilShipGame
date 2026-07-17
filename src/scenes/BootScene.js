'use strict';

/**
 * BootScene — generates all procedural textures, seeds the game registry,
 * then hands off to the main menu. There are no external assets to load.
 */
class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    Textures.createAll(this);

    this.registry.set('levelIndex', 0);
    this.registry.set('hull', 100);
    this.registry.set('score', 0);

    this.scene.start('MainMenu');
  }
}
