import { describe, expect, it } from 'vitest';

import {
  analyzeJwtTiming,
  parseJwt,
  verifyJwtHmacSignature,
} from './jwtUtils';

const HS256_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJzdWIiOiIxMjMiLCJuYW1lIjoiRWFzeVRvb2xzIiwiZXhwIjoyMDAwMDAwMDAwfQ.' +
  '731XyRuCPYScsadTcJfwCNwcrRWXH77jFmxS4Uu9CNA';

describe('jwtUtils', () => {
  it('parses a JWT into formatted header and payload JSON', () => {
    const result = parseJwt(HS256_TOKEN);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.header.alg).toBe('HS256');
    expect(result.value.payload.sub).toBe('123');
    expect(result.value.headerJson).toContain('"alg": "HS256"');
    expect(result.value.payloadJson).toContain('"name": "EasyTools"');
  });

  it('rejects tokens that do not contain three parts', () => {
    expect(parseJwt('one.two')).toEqual({
      ok: false,
      message: { key: 'tool.jwt.error.malformed' },
    });
  });

  it('reports expired and not-before timing states as translation keys', () => {
    expect(analyzeJwtTiming({ exp: 1000 }, 2000)).toContainEqual({
      key: 'tool.jwt.timing.expired',
      vars: { at: '1970-01-01 08:16:40' },
    });
    expect(analyzeJwtTiming({ nbf: 3000 }, 2000)).toContainEqual({
      key: 'tool.jwt.timing.notYetValid',
      vars: { at: '1970-01-01 08:50:00' },
    });
    expect(analyzeJwtTiming({ iat: 1500 }, 2000)).toContainEqual({
      key: 'tool.jwt.timing.iat',
      vars: { at: '1970-01-01 08:25:00' },
    });
  });

  it('falls back to "no claims" when none of exp/nbf/iat are present', () => {
    expect(analyzeJwtTiming({}, 2000)).toEqual([{ key: 'tool.jwt.timing.none' }]);
  });

  it('verifies HS256 signatures with a shared secret', async () => {
    await expect(verifyJwtHmacSignature(HS256_TOKEN, 'secret')).resolves.toEqual({
      supported: true,
      valid: true,
      message: { key: 'tool.jwt.signature.valid', vars: { alg: 'HS256' } },
    });
    await expect(verifyJwtHmacSignature(HS256_TOKEN, 'wrong')).resolves.toEqual({
      supported: true,
      valid: false,
      message: { key: 'tool.jwt.signature.invalid', vars: { alg: 'HS256' } },
    });
  });

  it('marks non-HMAC algorithms as unsupported for signature verification', async () => {
    const token =
      'eyJhbGciOiJSUzI1NiJ9.' +
      'eyJzdWIiOiIxMjMifQ.' +
      'signature';

    await expect(verifyJwtHmacSignature(token, 'secret')).resolves.toEqual({
      supported: false,
      valid: false,
      message: { key: 'tool.jwt.signature.unsupported' },
    });
  });
});