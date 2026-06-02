# EasyTools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working Electron desktop toolbox with JSON, Base64, timestamp tools, SQLite-backed settings, and recent-run storage.

**Architecture:** Use Electron main/preload/renderer separation. Main process owns SQLite and IPC handlers; preload exposes a typed bridge; React renderer owns the app shell and tool modules. Utility transformations stay in pure TypeScript modules so they can be tested without Electron.

**Tech Stack:** Electron, electron-vite, React, TypeScript, Vite, Vitest, better-sqlite3, lucide-react.

---

## File Structure

- `package.json`: scripts, dependencies, and project metadata.
- `tsconfig.json`: shared TypeScript compiler options.
- `tsconfig.node.json`: TypeScript settings for Electron main/preload files.
- `tsconfig.web.json`: TypeScript settings for React renderer files.
- `electron.vite.config.ts`: electron-vite build configuration.
- `index.html`: renderer HTML entry.
- `src/main/index.ts`: Electron app lifecycle, window creation, and IPC setup.
- `src/main/database.ts`: SQLite initialization, schema, settings, and recent-run repository.
- `src/main/ipc.ts`: IPC channel registration.
- `src/preload/index.ts`: typed API exposed with `contextBridge`.
- `src/shared/types.ts`: shared app, settings, and recent-run types.
- `src/renderer/main.tsx`: React bootstrap.
- `src/renderer/App.tsx`: application shell composition.
- `src/renderer/styles.css`: global desktop utility styles.
- `src/renderer/tools/registry.ts`: tool registry.
- `src/renderer/tools/json/jsonUtils.ts`: pure JSON formatting helpers.
- `src/renderer/tools/json/JsonTool.tsx`: JSON tool UI.
- `src/renderer/tools/base64/base64Utils.ts`: pure Base64 helpers.
- `src/renderer/tools/base64/Base64Tool.tsx`: Base64 tool UI.
- `src/renderer/tools/timestamp/timestampUtils.ts`: pure timestamp helpers.
- `src/renderer/tools/timestamp/TimestampTool.tsx`: timestamp tool UI.
- `src/renderer/components/AppShell.tsx`: sidebar, main workspace, and recent-run layout.
- `src/renderer/components/ToolChrome.tsx`: reusable tool panel frame.
- `src/renderer/components/TextAreaPair.tsx`: reusable input/output text areas.
- `src/renderer/vite-env.d.ts`: Vite and preload bridge declarations.
- `tests/jsonUtils.test.ts`: JSON helper tests.
- `tests/base64Utils.test.ts`: Base64 helper tests.
- `tests/timestampUtils.test.ts`: timestamp helper tests.
- `tests/database.test.ts`: SQLite repository tests using a temporary database file.
- `.gitignore`: ignore dependencies, build output, local app artifacts, and brainstorming artifacts.

---

## Task 1: Scaffold Electron Vite React TypeScript Project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `tsconfig.web.json`
- Create: `electron.vite.config.ts`
- Create: `index.html`
- Create: `.gitignore`
- Create: `src/main/index.ts`
- Create: `src/preload/index.ts`
- Create: `src/renderer/main.tsx`
- Create: `src/renderer/App.tsx`
- Create: `src/renderer/styles.css`
- Create: `src/renderer/vite-env.d.ts`

- [ ] **Step 1: Create project metadata and scripts**

`package.json`:

```json
{
  "name": "easytools",
  "version": "0.1.0",
  "description": "Local Electron toolbox for daily utilities.",
  "main": "dist/main/index.js",
  "type": "module",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "npm run typecheck && electron-vite build",
    "typecheck": "tsc --noEmit -p tsconfig.node.json && tsc --noEmit -p tsconfig.web.json",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^5.0.0",
    "better-sqlite3": "^11.10.0",
    "electron": "^35.0.0",
    "electron-vite": "^3.1.0",
    "lucide-react": "^0.468.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.13",
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create TypeScript and build configuration**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

`tsconfig.node.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "ESNext",
    "types": ["node", "electron-vite/node"]
  },
  "include": ["electron.vite.config.ts", "src/main/**/*.ts", "src/preload/**/*.ts", "src/shared/**/*.ts", "tests/**/*.ts"]
}
```

`tsconfig.web.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "types": ["vite/client"]
  },
  "include": ["src/renderer/**/*.ts", "src/renderer/**/*.tsx", "src/shared/**/*.ts"]
}
```

`electron.vite.config.ts`:

```ts
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    plugins: [react()],
  },
});
```

- [ ] **Step 3: Create minimal Electron and React entries**

`src/main/index.ts`:

```ts
import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 920,
    minHeight: 620,
    title: 'EasyTools',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
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

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
```

`src/preload/index.ts`:

```ts
import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('easytools', {
  appVersion: '0.1.0',
});
```

`index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>EasyTools</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/renderer/main.tsx"></script>
  </body>
</html>
```

`src/renderer/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`src/renderer/App.tsx`:

```tsx
export function App(): JSX.Element {
  return (
    <main className="app">
      <aside className="sidebar">
        <div className="brand">EasyTools</div>
      </aside>
      <section className="workspace">
        <h1>EasyTools</h1>
        <p>选择左侧工具开始。</p>
      </section>
    </main>
  );
}
```

`src/renderer/styles.css`:

```css
:root {
  color: #172026;
  background: #f6f7f8;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 720px;
  min-height: 100vh;
}

button,
textarea,
input {
  font: inherit;
}

.app {
  display: grid;
  grid-template-columns: 240px 1fr;
  min-height: 100vh;
}

.sidebar {
  border-right: 1px solid #dde2e7;
  background: #ffffff;
  padding: 20px;
}

.brand {
  font-size: 18px;
  font-weight: 700;
}

.workspace {
  padding: 28px;
}
```

`src/renderer/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />

interface Window {
  easytools: {
    appVersion: string;
  };
}
```

`.gitignore`:

```gitignore
node_modules/
dist/
out/
*.log
.DS_Store
.superpowers/
coverage/
```

- [ ] **Step 4: Install dependencies**

Run: `npm install`

Expected: `package-lock.json` is created and dependencies install without errors.

- [ ] **Step 5: Run initial typecheck**

Run: `npm run typecheck`

Expected: TypeScript exits with code `0`.

- [ ] **Step 6: Commit scaffold**

```bash
git add .gitignore package.json package-lock.json tsconfig.json tsconfig.node.json tsconfig.web.json electron.vite.config.ts index.html src
git commit -m "feat: scaffold electron react app"
```

---

## Task 2: Add Pure Utility Functions With Tests

**Files:**
- Create: `src/renderer/tools/json/jsonUtils.ts`
- Create: `src/renderer/tools/base64/base64Utils.ts`
- Create: `src/renderer/tools/timestamp/timestampUtils.ts`
- Create: `tests/jsonUtils.test.ts`
- Create: `tests/base64Utils.test.ts`
- Create: `tests/timestampUtils.test.ts`

- [ ] **Step 1: Write failing JSON utility tests**

`tests/jsonUtils.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { compactJson, formatJson } from '../src/renderer/tools/json/jsonUtils';

describe('jsonUtils', () => {
  test('formats valid JSON with two-space indentation', () => {
    expect(formatJson('{"name":"EasyTools","items":[1,2]}')).toEqual({
      ok: true,
      value: '{\n  "name": "EasyTools",\n  "items": [\n    1,\n    2\n  ]\n}',
    });
  });

  test('compacts valid JSON', () => {
    expect(compactJson('{\n  "name": "EasyTools"\n}')).toEqual({
      ok: true,
      value: '{"name":"EasyTools"}',
    });
  });

  test('returns a parse error for invalid JSON', () => {
    const result = formatJson('{"name":');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('JSON');
  });
});
```

- [ ] **Step 2: Run JSON tests and verify red**

Run: `npm test -- tests/jsonUtils.test.ts`

Expected: fail because `jsonUtils` does not exist.

- [ ] **Step 3: Implement JSON utilities**

`src/renderer/tools/json/jsonUtils.ts`:

```ts
export type ToolResult = { ok: true; value: string } | { ok: false; error: string };

function parseJson(input: string): ToolResult | unknown {
  try {
    return JSON.parse(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown parse error';
    return { ok: false, error: `Invalid JSON: ${message}` };
  }
}

export function formatJson(input: string): ToolResult {
  const parsed = parseJson(input);
  if (isToolError(parsed)) return parsed;
  return { ok: true, value: JSON.stringify(parsed, null, 2) };
}

export function compactJson(input: string): ToolResult {
  const parsed = parseJson(input);
  if (isToolError(parsed)) return parsed;
  return { ok: true, value: JSON.stringify(parsed) };
}

function isToolError(value: unknown): value is { ok: false; error: string } {
  return Boolean(value && typeof value === 'object' && 'ok' in value && value.ok === false);
}
```

- [ ] **Step 4: Write failing Base64 tests**

`tests/base64Utils.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { decodeBase64, encodeBase64 } from '../src/renderer/tools/base64/base64Utils';

describe('base64Utils', () => {
  test('encodes UTF-8 text', () => {
    expect(encodeBase64('EasyTools 中文')).toEqual({
      ok: true,
      value: 'RWFzeVRvb2xzIOS4reaWhw==',
    });
  });

  test('decodes UTF-8 text', () => {
    expect(decodeBase64('RWFzeVRvb2xzIOS4reaWhw==')).toEqual({
      ok: true,
      value: 'EasyTools 中文',
    });
  });

  test('returns an error for invalid Base64', () => {
    const result = decodeBase64('not valid %%%');
    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 5: Run Base64 tests and verify red**

Run: `npm test -- tests/base64Utils.test.ts`

Expected: fail because `base64Utils` does not exist.

- [ ] **Step 6: Implement Base64 utilities**

`src/renderer/tools/base64/base64Utils.ts`:

```ts
import type { ToolResult } from '../json/jsonUtils';

export function encodeBase64(input: string): ToolResult {
  return { ok: true, value: Buffer.from(input, 'utf8').toString('base64') };
}

export function decodeBase64(input: string): ToolResult {
  const normalized = input.trim();
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized) || normalized.length % 4 !== 0) {
    return { ok: false, error: 'Invalid Base64 input.' };
  }

  try {
    return { ok: true, value: Buffer.from(normalized, 'base64').toString('utf8') };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown decode error';
    return { ok: false, error: `Invalid Base64 input: ${message}` };
  }
}
```

- [ ] **Step 7: Write failing timestamp tests**

`tests/timestampUtils.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { dateToTimestamp, timestampToDate } from '../src/renderer/tools/timestamp/timestampUtils';

describe('timestampUtils', () => {
  test('converts Unix seconds to ISO localizable date string', () => {
    expect(timestampToDate('1704067200')).toEqual({
      ok: true,
      value: '2024-01-01 00:00:00',
      milliseconds: 1704067200000,
    });
  });

  test('converts Unix milliseconds to date string', () => {
    expect(timestampToDate('1704067200000')).toEqual({
      ok: true,
      value: '2024-01-01 00:00:00',
      milliseconds: 1704067200000,
    });
  });

  test('converts date string to seconds and milliseconds', () => {
    expect(dateToTimestamp('2024-01-01 00:00:00')).toEqual({
      ok: true,
      seconds: 1704067200,
      milliseconds: 1704067200000,
    });
  });
});
```

- [ ] **Step 8: Run timestamp tests and verify red**

Run: `TZ=UTC npm test -- tests/timestampUtils.test.ts`

Expected: fail because `timestampUtils` does not exist.

- [ ] **Step 9: Implement timestamp utilities**

`src/renderer/tools/timestamp/timestampUtils.ts`:

```ts
type TimestampToDateResult =
  | { ok: true; value: string; milliseconds: number }
  | { ok: false; error: string };

type DateToTimestampResult =
  | { ok: true; seconds: number; milliseconds: number }
  | { ok: false; error: string };

export function timestampToDate(input: string): TimestampToDateResult {
  const trimmed = input.trim();
  if (!/^\d{10}(\d{3})?$/.test(trimmed)) {
    return { ok: false, error: 'Timestamp must be 10-digit seconds or 13-digit milliseconds.' };
  }

  const milliseconds = trimmed.length === 10 ? Number(trimmed) * 1000 : Number(trimmed);
  return { ok: true, value: formatDate(new Date(milliseconds)), milliseconds };
}

export function dateToTimestamp(input: string): DateToTimestampResult {
  const normalized = input.trim().replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, error: 'Date must be parseable, for example 2024-01-01 00:00:00.' };
  }

  const milliseconds = date.getTime();
  return { ok: true, seconds: Math.floor(milliseconds / 1000), milliseconds };
}

function formatDate(date: Date): string {
  const parts = [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ];

  return `${parts[0]}-${parts[1]}-${parts[2]} ${parts[3]}:${parts[4]}:${parts[5]}`;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}
```

- [ ] **Step 10: Run all utility tests**

Run: `TZ=UTC npm test -- tests/jsonUtils.test.ts tests/base64Utils.test.ts tests/timestampUtils.test.ts`

Expected: all utility tests pass.

- [ ] **Step 11: Commit utility functions**

```bash
git add src/renderer/tools tests
git commit -m "feat: add core tool utilities"
```

---

## Task 3: Add SQLite Repository And IPC Bridge

**Files:**
- Create: `src/shared/types.ts`
- Create: `src/main/database.ts`
- Create: `src/main/ipc.ts`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/renderer/vite-env.d.ts`
- Create: `tests/database.test.ts`

- [ ] **Step 1: Write failing database tests**

`tests/database.test.ts`:

```ts
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { createDatabase } from '../src/main/database';

let tempDir: string | undefined;

afterEach(() => {
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  tempDir = undefined;
});

describe('database', () => {
  test('persists settings by namespace', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'easytools-'));
    const db = createDatabase(join(tempDir, 'easytools.db'));

    db.setSetting('json', { indent: 2 });

    expect(db.getSetting('json')).toEqual({ indent: 2 });
    db.close();
  });

  test('stores recent runs without raw input', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'easytools-'));
    const db = createDatabase(join(tempDir, 'easytools.db'));

    db.addRecentRun({
      toolId: 'base64',
      operation: 'encode',
      summary: 'Encoded 12 characters',
      preview: 'RWFzeVRvb2xz',
    });

    expect(db.listRecentRuns()).toMatchObject([
      {
        toolId: 'base64',
        operation: 'encode',
        summary: 'Encoded 12 characters',
        preview: 'RWFzeVRvb2xz',
      },
    ]);
    db.close();
  });
});
```

- [ ] **Step 2: Run database tests and verify red**

Run: `npm test -- tests/database.test.ts`

Expected: fail because `src/main/database.ts` does not exist.

- [ ] **Step 3: Define shared types**

`src/shared/types.ts`:

```ts
export type SettingValue = Record<string, unknown> | string | number | boolean | null;

export interface RecentRunInput {
  toolId: string;
  operation: string;
  summary: string;
  preview?: string;
}

export interface RecentRun extends RecentRunInput {
  id: number;
  createdAt: string;
}

export interface EasyToolsApi {
  getSetting(namespace: string): Promise<SettingValue | null>;
  setSetting(namespace: string, value: SettingValue): Promise<void>;
  listRecentRuns(): Promise<RecentRun[]>;
  addRecentRun(input: RecentRunInput): Promise<RecentRun>;
}
```

- [ ] **Step 4: Implement SQLite repository**

`src/main/database.ts`:

```ts
import Database from 'better-sqlite3';
import type { RecentRun, RecentRunInput, SettingValue } from '../shared/types';

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

  return {
    getSetting(namespace: string): SettingValue | null {
      const row = sqlite.prepare('SELECT value FROM settings WHERE namespace = ?').get(namespace) as
        | { value: string }
        | undefined;
      return row ? (JSON.parse(row.value) as SettingValue) : null;
    },

    setSetting(namespace: string, value: SettingValue): void {
      sqlite
        .prepare(
          `INSERT INTO settings (namespace, value, updated_at)
           VALUES (?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(namespace) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
        )
        .run(namespace, JSON.stringify(value));
    },

    addRecentRun(input: RecentRunInput): RecentRun {
      const result = sqlite
        .prepare(
          `INSERT INTO recent_runs (tool_id, operation, summary, preview)
           VALUES (?, ?, ?, ?)`,
        )
        .run(input.toolId, input.operation, input.summary, input.preview ?? null);

      const row = sqlite
        .prepare('SELECT * FROM recent_runs WHERE id = ?')
        .get(result.lastInsertRowid) as RecentRunRow;
      return mapRecentRun(row);
    },

    listRecentRuns(): RecentRun[] {
      const rows = sqlite
        .prepare('SELECT * FROM recent_runs ORDER BY id DESC LIMIT 20')
        .all() as RecentRunRow[];
      return rows.map(mapRecentRun);
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
```

- [ ] **Step 5: Implement IPC bridge**

`src/main/ipc.ts`:

```ts
import { ipcMain } from 'electron';
import type { createDatabase } from './database';
import type { RecentRunInput, SettingValue } from '../shared/types';

type AppDatabase = ReturnType<typeof createDatabase>;

export function registerIpc(database: AppDatabase): void {
  ipcMain.handle('settings:get', (_event, namespace: string) => database.getSetting(namespace));
  ipcMain.handle('settings:set', (_event, namespace: string, value: SettingValue) => {
    database.setSetting(namespace, value);
  });
  ipcMain.handle('recent-runs:list', () => database.listRecentRuns());
  ipcMain.handle('recent-runs:add', (_event, input: RecentRunInput) => database.addRecentRun(input));
}
```

Update `src/main/index.ts` to initialize the database before creating the window:

```ts
import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';
import { createDatabase } from './database';
import { registerIpc } from './ipc';

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 920,
    minHeight: 620,
    title: 'EasyTools',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
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
  const database = createDatabase(join(app.getPath('userData'), 'easytools.db'));
  registerIpc(database);
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
```

Update `src/preload/index.ts`:

```ts
import { contextBridge, ipcRenderer } from 'electron';
import type { EasyToolsApi, RecentRunInput, SettingValue } from '../shared/types';

const api: EasyToolsApi = {
  getSetting: (namespace) => ipcRenderer.invoke('settings:get', namespace),
  setSetting: (namespace, value: SettingValue) => ipcRenderer.invoke('settings:set', namespace, value),
  listRecentRuns: () => ipcRenderer.invoke('recent-runs:list'),
  addRecentRun: (input: RecentRunInput) => ipcRenderer.invoke('recent-runs:add', input),
};

contextBridge.exposeInMainWorld('easytools', api);
```

Update `src/renderer/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />

import type { EasyToolsApi } from '../shared/types';

declare global {
  interface Window {
    easytools: EasyToolsApi;
  }
}
```

- [ ] **Step 6: Run database tests**

Run: `npm test -- tests/database.test.ts`

Expected: database tests pass.

- [ ] **Step 7: Run typecheck**

Run: `npm run typecheck`

Expected: TypeScript exits with code `0`.

- [ ] **Step 8: Commit database and IPC**

```bash
git add src/main src/preload src/shared src/renderer/vite-env.d.ts tests/database.test.ts
git commit -m "feat: add sqlite storage and ipc bridge"
```

---

## Task 4: Build Tool Registry And React UI

**Files:**
- Create: `src/renderer/tools/registry.ts`
- Create: `src/renderer/tools/json/JsonTool.tsx`
- Create: `src/renderer/tools/base64/Base64Tool.tsx`
- Create: `src/renderer/tools/timestamp/TimestampTool.tsx`
- Create: `src/renderer/components/AppShell.tsx`
- Create: `src/renderer/components/ToolChrome.tsx`
- Create: `src/renderer/components/TextAreaPair.tsx`
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/styles.css`

- [ ] **Step 1: Create reusable UI primitives**

`src/renderer/components/ToolChrome.tsx`:

```tsx
import type { ReactNode } from 'react';

interface ToolChromeProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function ToolChrome({ title, description, children }: ToolChromeProps): JSX.Element {
  return (
    <section className="tool-panel">
      <header className="tool-header">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </header>
      {children}
    </section>
  );
}
```

`src/renderer/components/TextAreaPair.tsx`:

```tsx
interface TextAreaPairProps {
  input: string;
  output: string;
  inputLabel: string;
  outputLabel: string;
  onInputChange: (value: string) => void;
}

export function TextAreaPair({
  input,
  output,
  inputLabel,
  outputLabel,
  onInputChange,
}: TextAreaPairProps): JSX.Element {
  return (
    <div className="text-pair">
      <label className="field">
        <span>{inputLabel}</span>
        <textarea value={input} onChange={(event) => onInputChange(event.target.value)} spellCheck={false} />
      </label>
      <label className="field">
        <span>{outputLabel}</span>
        <textarea value={output} readOnly spellCheck={false} />
      </label>
    </div>
  );
}
```

- [ ] **Step 2: Create tool components**

`src/renderer/tools/json/JsonTool.tsx`:

```tsx
import { useState } from 'react';
import { TextAreaPair } from '../../components/TextAreaPair';
import { ToolChrome } from '../../components/ToolChrome';
import { compactJson, formatJson } from './jsonUtils';

export function JsonTool(): JSX.Element {
  const [input, setInput] = useState('{"name":"EasyTools","tools":["JSON","Base64","Timestamp"]}');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  function run(operation: 'format' | 'compact'): void {
    const result = operation === 'format' ? formatJson(input) : compactJson(input);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError('');
    setOutput(result.value);
    void window.easytools.addRecentRun({
      toolId: 'json',
      operation,
      summary: `${operation === 'format' ? 'Formatted' : 'Compacted'} JSON`,
      preview: result.value.slice(0, 120),
    });
  }

  return (
    <ToolChrome title="JSON 格式化" description="校验、格式化或压缩 JSON。">
      <div className="actions">
        <button onClick={() => run('format')}>格式化</button>
        <button onClick={() => run('compact')}>压缩</button>
        <button onClick={() => setInput('')}>清空</button>
        <button onClick={() => navigator.clipboard.writeText(output)} disabled={!output}>
          复制输出
        </button>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <TextAreaPair input={input} output={output} inputLabel="输入" outputLabel="输出" onInputChange={setInput} />
    </ToolChrome>
  );
}
```

`src/renderer/tools/base64/Base64Tool.tsx`:

```tsx
import { useState } from 'react';
import { TextAreaPair } from '../../components/TextAreaPair';
import { ToolChrome } from '../../components/ToolChrome';
import { decodeBase64, encodeBase64 } from './base64Utils';

export function Base64Tool(): JSX.Element {
  const [input, setInput] = useState('EasyTools 中文');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  function run(operation: 'encode' | 'decode'): void {
    const result = operation === 'encode' ? encodeBase64(input) : decodeBase64(input);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError('');
    setOutput(result.value);
    void window.easytools.addRecentRun({
      toolId: 'base64',
      operation,
      summary: `${operation === 'encode' ? 'Encoded' : 'Decoded'} Base64`,
      preview: result.value.slice(0, 120),
    });
  }

  function swap(): void {
    setInput(output);
    setOutput(input);
  }

  return (
    <ToolChrome title="Base64 加解密" description="支持 UTF-8 文本编码和解码。">
      <div className="actions">
        <button onClick={() => run('encode')}>编码</button>
        <button onClick={() => run('decode')}>解码</button>
        <button onClick={swap} disabled={!output}>交换</button>
        <button onClick={() => navigator.clipboard.writeText(output)} disabled={!output}>
          复制输出
        </button>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <TextAreaPair input={input} output={output} inputLabel="输入" outputLabel="输出" onInputChange={setInput} />
    </ToolChrome>
  );
}
```

`src/renderer/tools/timestamp/TimestampTool.tsx`:

```tsx
import { useState } from 'react';
import { ToolChrome } from '../../components/ToolChrome';
import { dateToTimestamp, timestampToDate } from './timestampUtils';

export function TimestampTool(): JSX.Element {
  const [timestamp, setTimestamp] = useState('1704067200');
  const [dateText, setDateText] = useState('2024-01-01 00:00:00');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  function convertTimestamp(): void {
    const converted = timestampToDate(timestamp);
    if (!converted.ok) {
      setError(converted.error);
      return;
    }
    setError('');
    setDateText(converted.value);
    setResult(`${converted.value}\n${converted.milliseconds} ms`);
    void window.easytools.addRecentRun({
      toolId: 'timestamp',
      operation: 'timestamp-to-date',
      summary: 'Converted timestamp to date',
      preview: converted.value,
    });
  }

  function convertDate(): void {
    const converted = dateToTimestamp(dateText);
    if (!converted.ok) {
      setError(converted.error);
      return;
    }
    setError('');
    setTimestamp(String(converted.seconds));
    setResult(`${converted.seconds} s\n${converted.milliseconds} ms`);
    void window.easytools.addRecentRun({
      toolId: 'timestamp',
      operation: 'date-to-timestamp',
      summary: 'Converted date to timestamp',
      preview: String(converted.seconds),
    });
  }

  return (
    <ToolChrome title="时间戳转换" description="支持秒、毫秒和日期时间互转。">
      <div className="timestamp-grid">
        <label className="field">
          <span>时间戳</span>
          <input value={timestamp} onChange={(event) => setTimestamp(event.target.value)} />
          <button onClick={convertTimestamp}>转日期</button>
        </label>
        <label className="field">
          <span>日期时间</span>
          <input value={dateText} onChange={(event) => setDateText(event.target.value)} />
          <button onClick={convertDate}>转时间戳</button>
        </label>
        <label className="field full">
          <span>结果</span>
          <textarea value={result} readOnly />
        </label>
      </div>
      {error ? <p className="error">{error}</p> : null}
    </ToolChrome>
  );
}
```

- [ ] **Step 3: Create registry and app shell**

`src/renderer/tools/registry.ts`:

```tsx
import type { ComponentType } from 'react';
import { Base64Tool } from './base64/Base64Tool';
import { JsonTool } from './json/JsonTool';
import { TimestampTool } from './timestamp/TimestampTool';

export interface ToolDefinition {
  id: string;
  name: string;
  category: string;
  component: ComponentType;
}

export const tools: ToolDefinition[] = [
  { id: 'json', name: 'JSON 格式化', category: '文本处理', component: JsonTool },
  { id: 'base64', name: 'Base64 加解密', category: '文本处理', component: Base64Tool },
  { id: 'timestamp', name: '时间戳转换', category: '时间日期', component: TimestampTool },
];
```

`src/renderer/components/AppShell.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import type { RecentRun } from '../../shared/types';
import { tools } from '../tools/registry';

export function AppShell(): JSX.Element {
  const [selectedToolId, setSelectedToolId] = useState(tools[0].id);
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);
  const selectedTool = tools.find((tool) => tool.id === selectedToolId) ?? tools[0];
  const ToolComponent = selectedTool.component;

  const groupedTools = useMemo(() => {
    return tools.reduce<Record<string, typeof tools>>((groups, tool) => {
      groups[tool.category] = groups[tool.category] ?? [];
      groups[tool.category].push(tool);
      return groups;
    }, {});
  }, []);

  useEffect(() => {
    void window.easytools.listRecentRuns().then(setRecentRuns);
  }, [selectedToolId]);

  return (
    <main className="app">
      <aside className="sidebar">
        <div className="brand">EasyTools</div>
        {Object.entries(groupedTools).map(([category, categoryTools]) => (
          <nav className="nav-group" key={category} aria-label={category}>
            <div className="nav-title">{category}</div>
            {categoryTools.map((tool) => (
              <button
                className={tool.id === selectedToolId ? 'nav-item active' : 'nav-item'}
                key={tool.id}
                onClick={() => setSelectedToolId(tool.id)}
              >
                {tool.name}
              </button>
            ))}
          </nav>
        ))}
      </aside>
      <section className="workspace">
        <ToolComponent />
      </section>
      <aside className="recent">
        <h2>最近记录</h2>
        {recentRuns.length === 0 ? (
          <p className="muted">暂无记录</p>
        ) : (
          <ul>
            {recentRuns.map((run) => (
              <li key={run.id}>
                <strong>{run.summary}</strong>
                <span>{run.preview ?? run.operation}</span>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </main>
  );
}
```

Update `src/renderer/App.tsx`:

```tsx
import { AppShell } from './components/AppShell';

export function App(): JSX.Element {
  return <AppShell />;
}
```

- [ ] **Step 4: Replace CSS with full desktop UI styles**

`src/renderer/styles.css` should define:

```css
:root {
  color: #172026;
  background: #f6f7f8;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 720px;
  min-height: 100vh;
}

button,
textarea,
input {
  font: inherit;
}

button {
  border: 1px solid #cfd7df;
  border-radius: 6px;
  background: #ffffff;
  color: #172026;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  min-height: 34px;
  padding: 0 12px;
}

button:hover:not(:disabled) {
  border-color: #7b8794;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.app {
  display: grid;
  grid-template-columns: 230px minmax(0, 1fr) 280px;
  min-height: 100vh;
}

.sidebar,
.recent {
  background: #ffffff;
  padding: 20px;
}

.sidebar {
  border-right: 1px solid #dde2e7;
}

.recent {
  border-left: 1px solid #dde2e7;
}

.brand {
  font-size: 19px;
  font-weight: 800;
  margin-bottom: 28px;
}

.nav-group {
  display: grid;
  gap: 8px;
  margin-bottom: 22px;
}

.nav-title {
  color: #6b7280;
  font-size: 12px;
  font-weight: 700;
}

.nav-item {
  justify-content: flex-start;
  text-align: left;
  width: 100%;
}

.nav-item.active {
  background: #172026;
  border-color: #172026;
  color: #ffffff;
}

.workspace {
  min-width: 0;
  padding: 28px;
}

.tool-panel {
  display: grid;
  gap: 18px;
  max-width: 920px;
}

.tool-header h1 {
  font-size: 28px;
  line-height: 1.2;
  margin: 0;
}

.tool-header p,
.muted {
  color: #66717d;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.text-pair {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field {
  display: grid;
  gap: 8px;
}

.field span {
  color: #34414d;
  font-size: 13px;
  font-weight: 700;
}

textarea,
input {
  border: 1px solid #cfd7df;
  border-radius: 8px;
  background: #ffffff;
  color: #172026;
  outline: none;
  padding: 12px;
}

textarea {
  min-height: 380px;
  resize: vertical;
}

input {
  min-height: 42px;
}

textarea:focus,
input:focus {
  border-color: #2878bd;
  box-shadow: 0 0 0 3px rgba(40, 120, 189, 0.14);
}

.error {
  border: 1px solid #f2b8b5;
  border-radius: 8px;
  background: #fff4f2;
  color: #a9352a;
  margin: 0;
  padding: 10px 12px;
}

.timestamp-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.timestamp-grid .full {
  grid-column: 1 / -1;
}

.recent h2 {
  font-size: 16px;
  margin: 0 0 14px;
}

.recent ul {
  display: grid;
  gap: 12px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.recent li {
  border: 1px solid #e1e6eb;
  border-radius: 8px;
  display: grid;
  gap: 5px;
  padding: 10px;
}

.recent li span {
  color: #66717d;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 980px) {
  .app {
    grid-template-columns: 210px minmax(0, 1fr);
  }

  .recent {
    display: none;
  }

  .text-pair,
  .timestamp-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 5: Run typecheck and tests**

Run: `TZ=UTC npm test && npm run typecheck`

Expected: all tests pass and TypeScript exits with code `0`.

- [ ] **Step 6: Commit UI**

```bash
git add src/renderer
git commit -m "feat: add toolbox user interface"
```

---

## Task 5: Final Build And Manual Verification

**Files:**
- Modify only if verification finds issues in existing files.

- [ ] **Step 1: Run full tests**

Run: `TZ=UTC npm test`

Expected: all test files pass.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

Expected: TypeScript exits with code `0`.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: electron-vite build exits with code `0` and writes `dist/`.

- [ ] **Step 4: Start development app**

Run: `npm run dev`

Expected: Electron app opens or the dev server starts without fatal errors. Verify sidebar switches tools and each tool produces output.

- [ ] **Step 5: Commit verification fixes if any**

If files changed during verification:

```bash
git add <changed-files>
git commit -m "fix: polish easytools verification issues"
```

If no files changed, do not create an empty commit.

---

## Self-Review

- Spec coverage: the plan covers Electron/React/TypeScript scaffolding, main/preload/renderer boundaries, SQLite settings and recent runs, the three initial tools, extensible registry, app shell UI, and verification.
- Placeholder scan: no unresolved deferred-work markers remain; all tasks have concrete files, code, commands, and expected outcomes.
- Type consistency: `EasyToolsApi`, `RecentRun`, and utility result shapes are defined once and reused consistently across main, preload, renderer, and tests.
