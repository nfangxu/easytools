import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

type Rgba = [number, number, number, number];

function readPngRgba(path: string): { width: number; height: number; pixel: (x: number, y: number) => Rgba } {
  const png = readFileSync(path);
  expect(png.toString('hex', 0, 8)).toBe('89504e470d0a1a0a');

  let cursor = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks: Buffer[] = [];

  while (cursor < png.length) {
    const length = png.readUInt32BE(cursor);
    cursor += 4;
    const type = png.toString('ascii', cursor, cursor + 4);
    cursor += 4;
    const data = png.subarray(cursor, cursor + length);
    cursor += length + 4;

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  expect({ bitDepth, colorType }).toEqual({ bitDepth: 8, colorType: 6 });

  const inflated = inflateSync(Buffer.concat(idatChunks));
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const rows: Buffer[] = [];
  let offset = 0;
  let previous = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[offset];
    offset += 1;
    const raw = inflated.subarray(offset, offset + stride);
    offset += stride;
    const row = Buffer.alloc(stride);

    for (let i = 0; i < stride; i += 1) {
      const left = i >= bytesPerPixel ? row[i - bytesPerPixel] : 0;
      const up = previous[i];
      const upLeft = i >= bytesPerPixel ? previous[i - bytesPerPixel] : 0;
      let predictor = 0;

      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = up;
      else if (filter === 3) predictor = Math.floor((left + up) / 2);
      else if (filter === 4) {
        const candidate = left + up - upLeft;
        const leftDelta = Math.abs(candidate - left);
        const upDelta = Math.abs(candidate - up);
        const upLeftDelta = Math.abs(candidate - upLeft);
        predictor = leftDelta <= upDelta && leftDelta <= upLeftDelta ? left : upDelta <= upLeftDelta ? up : upLeft;
      }

      row[i] = (raw[i] + predictor) & 255;
    }

    rows.push(row);
    previous = row;
  }

  return {
    width,
    height,
    pixel(x, y) {
      const row = rows[y];
      const offset = x * 4;
      return [row[offset], row[offset + 1], row[offset + 2], row[offset + 3]];
    },
  };
}

describe('generated app icon assets', () => {
  it('uses the supplied 1024px PNG as the packaged master icon', () => {
    expect(fileSha256(join(process.cwd(), 'build/icons/icon.png'))).toBe(
      fileSha256(join(process.cwd(), 'assets/icon/easytools-1024.png')),
    );
  });

  it('keeps the packaged master PNG at 1024px', () => {
    const icon = readPngRgba(join(process.cwd(), 'build/icons/icon.png'));

    expect(icon.width).toBe(1024);
    expect(icon.height).toBe(1024);
  });
});

function fileSha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}
