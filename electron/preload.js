'use strict';

/**
 * Preload bridge. Exposes a tiny, safe API to the game running in the
 * renderer (context-isolated, no Node access). Currently just forwards
 * Steam achievement unlocks to the main process; extend as needed.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('steamAPI', {
  achievement: (id) => ipcRenderer.send('steam-achievement', id)
});
