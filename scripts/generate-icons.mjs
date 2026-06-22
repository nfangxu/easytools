import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// EasyTools icon pipeline.
//
// Source of truth is the PNG set under assets/icon/. This script copies the
// supplied PNGs into the locations Electron Builder and the renderer expect,
// then wraps the master 1024x1024 PNG in single-image .icns/.ico containers.

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourceIconDir = join(root, 'assets/icon');
const sourceMasterPng = join(sourceIconDir, 'easytools-1024.png');
const buildIconDir = join(root, 'build/icons');
const publicDir = join(root, 'public');

if (!existsSync(sourceMasterPng)) {
  throw new Error('Missing PNG master: ' + sourceMasterPng);
}

mkdirSync(buildIconDir, { recursive: true });
mkdirSync(publicDir, { recursive: true });

// 1. Place the 1024 master into build/icons/icon.png.
copyFileSync(sourceMasterPng, join(buildIconDir, 'icon.png'));

// 2. Copy renderer-facing sizes from the supplied PNG set.
const variants = [
  { source: 'easytools-256.png', name: 'favicon.png' },
  { source: 'easytools-512.png', name: 'apple-touch-icon.png' },
];

for (const { source, name } of variants) {
  const sourcePng = join(sourceIconDir, source);
  if (!existsSync(sourcePng)) {
    throw new Error('Missing icon variant: ' + sourcePng);
  }
  const outBuild = join(buildIconDir, name);
  const outPublic = join(publicDir, name);
  copyFileSync(sourcePng, outBuild);
  copyFileSync(outBuild, outPublic);
}

// 3. Wrap the 1024 PNG into single-image .icns and .ico containers.
// Electron Builder can re-rasterise these during platform packaging.
const masterPngBytes = readFileSync(sourceMasterPng);
writeFileSync(join(buildIconDir, 'icon.icns'), createIcns(masterPngBytes));
writeFileSync(join(buildIconDir, 'icon.ico'), createIco(masterPngBytes));

console.log(
  [
    'Generated icons from assets/icon/*.png:',
    '  - build/icons/icon.png            (1024x1024, electron-builder master)',
    '  - build/icons/favicon.png         (256x256)',
    '  - build/icons/apple-touch-icon.png (512x512)',
    '  - build/icons/icon.icns           (single-frame ic10)',
    '  - build/icons/icon.ico            (single-frame 32-bit RGBA)',
    '  - public/favicon.png              (256x256, served to the renderer)',
    '  - public/apple-touch-icon.png     (512x512)',
  ].join('\n'),
);

// ---------------------------------------------------------------------------
// Container helpers.
// ---------------------------------------------------------------------------

function createIcns(png) {
  const chunkType = Buffer.from('ic10');
  const chunkLength = Buffer.alloc(4);
  chunkLength.writeUInt32BE(8 + png.length, 0);
  const fileLength = Buffer.alloc(4);
  fileLength.writeUInt32BE(8 + 8 + png.length, 0);

  return Buffer.concat([Buffer.from('icns'), fileLength, chunkType, chunkLength, png]);
}

function createIco(png) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const directoryEntry = Buffer.alloc(16);
  directoryEntry.writeUInt8(0, 0);
  directoryEntry.writeUInt8(0, 1);
  directoryEntry.writeUInt8(0, 2);
  directoryEntry.writeUInt8(0, 3);
  directoryEntry.writeUInt16LE(1, 4);
  directoryEntry.writeUInt16LE(32, 6);
  directoryEntry.writeUInt32LE(png.length, 8);
  directoryEntry.writeUInt32LE(header.length + directoryEntry.length, 12);

  return Buffer.concat([header, directoryEntry, png]);
}
