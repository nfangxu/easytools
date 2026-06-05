import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const faviconSource = join(
  root,
  'assets/stitch/a_high_resolution_favicon_for_devflow_a_developer_utility_tool._the_design/screen.png',
);
const appIconSource = join(
  root,
  'assets/stitch/a_polished_apple_touch_icon_for_devflow._the_design_features_a_sleek_minimalist/screen.png',
);
const buildIconDir = join(root, 'build/icons');
const publicDir = join(root, 'public');

mkdirSync(buildIconDir, { recursive: true });
mkdirSync(publicDir, { recursive: true });

copyFileSync(appIconSource, join(buildIconDir, 'icon.png'));
copyFileSync(faviconSource, join(buildIconDir, 'favicon.png'));
copyFileSync(appIconSource, join(buildIconDir, 'apple-touch-icon.png'));
copyFileSync(faviconSource, join(publicDir, 'favicon.png'));
copyFileSync(appIconSource, join(publicDir, 'apple-touch-icon.png'));

const appPng = readFileSync(appIconSource);
writeFileSync(join(buildIconDir, 'icon.icns'), createIcns(appPng));
writeFileSync(join(buildIconDir, 'icon.ico'), createIco(appPng));

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
