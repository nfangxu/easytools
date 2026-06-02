/// <reference types="vite/client" />

import type { EasyToolsApi } from '../shared/types';

declare global {
  interface Window {
    easytools: EasyToolsApi;
  }
}

export {};
