import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

// EasyTools icon pipeline.
//
// Source of truth is the SVG at assets/icon.svg (the Workbench design:
// graphite chassis + bone work surface + signal-orange stenciled "E").
// This script rasterises that SVG to PNG at the sizes the build needs,
// then wraps the master 1024×1024 PNG in single-image .icns/.ico containers
// (electron-builder re-rasterises these to multi-size launcher icons at
// build time, so single-size containers are sufficient here).

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svgSource = join(root, 'assets/icon.svg');
const buildIconDir = join(root, 'build/icons');
const publicDir = join(root, 'public');

if (!existsSync(svgSource)) {
  throw new Error(`Missing SVG master: ${svgSource}`);
}

mkdirSync(buildIconDir, { recursive: true });
mkdirSync(publicDir, { recursive: true });

// 1. Render the SVG to a 1024×1024 master PNG via macOS Quick Look.
//    qlmanage emits "<basename>.png" into the chosen folder.
const tmp = join(tmpdir(), `easytools-icon-${process.pid}`);
mkdirSync(tmp, { recursive: true });

try {
  execSync(`qlmanage -t -s 1024 -o "${tmp}" "${svgSource}"`, { stdio: 'pipe' });
} catch (error) {
  rmSync(tmp, { recursive: true, force: true });
  throw new Error(
    'Failed to render SVG via qlmanage. This script currently relies on macOS\n' +
      'Quick Look (qlmanage); on Linux/CI, install librsvg and adapt this step\n' +
      'to use rsvg-convert.\n\n' +
      `Underlying error: ${error.message}`,
  );
}

const masterPng = join(tmp, 'icon.svg.png');
if (!existsSync(masterPng)) {
  rmSync(tmp, { recursive: true, force: true });
  throw new Error(`qlmanage did not produce ${masterPng}`);
}

// 2. Place the 1024 master into build/icons/icon.png (electron-builder reads this).
copyFileSync(masterPng, join(buildIconDir, 'icon.png'));

// 3. Downscale to favicon and apple-touch sizes via sips (also macOS-native).
//    favicon.png at 256px (used by index.html + the title-bar mark);
//    apple-touch-icon.png at 512px (covers <link rel="apple-touch-icon"> usage).
const variants = [
  { name: 'favicon.png', size: 256 },
  { name: 'apple-touch-icon.png', size: 512 },
];

for (const { name, size } of variants) {
  const outBuild = join(buildIconDir, name);
  const outPublic = join(publicDir, name);
  copyFileSync(masterPng, outBuild);
  execSync(`sips -Z ${size} "${outBuild}"`, { stdio: 'pipe' });
  copyFileSync(outBuild, outPublic);
}

// public/ also needs the 256 favicon as the canonical favicon used by the renderer.
// (build/icons/favicon.png is already 256 from the variants loop above.)

// 4. Wrap the 1024 PNG into single-image .icns and .ico containers.
//    electron-builder regenerates platform-specific multi-size icons during
//    `npm run dist`, so a one-image container is enough as a starting point.
const masterPngBytes = readFileSync(masterPng);
writeFileSync(join(buildIconDir, 'icon.icns'), createIcns(masterPngBytes));
writeFileSync(join(buildIconDir, 'icon.ico'), createIco(masterPngBytes));

rmSync(tmp, { recursive: true, force: true });

console.log(
  [
    'Generated icons from assets/icon.svg:',
    `  - build/icons/icon.png            (1024×1024, electron-builder master)`,
    `  - build/icons/favicon.png         (256×256)`,
    `  - build/icons/apple-touch-icon.png (512×512)`,
    `  - build/icons/icon.icns           (single-frame ic10)`,
    `  - build/icons/icon.ico            (single-frame 32-bit RGBA)`,
    `  - public/favicon.png              (256×256, served to the renderer)`,
    `  - public/apple-touch-icon.png     (512×512)`,
  ].join('\n'),
);

// ---------------------------------------------------------------------------
// Container helpers — minimal single-image wrappers. Identical to the prior
// implementation, kept here so this file is self-contained.
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
