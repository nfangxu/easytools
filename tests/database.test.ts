import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDatabase } from '../src/main/database';

describe('database repository', () => {
  let tempDir: string;
  let db: ReturnType<typeof createDatabase>;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'easytools-'));
    db = createDatabase(join(tempDir, 'easytools.db'));
  });

  afterEach(() => {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('persists settings by namespace', () => {
    db.setSetting('json', { indent: 2 });

    expect(db.getSetting('json')).toEqual({ indent: 2 });
  });

  it('persists settings after close and reopen', () => {
    const databasePath = join(tempDir, 'easytools.db');

    db.setSetting('json', { indent: 4 });
    db.close();
    db = createDatabase(databasePath);

    expect(db.getSetting('json')).toEqual({ indent: 4 });
  });

  it('lists recent runs without raw input', () => {
    db.addRecentRun({
      toolId: 'base64',
      operation: 'encode',
      summary: 'Encoded 12 characters',
      preview: 'RWFzeVRvb2xz',
    });

    const [recentRun] = db.listRecentRuns();

    expect(recentRun).toMatchObject({
      toolId: 'base64',
      operation: 'encode',
      summary: 'Encoded 12 characters',
      preview: 'RWFzeVRvb2xz',
    });
    expect(recentRun.id).toEqual(expect.any(Number));
    expect(recentRun.createdAt).toEqual(expect.any(String));
    expect(recentRun.createdAt).not.toHaveLength(0);
    expect(Object.keys(recentRun).sort()).toEqual(
      ['createdAt', 'id', 'operation', 'preview', 'summary', 'toolId'].sort(),
    );
  });
});
