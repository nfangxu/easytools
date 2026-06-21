import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function readWorkflow(): string {
  return readFileSync(join(process.cwd(), '.github/workflows/release.yml'), 'utf8');
}

describe('release workflow', () => {
  it('only runs release packaging for version tags', () => {
    const workflow = readWorkflow();

    expect(workflow).toContain('push:');
    expect(workflow).toContain('tags:');
    expect(workflow).toContain("'v*'");
  });

  it('builds Windows and macOS installers with platform scripts', () => {
    const workflow = readWorkflow();

    expect(workflow).toContain('windows-latest');
    expect(workflow).toContain('macos-latest');
    expect(workflow).toContain('npm run dist:win');
    expect(workflow).toContain('npm run dist:mac');
  });

  it('builds both Apple Silicon and Intel macOS installers on native runners', () => {
    const workflow = readWorkflow();

    // Apple Silicon — macos-latest currently resolves to macos-14/15 (ARM64).
    expect(workflow).toContain('macos-latest');
    // Intel — the `macos-*-intel` family is the only x64 image GitHub
    // currently offers; `macos-13` was retired in 2025 and the job sat
    // stuck in "Waiting for a runner" forever.
    expect(workflow).toContain('macos-15-intel');
  });

  it('uploads built installers to the GitHub release', () => {
    const workflow = readWorkflow();

    expect(workflow).toContain('softprops/action-gh-release');
    expect(workflow).toContain('dist/*.exe');
    expect(workflow).toContain('dist/*.zip');
    expect(workflow).toContain('dist/*.dmg');
  });
});
