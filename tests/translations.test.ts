import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const projectRoot = dirname(__dirname);
const scriptPath = join(projectRoot, 'scripts/check-translations.mjs');
const realTranslationsPath = join(
  projectRoot,
  'src/renderer/i18n/translations.ts',
);
const realTranslations = readFileSync(realTranslationsPath, 'utf8');

interface RunResult {
  status: number;
  stdout: string;
  stderr: string;
}

/**
 * Run the translation check against a copy of translations.ts placed in a
 * temporary sandbox, so the real file is never mutated by the tests.
 */
function runCheckOn(content: string): RunResult {
  const sandbox = mkdtempSync(join(tmpdir(), 'easytools-translations-'));
  // The script's `root` is `dirname(dirname(fileURLToPath(import.meta.url)))`,
  // so the script must live at <sandbox>/scripts/check-translations.mjs for
  // its `root` to resolve to <sandbox>.
  const sandboxScriptsDir = join(sandbox, 'scripts');
  const sandboxTranslationsDir = join(sandbox, 'src', 'renderer', 'i18n');
  mkdirSync(sandboxScriptsDir, { recursive: true });
  mkdirSync(sandboxTranslationsDir, { recursive: true });
  copyFileSync(scriptPath, join(sandboxScriptsDir, 'check-translations.mjs'));
  writeFileSync(join(sandboxTranslationsDir, 'translations.ts'), content);

  const result = spawnSync(
    process.execPath,
    [join(sandboxScriptsDir, 'check-translations.mjs')],
    { encoding: 'utf8' },
  );
  rmSync(sandbox, { recursive: true, force: true });
  return {
    status: result.status ?? 0,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

describe('check-translations', () => {
  beforeAll(() => {
    expect(realTranslations).toContain('const en = {');
    expect(realTranslations).toMatch(/const\s+zh\b/);
  });

  it('exits 0 against the current translations.ts', () => {
    const result = runCheckOn(realTranslations);
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toMatch(/both tables in sync/);
  });

  it('fails when zh has a key missing from en', () => {
    // Anchor on the zh table's own type annotation, which is unique:
    //   const zh: Record<keyof typeof en, string> = {
    // and insert a key right after the opening brace.
    const zhOpen = 'const zh: Record<keyof typeof en, string> = {';
    const openIdx = realTranslations.indexOf(zhOpen);
    expect(openIdx, 'zh table declaration is not in its expected form').toBeGreaterThan(-1);
    const braceIdx = openIdx + zhOpen.length - 1;
    const mutated =
      realTranslations.slice(0, braceIdx + 1) +
      "\n  'extra.untranslated': '只此一份'," +
      realTranslations.slice(braceIdx + 1);
    const result = runCheckOn(mutated);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('extra.untranslated');
  });

  it('fails when en has a key missing from zh', () => {
    // The en table closes with 'satisfies Record<string, string>;' — that
    // exact suffix is unique. Insert just before the closing brace.
    const satisfiesIdx = realTranslations.indexOf('} satisfies Record<string, string>;');
    expect(satisfiesIdx).toBeGreaterThan(-1);
    const mutated =
      realTranslations.slice(0, satisfiesIdx) +
      "  'extra.en-only': 'English-only key',\n" +
      realTranslations.slice(satisfiesIdx);
    const result = runCheckOn(mutated);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('extra.en-only');
  });
});
