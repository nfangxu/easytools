import { describe, expect, it } from 'vitest';

import {
  DEFAULT_IDENTITY_PREFS,
  IDENTITY_PREFS_NAMESPACE,
  loadIdentityPrefs,
  parseIdentityPrefs,
  saveIdentityPrefs,
  serializeIdentityPrefs,
} from './identityPrefs';

describe('parseIdentityPrefs', () => {
  it('returns a deep copy of the defaults when given a non-object', () => {
    const parsed = parseIdentityPrefs(null);
    expect(parsed).toEqual(DEFAULT_IDENTITY_PREFS);
    // mutating the parsed object must not poison the module-level defaults
    parsed.provinceId = '110000';
    expect(DEFAULT_IDENTITY_PREFS.provinceId).toBe('');
  });

  it('rejects fields with wrong types and falls back per field', () => {
    const parsed = parseIdentityPrefs({
      provinceId: 42,
      cityId: '110100',
      gender: 'alien',
      count: '',
      extra: 'ignored',
    });
    expect(parsed.provinceId).toBe('');
    expect(parsed.cityId).toBe('110100');
    expect(parsed.gender).toBe('random');
    expect(parsed.count).toBe('10');
  });

  it('keeps all valid fields', () => {
    const parsed = parseIdentityPrefs({
      provinceId: '110000',
      cityId: '110100',
      countyId: '110105',
      birthFrom: '1990-01-01',
      birthTo: '2010-12-31',
      gender: 'female',
      count: '25',
    });
    expect(parsed).toEqual({
      provinceId: '110000',
      cityId: '110100',
      countyId: '110105',
      birthFrom: '1990-01-01',
      birthTo: '2010-12-31',
      gender: 'female',
      count: '25',
    });
  });
});

describe('serializeIdentityPrefs', () => {
  it('returns a flat string-only record', () => {
    const out = serializeIdentityPrefs({
      provinceId: '110000',
      cityId: '',
      countyId: '110105',
      birthFrom: '',
      birthTo: '',
      gender: 'male',
      count: '5',
    });
    expect(out).toEqual({
      provinceId: '110000',
      cityId: '',
      countyId: '110105',
      birthFrom: '',
      birthTo: '',
      gender: 'male',
      count: '5',
    });
  });
});

describe('loadIdentityPrefs', () => {
  it('falls back to defaults when the IPC API is missing', async () => {
    const loaded = await loadIdentityPrefs(undefined);
    expect(loaded).toEqual(DEFAULT_IDENTITY_PREFS);
  });

  it('parses the value coming out of the settings DB', async () => {
    const stored = {
      provinceId: '310000',
      cityId: '310100',
      countyId: '310105',
      birthFrom: '1980-01-01',
      birthTo: '2000-12-31',
      gender: 'female',
      count: '3',
    };
    const loaded = await loadIdentityPrefs(async (ns) => {
      expect(ns).toBe(IDENTITY_PREFS_NAMESPACE);
      return stored;
    });
    expect(loaded).toEqual(stored);
  });

  it('swallows exceptions and returns defaults', async () => {
    const loaded = await loadIdentityPrefs(async () => {
      throw new Error('ipc failed');
    });
    expect(loaded).toEqual(DEFAULT_IDENTITY_PREFS);
  });
});

describe('saveIdentityPrefs', () => {
  it('writes a flat string record under the prefs namespace', async () => {
    const calls: Array<{ ns: string; value: unknown }> = [];
    await saveIdentityPrefs(
      async (ns, value) => {
        calls.push({ ns, value });
      },
      { ...DEFAULT_IDENTITY_PREFS, provinceId: '110000', gender: 'male', count: '20' },
    );
    expect(calls).toEqual([
      {
        ns: IDENTITY_PREFS_NAMESPACE,
        value: {
          provinceId: '110000',
          cityId: '',
          countyId: '',
          birthFrom: '',
          birthTo: '',
          gender: 'male',
          count: '20',
        },
      },
    ]);
  });

  it('is a silent no-op when the IPC API is missing', async () => {
    await expect(saveIdentityPrefs(undefined, DEFAULT_IDENTITY_PREFS)).resolves.toBeUndefined();
  });

  it('swallows exceptions thrown by the IPC API', async () => {
    await expect(
      saveIdentityPrefs(async () => {
        throw new Error('db locked');
      }, DEFAULT_IDENTITY_PREFS),
    ).resolves.toBeUndefined();
  });
});
