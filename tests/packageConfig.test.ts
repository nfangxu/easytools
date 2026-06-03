import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface PackageJson {
  scripts?: Record<string, string>;
  devDependencies?: Record<string, string>;
  build?: {
    appId?: string;
    productName?: string;
    directories?: { output?: string };
    files?: string[];
    extraMetadata?: { main?: string };
    npmRebuild?: boolean;
    win?: { target?: string[] };
    mac?: { target?: string[] };
  };
}

function readPackageJson(): PackageJson {
  return JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as PackageJson;
}

describe('package build config', () => {
  it('defines electron-builder scripts and dependency', () => {
    const packageJson = readPackageJson();

    expect(packageJson.devDependencies).toHaveProperty('electron-builder');
    expect(packageJson.scripts?.dist).toBe('npm run build && electron-builder');
    expect(packageJson.scripts?.['dist:win']).toBe('npm run build && electron-builder --win');
    expect(packageJson.scripts?.['dist:mac']).toBe('npm run build && electron-builder --mac');
  });

  it('packages the built electron-vite output with platform targets', () => {
    const build = readPackageJson().build;

    expect(build?.appId).toBe('com.easytools.app');
    expect(build?.productName).toBe('EasyTools');
    expect(build?.directories?.output).toBe('dist');
    expect(build?.files).toEqual(['out/**', 'package.json']);
    expect(build?.extraMetadata?.main).toBe('out/main/index.js');
    expect(build?.npmRebuild).toBe(false);
    expect(build?.win?.target).toEqual(['nsis', 'zip']);
    expect(build?.mac?.target).toEqual(['dmg']);
  });
});
