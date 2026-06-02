import { ipcMain } from 'electron';

import type { RecentRunInput, SettingValue } from '../shared/types';
import type { createDatabase } from './database';

export function registerIpc(database: ReturnType<typeof createDatabase>): void {
  ipcMain.handle('settings:get', (_event, namespace: string) =>
    database.getSetting(namespace),
  );

  ipcMain.handle(
    'settings:set',
    (_event, namespace: string, value: SettingValue) => {
      database.setSetting(namespace, value);
    },
  );

  ipcMain.handle('recent-runs:list', () => database.listRecentRuns());

  ipcMain.handle('recent-runs:add', (_event, input: RecentRunInput) =>
    database.addRecentRun(input),
  );
}
