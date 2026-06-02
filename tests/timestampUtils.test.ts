import { describe, expect, it } from 'vitest';

import { dateToTimestamp, timestampToDate } from '../src/renderer/tools/timestamp/timestampUtils';

describe('timestampUtils', () => {
  it('converts a 10-digit Unix timestamp in seconds to a local date string', () => {
    expect(timestampToDate('1704067200')).toEqual({
      ok: true,
      value: '2024-01-01 00:00:00',
      milliseconds: 1704067200000,
    });
  });

  it('converts a 13-digit Unix timestamp in milliseconds to a local date string', () => {
    expect(timestampToDate('1704067200000')).toEqual({
      ok: true,
      value: '2024-01-01 00:00:00',
      milliseconds: 1704067200000,
    });
  });

  it('converts a parseable local date string to Unix timestamps', () => {
    expect(dateToTimestamp('2024-01-01 00:00:00')).toEqual({
      ok: true,
      seconds: 1704067200,
      milliseconds: 1704067200000,
    });
  });

  it('returns an error for invalid timestamp input without throwing', () => {
    const result = timestampToDate('170406720');

    expect(result.ok).toBe(false);
  });

  it('returns an error for invalid date input without throwing', () => {
    const result = dateToTimestamp('not a date');

    expect(result.ok).toBe(false);
  });
});
