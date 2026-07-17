'use strict';

const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const steamConfig = require('./steamworks.config.json');

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
    return steamworks.init(steamConfig.appId);
  } catch (err) {
    console.warn('[steam] Steamworks not available, running without Steam:', err.message);
    return null;
  }
}

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
      sandbox: true
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
