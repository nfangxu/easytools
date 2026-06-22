import { contextBridge, ipcRenderer } from 'electron';

import type {
  EasyToolsApi,
  RecentRunInput,
  SettingValue,
} from '../shared/types';

const easytools: EasyToolsApi = {
  window: {
    minimize() {
      return ipcRenderer.invoke('window:minimize');
    },
    toggleMaximize() {
      return ipcRenderer.invoke('window:toggle-maximize');
    },
    close() {
      return ipcRenderer.invoke('window:close');
    },
  },
  getSetting(namespace: string) {
    return ipcRenderer.invoke('settings:get', namespace);
  },
  setSetting(namespace: string, value: SettingValue) {
    return ipcRenderer.invoke('settings:set', namespace, value);
  },
  listRecentRuns(toolId: string) {
    return ipcRenderer.invoke('recent-runs:list', toolId);
  },
  addRecentRun(input: RecentRunInput) {
    return ipcRenderer.invoke('recent-runs:add', input);
  },
};

contextBridge.exposeInMainWorld('easytools', easytools);
