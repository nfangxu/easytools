import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const mode = process.argv[2];
const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const sqliteDir = join(projectRoot, 'node_modules', 'better-sqlite3');
const requireFromRoot = createRequire(join(projectRoot, 'package.json'));
const nodeGypBin = requireFromRoot.resolve('node-gyp/bin/node-gyp.js');

const env = { ...process.env };

if (mode === 'electron') {
  const electronPackageJson = requireFromRoot('electron/package.json');
  env.npm_config_runtime = 'electron';
  env.npm_config_target = electronPackageJson.version;
  env.npm_config_disturl = 'https://electronjs.org/headers';
} else if (mode !== 'node') {
  throw new Error('Usage: node scripts/rebuild-sqlite.mjs <electron|node>');
}

const result = spawnSync(process.execPath, [nodeGypBin, 'rebuild', '--release'], {
  cwd: sqliteDir,
  env,
  stdio: 'inherit',
  shell: false,
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
