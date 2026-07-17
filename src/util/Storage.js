'use strict';

/**
 * Store — tiny localStorage wrapper for settings and high scores.
 * localStorage persists per-app in Electron and per-origin in the browser.
 */
/**
 * Fire a Steam achievement if the Electron preload exposed the bridge
 * (see electron/preload.js). Silently a no-op in the browser or when
 * Steamworks is disabled.
 */
function steamAchievement(id) {
  if (typeof window !== 'undefined' && window.steamAPI
      && typeof window.steamAPI.achievement === 'function') {
    try {
      window.steamAPI.achievement(id);
    } catch (e) { /* not running under Steam */ }
  }
}

const Store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(`hormuz-${key}`);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(`hormuz-${key}`, JSON.stringify(value));
    } catch (e) { /* storage unavailable: play without persistence */ }
  },

  settings() {
    return Object.assign({ volume: 0.55, shake: true, music: true }, this.get('settings', {}));
  },

  saveSettings(s) {
    this.set('settings', s);
  },

  highScores() {
    return this.get('highscores', []);
  },

  /**
   * Record a finished run. Returns the 0-based rank if it made the top 5,
   * otherwise -1.
   */
  addHighScore(score, label) {
    if (score <= 0) {
      return -1;
    }
    const scores = this.highScores();
    const entry = { score, label, date: new Date().toISOString().slice(0, 10) };
    scores.push(entry);
    scores.sort((a, b) => b.score - a.score);
    const top = scores.slice(0, 5);
    this.set('highscores', top);
    return top.indexOf(entry);
  }
};
