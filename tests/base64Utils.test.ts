import { describe, expect, it } from 'vitest';

import { decodeBase64, encodeBase64 } from '../src/renderer/tools/base64/base64Utils';

describe('base64Utils', () => {
  it('encodes UTF-8 text as Base64', () => {
    expect(encodeBase64('EasyTools 中文')).toEqual({
      ok: true,
      value: 'RWFzeVRvb2xzIOS4reaWhw==',
    });
  });

  it('decodes Base64 text as UTF-8', () => {
    expect(decodeBase64('RWFzeVRvb2xzIOS4reaWhw==')).toEqual({
      ok: true,
      value: 'EasyTools 中文',
    });
  });

  it('encodes and decodes UTF-8 text without relying on global Buffer', () => {
    const originalBuffer = Reflect.get(globalThis, 'Buffer');

    Reflect.set(globalThis, 'Buffer', undefined);
    try {
      expect(encodeBase64('EasyTools 中文')).toEqual({
        ok: true,
        value: 'RWFzeVRvb2xzIOS4reaWhw==',
      });
      expect(decodeBase64('RWFzeVRvb2xzIOS4reaWhw==')).toEqual({
        ok: true,
        value: 'EasyTools 中文',
      });
    } finally {
      Reflect.set(globalThis, 'Buffer', originalBuffer);
    }
  });

  it('returns an error for invalid Base64 without throwing', () => {
    const result = decodeBase64('not valid %%%');

    expect(result.ok).toBe(false);
  });
});
