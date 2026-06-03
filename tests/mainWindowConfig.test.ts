import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('main window config', () => {
  it('loads the CommonJS preload file built for packaged Electron', () => {
    const source = readFileSync(join(process.cwd(), 'src/main/index.ts'), 'utf8');

    expect(source).toContain("preload: join(__dirname, '../preload/index.cjs')");
    expect(source).not.toContain('../preload/index.mjs');
  });
});
