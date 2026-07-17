'use strict';

const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const steamConfig = require('./steamworks.config.json');

// Steamworks client, populated by initSteamworks() when enabled.
let steamClient = null;

// Steamworks bootstrap (placeholder).
// When shipping on Steam, install the `steamworks.js` package and initialise it
// here with the appId from steamworks.config.json, before the window is created:
//
//   const steamworks = require('steamworks.js');
//   const client = steamworks.init(steamConfig.appId);
//
// steam_appid.txt in the app root is also required for local Steam testing.
function initSteamworks() {
  if (!steamConfig.enabled) {
    return null;
  }
  try {
    // eslint-disable-next-line global-require
    const steamworks = require('steamworks.js');
    steamClient = steamworks.init(steamConfig.appId);
    return steamClient;
  } catch (err) {
    console.warn('[steam] Steamworks not available, running without Steam:', err.message);
    return null;
  }
}

// Renderer -> main bridge: fire a Steam achievement by API name. A no-op
// when Steamworks is disabled or unavailable, so the game runs fine off-Steam.
ipcMain.on('steam-achievement', (_event, id) => {
  if (!steamClient || typeof id !== 'string') {
    return;
  }
  try {
    steamClient.achievement.activate(id);
  } catch (err) {
    console.warn('[steam] achievement failed:', err.message);
  }
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 540,
    title: 'Hormuz Escape',
    backgroundColor: '#04121f',
    autoHideMenuBar: true,
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, '..', 'index.html'));
  return win;
}

app.whenReady().then(() => {
  initSteamworks();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
