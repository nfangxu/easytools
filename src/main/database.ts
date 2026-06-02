import Database from 'better-sqlite3';

import type { RecentRun, RecentRunInput, SettingValue } from '../shared/types';

interface SettingRow {
  value: string;
}

interface RecentRunRow {
  id: number;
  tool_id: string;
  operation: string;
  summary: string;
  preview: string | null;
  created_at: string;
}

export function createDatabase(path: string) {
  const sqlite = new Database(path);

  sqlite.pragma('journal_mode = WAL');
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      namespace TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS recent_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tool_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      summary TEXT NOT NULL,
      preview TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const getSettingStatement = sqlite.prepare<[string], SettingRow>(
    'SELECT value FROM settings WHERE namespace = ?',
  );
  const setSettingStatement = sqlite.prepare<[string, string]>(`
    INSERT INTO settings (namespace, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(namespace) DO UPDATE SET
      value = excluded.value,
      updated_at = CURRENT_TIMESTAMP
  `);
  const insertRecentRunStatement = sqlite.prepare<
    [string, string, string, string | null]
  >(`
    INSERT INTO recent_runs (tool_id, operation, summary, preview)
    VALUES (?, ?, ?, ?)
  `);
  const getRecentRunStatement = sqlite.prepare<[number], RecentRunRow>(
    'SELECT id, tool_id, operation, summary, preview, created_at FROM recent_runs WHERE id = ?',
  );
  const listRecentRunsStatement = sqlite.prepare<[], RecentRunRow>(`
    SELECT id, tool_id, operation, summary, preview, created_at
    FROM recent_runs
    ORDER BY created_at DESC, id DESC
    LIMIT 20
  `);

  return {
    getSetting(namespace: string): SettingValue | null {
      const row = getSettingStatement.get(namespace);
      return row ? (JSON.parse(row.value) as SettingValue) : null;
    },

    setSetting(namespace: string, value: SettingValue): void {
      setSettingStatement.run(namespace, JSON.stringify(value));
    },

    addRecentRun(input: RecentRunInput): RecentRun {
      const result = insertRecentRunStatement.run(
        input.toolId,
        input.operation,
        input.summary,
        input.preview ?? null,
      );
      const row = getRecentRunStatement.get(Number(result.lastInsertRowid));

      if (!row) {
        throw new Error('Failed to load inserted recent run');
      }

      return mapRecentRun(row);
    },

    listRecentRuns(): RecentRun[] {
      return listRecentRunsStatement.all().map(mapRecentRun);
    },

    close(): void {
      sqlite.close();
    },
  };
}

function mapRecentRun(row: RecentRunRow): RecentRun {
  return {
    id: row.id,
    toolId: row.tool_id,
    operation: row.operation,
    summary: row.summary,
    preview: row.preview ?? undefined,
    createdAt: row.created_at,
  };
}
