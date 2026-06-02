import { contextBridge, ipcRenderer } from 'electron';

import type {
  EasyToolsApi,
  RecentRunInput,
  SettingValue,
} from '../shared/types';

const easytools: EasyToolsApi = {
  getSetting(namespace: string) {
    return ipcRenderer.invoke('settings:get', namespace);
  },
  setSetting(namespace: string, value: SettingValue) {
    return ipcRenderer.invoke('settings:set', namespace, value);
  },
  listRecentRuns() {
    return ipcRenderer.invoke('recent-runs:list');
  },
  addRecentRun(input: RecentRunInput) {
    return ipcRenderer.invoke('recent-runs:add', input);
  },
};

contextBridge.exposeInMainWorld('easytools', easytools);
