import { describe, expect, it } from 'vitest';
import type { InlineConfig } from 'vite';

import config from '../electron.vite.config';

interface ElectronViteConfig {
  preload?: InlineConfig;
}

const electronViteConfig = config as ElectronViteConfig;

describe('electron-vite config', () => {
  it('builds preload as CommonJS so packaged Electron loads the bridge API', () => {
    expect(electronViteConfig.preload?.build?.rollupOptions?.output).toMatchObject({
      format: 'cjs',
      entryFileNames: '[name].cjs',
    });
  });
});
