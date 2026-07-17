'use strict';

/**
 * SoundSynth — procedural sound effects via the Web Audio API.
 * No audio assets: everything is synthesized from oscillators and noise buffers.
 *
 *  - engine   : low-pitched diesel rumble (looping, pitch follows throttle)
 *  - lock-on  : high-pitched warning beeps while a missile is tracking
 *  - explosion: heavy white-noise burst with a sub-bass thump
 */
class SoundSynth {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engine = null;
    this.lockLoop = null;
    this.muted = false;
  }

  /** Lazily create the AudioContext (must happen after a user gesture). */
  init() {
    if (this.ctx) {
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) {
      return;
    }
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);
    this.noiseBuffer = this._buildNoiseBuffer(2.0);
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.55, this.ctx.currentTime, 0.05);
    }
  }

  _buildNoiseBuffer(seconds) {
    const rate = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, Math.floor(rate * seconds), rate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // ------------------------------------------------------------------ engine

  /**
   * Start the looping diesel rumble: two detuned low sawtooths through a
   * lowpass filter, amplitude-modulated by a slow LFO so it "chugs".
   */
  startEngine() {
    if (!this.ctx || this.engine) {
      return;
    }
    const t = this.ctx.currentTime;

    const oscA = this.ctx.createOscillator();
    oscA.type = 'sawtooth';
    oscA.frequency.value = 42;

    const oscB = this.ctx.createOscillator();
    oscB.type = 'sawtooth';
    oscB.frequency.value = 57;
    oscB.detune.value = 8;

    // sub sine for weight
    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = 28;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 220;
    filter.Q.value = 1.2;

    // chug LFO
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 9;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.35;

    const amp = this.ctx.createGain();
    amp.gain.value = 0.0;

    oscA.connect(filter);
    oscB.connect(filter);
    sub.connect(filter);
    filter.connect(amp);
    lfo.connect(lfoGain);
    lfoGain.connect(amp.gain);
    amp.connect(this.master);

    oscA.start(t);
    oscB.start(t);
    sub.start(t);
    lfo.start(t);
    amp.gain.setTargetAtTime(0.32, t, 0.4);

    this.engine = { oscA, oscB, sub, lfo, amp, filter };
  }

  /**
   * throttle 0..1 — raises engine pitch/brightness under load so the ship
   * audibly strains when the player pours on power.
   */
  setEngineThrottle(throttle) {
    if (!this.ctx || !this.engine) {
      return;
    }
    const t = this.ctx.currentTime;
    const k = Math.max(0, Math.min(1, throttle));
    this.engine.oscA.frequency.setTargetAtTime(42 + k * 26, t, 0.25);
    this.engine.oscB.frequency.setTargetAtTime(57 + k * 34, t, 0.25);
    this.engine.sub.frequency.setTargetAtTime(28 + k * 12, t, 0.25);
    this.engine.filter.frequency.setTargetAtTime(220 + k * 380, t, 0.25);
    this.engine.amp.gain.setTargetAtTime(0.26 + k * 0.18, t, 0.25);
    this.engine.lfo.frequency.setTargetAtTime(9 + k * 6, t, 0.25);
  }

  stopEngine() {
    if (!this.ctx || !this.engine) {
      return;
    }
    const t = this.ctx.currentTime;
    const e = this.engine;
    e.amp.gain.setTargetAtTime(0, t, 0.15);
    [e.oscA, e.oscB, e.sub, e.lfo].forEach((o) => o.stop(t + 1.0));
    this.engine = null;
  }

  // ----------------------------------------------------------------- lock-on

  /** Repeating high-pitched warning beeps while any missile is tracking. */
  startLockOn() {
    if (!this.ctx || this.lockLoop) {
      return;
    }
    const beep = () => {
      this._beepOnce();
    };
    beep();
    this.lockLoop = setInterval(beep, 420);
  }

  stopLockOn() {
    if (this.lockLoop) {
      clearInterval(this.lockLoop);
      this.lockLoop = null;
    }
  }

  _beepOnce() {
    if (!this.ctx || this.muted) {
      return;
    }
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1560, t);
    osc.frequency.setValueAtTime(2080, t + 0.07);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.16, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);

    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 900;

    osc.connect(hp);
    hp.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  // --------------------------------------------------------------- explosion

  /** Heavy white-noise blast: noise burst + sub thump + slow lowpass sweep. */
  explosion(big = true) {
    if (!this.ctx) {
      return;
    }
    const t = this.ctx.currentTime;
    const dur = big ? 1.6 : 0.9;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(big ? 5200 : 3400, t);
    filter.frequency.exponentialRampToValueAtTime(90, t + dur);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(big ? 0.9 : 0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    noise.start(t);
    noise.stop(t + dur);

    // sub-bass thump for weight
    const thump = this.ctx.createOscillator();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(120, t);
    thump.frequency.exponentialRampToValueAtTime(32, t + 0.5);
    const thumpGain = this.ctx.createGain();
    thumpGain.gain.setValueAtTime(big ? 0.8 : 0.5, t);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    thump.connect(thumpGain);
    thumpGain.connect(this.master);
    thump.start(t);
    thump.stop(t + 0.65);
  }

  // ------------------------------------------------------------------- misc

  /** Short metallic clank for non-fatal hull scrapes. */
  clank() {
    if (!this.ctx) {
      return;
    }
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.18);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  /** Bright two-note blip for collecting a pickup. */
  pickup() {
    if (!this.ctx) {
      return;
    }
    [660, 990].forEach((freq, i) => {
      const t = this.ctx.currentTime + i * 0.09;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.22, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  /** Short pitched whoosh for launching a decoy flare. */
  flareLaunch() {
    if (!this.ctx) {
      return;
    }
    const t = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 2.5;
    bp.frequency.setValueAtTime(600, t);
    bp.frequency.exponentialRampToValueAtTime(2600, t + 0.28);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.30, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    noise.connect(bp);
    bp.connect(gain);
    gain.connect(this.master);
    noise.start(t);
    noise.stop(t + 0.35);
  }

  /** Rising three-note fanfare for level clear / victory. */
  fanfare() {
    if (!this.ctx) {
      return;
    }
    const notes = [392, 523, 659, 784];
    notes.forEach((freq, i) => {
      const t = this.ctx.currentTime + i * 0.16;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t);
      osc.stop(t + 0.5);
    });
  }
}

// Single shared instance for the whole game.
const Sound = new SoundSynth();
