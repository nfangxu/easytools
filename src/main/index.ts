import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';

import { createDatabase } from './database';
import { registerIpc } from './ipc';

let database: ReturnType<typeof createDatabase> | null = null;

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 920,
    minHeight: 620,
    title: 'EasyTools',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  database = createDatabase(join(app.getPath('userData'), 'easytools.db'));
  registerIpc(database);
  createWindow();
});

app.on('will-quit', () => {
  if (!database) return;

  database.close();
  database = null;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
