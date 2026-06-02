import { describe, expect, it } from 'vitest';

import { compactJson, formatJson } from '../src/renderer/tools/json/jsonUtils';

describe('jsonUtils', () => {
  it('formats JSON with two-space indentation', () => {
    expect(formatJson('{"name":"EasyTools","items":[1,2]}')).toEqual({
      ok: true,
      value: '{\n  "name": "EasyTools",\n  "items": [\n    1,\n    2\n  ]\n}',
    });
  });

  it('compacts JSON without extra whitespace', () => {
    expect(compactJson('{\n  "name": "EasyTools"\n}')).toEqual({
      ok: true,
      value: '{"name":"EasyTools"}',
    });
  });

  it('returns an error for invalid JSON without throwing', () => {
    const result = formatJson('{"name":');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('JSON');
    }
  });
});
