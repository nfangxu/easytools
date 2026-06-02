import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('easytools', {
  appVersion: '0.1.0',
});
