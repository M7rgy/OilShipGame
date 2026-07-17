'use strict';

/**
 * uiButton — a tappable/clickable labelled button used across menu scenes so
 * they work with touch as well as keyboard. Returns { bg, txt }.
 */
function uiButton(scene, x, y, label, onClick, opts) {
  opts = opts || {};
  const w = opts.w || 200;
  const h = opts.h || 56;
  const stroke = opts.primary ? 0xffd27a : (opts.stroke || 0x5fb6e8);
  const color = opts.primary ? '#ffd27a' : (opts.color || '#d8e2ea');
  const depth = opts.depth || 140;
  const bg = scene.add.rectangle(x, y, w, h, 0x0b2233, 0.85)
    .setStrokeStyle(2, stroke).setScrollFactor(0).setDepth(depth)
    .setInteractive({ useHandCursor: true });
  const txt = scene.add.text(x, y, label, {
    fontFamily: 'monospace', fontSize: opts.fontSize || '22px', color
  }).setOrigin(0.5).setScrollFactor(0).setDepth(depth + 1);
  bg.on('pointerover', () => bg.setFillStyle(0x123049, 0.95));
  bg.on('pointerout', () => bg.setFillStyle(0x0b2233, 0.85));
  bg.on('pointerdown', (p, px, py, e) => { if (e) { e.stopPropagation(); } onClick(); });
  return { bg, txt };
}

/**
 * TouchControls — on-screen controls for touch devices, overlaid on the
 * GameScene. A virtual thumb-stick on the left drives the helm (feeding the
 * same analogue path the gamepad uses), plus a FLARE button (bottom-right)
 * and a PAUSE button (bottom-centre).
 *
 * The stick is "anywhere in the left zone": touch down anywhere in the left
 * ~55% of the screen and the base recentres under your thumb, so it works
 * for any hand position. Buttons live in the right/centre zones so firing and
 * steering never fight over the same touch.
 */
class TouchControls {
  constructor(scene, opts) {
    this.scene = scene;
    this.onFlare = opts.onFlare;
    this.onPause = opts.onPause;
    this.w = scene.scale.width;
    this.h = scene.scale.height;
    this.radius = 84;

    this.vec = { x: 0, y: 0 };
    this.stickPointerId = -1;
    this.baseX = 0;
    this.baseY = 0;

    this.buildStick();
    this.buildButtons();
    this.wireInput();
  }

  buildStick() {
    const d = 210; // resting position, bottom-left
    this.homeX = d;
    this.homeY = this.h - 150;

    this.stickBase = this.scene.add.circle(this.homeX, this.homeY, this.radius, 0x0b2233, 0.28)
      .setStrokeStyle(3, 0x9fb4c4, 0.5).setScrollFactor(0).setDepth(200);
    this.stickThumb = this.scene.add.circle(this.homeX, this.homeY, this.radius * 0.42, 0xe8f0f6, 0.35)
      .setStrokeStyle(2, 0xffffff, 0.6).setScrollFactor(0).setDepth(201);
    this.stickHint = this.scene.add.text(this.homeX, this.homeY + this.radius + 16, 'HELM', {
      fontFamily: 'monospace', fontSize: '13px', color: '#9fb4c4'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200).setAlpha(0.7);
  }

  buildButtons() {
    // FLARE button, bottom-right
    const fx = this.w - 120;
    const fy = this.h - 130;
    this.flareBtn = this.scene.add.circle(fx, fy, 66, 0x3a2410, 0.55)
      .setStrokeStyle(3, 0xffb347, 0.8).setScrollFactor(0).setDepth(200)
      .setInteractive({ useHandCursor: true });
    this.flareLabel = this.scene.add.text(fx, fy, 'FLARE', {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffd27a'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
    this.flareBtn.on('pointerdown', (p, x, y, e) => {
      if (e) { e.stopPropagation(); }
      this.flash(this.flareBtn);
      this.onFlare();
    });

    // PAUSE button, bottom centre-right — kept out of the stick zone
    // (x >= 0.55*w) so it never competes with steering touches.
    const px = this.w * 0.62;
    const py = this.h - 44;
    this.pauseBtn = this.scene.add.circle(px, py, 26, 0x0b2233, 0.5)
      .setStrokeStyle(2, 0x9fb4c4, 0.7).setScrollFactor(0).setDepth(200)
      .setInteractive({ useHandCursor: true });
    this.pauseLabel = this.scene.add.text(px, py, 'II', {
      fontFamily: 'monospace', fontSize: '18px', color: '#bcd2e0'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
    this.pauseBtn.on('pointerdown', (p, x, y, e) => {
      if (e) { e.stopPropagation(); }
      this.onPause();
    });
  }

  flash(obj) {
    this.scene.tweens.add({ targets: obj, scale: 1.18, duration: 90, yoyo: true });
  }

  // whether a screen point lies in the stick zone (left side, not on a button)
  inStickZone(x, y) {
    return x < this.w * 0.55;
  }

  wireInput() {
    this.scene.input.on('pointerdown', (pointer) => {
      if (this.stickPointerId === -1 && this.inStickZone(pointer.x, pointer.y)) {
        this.stickPointerId = pointer.id;
        this.baseX = pointer.x;
        this.baseY = pointer.y;
        this.stickBase.setPosition(this.baseX, this.baseY);
        this.stickThumb.setPosition(this.baseX, this.baseY);
        this.update(pointer);
      }
    });

    this.scene.input.on('pointermove', (pointer) => {
      if (pointer.id === this.stickPointerId) {
        this.update(pointer);
      }
    });

    const release = (pointer) => {
      if (pointer.id === this.stickPointerId) {
        this.stickPointerId = -1;
        this.vec.x = 0;
        this.vec.y = 0;
        this.stickBase.setPosition(this.homeX, this.homeY);
        this.stickThumb.setPosition(this.homeX, this.homeY);
      }
    };
    this.scene.input.on('pointerup', release);
    this.scene.input.on('pointerupoutside', release);
  }

  update(pointer) {
    let dx = pointer.x - this.baseX;
    let dy = pointer.y - this.baseY;
    const dist = Math.hypot(dx, dy);
    if (dist > this.radius) {
      dx = (dx / dist) * this.radius;
      dy = (dy / dist) * this.radius;
    }
    this.stickThumb.setPosition(this.baseX + dx, this.baseY + dy);
    this.vec.x = dx / this.radius;
    this.vec.y = dy / this.radius;
  }

  destroy() {
    this.scene.input.off('pointerdown');
    this.scene.input.off('pointermove');
    this.scene.input.off('pointerup');
    this.scene.input.off('pointerupoutside');
    [this.stickBase, this.stickThumb, this.stickHint, this.flareBtn, this.flareLabel,
      this.pauseBtn, this.pauseLabel].forEach((o) => o && o.destroy());
  }
}
