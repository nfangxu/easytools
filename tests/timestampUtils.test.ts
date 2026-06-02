import { describe, expect, it } from 'vitest';

import { dateToTimestamp, timestampToDate } from '../src/renderer/tools/timestamp/timestampUtils';

function padDatePart(value: number): string {
  return value.toString().padStart(2, '0');
}

function formatLocalDate(date: Date): string {
  return [
    `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`,
    `${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}:${padDatePart(date.getSeconds())}`,
  ].join(' ');
}

describe('timestampUtils', () => {
  const januaryFirstUtcMilliseconds = 1704067200000;
  const januaryFirstLocalMilliseconds = new Date(2024, 0, 1, 0, 0, 0).getTime();

  it('converts a 10-digit Unix timestamp in seconds to a local date string', () => {
    expect(timestampToDate('1704067200')).toEqual({
      ok: true,
      value: formatLocalDate(new Date(januaryFirstUtcMilliseconds)),
      milliseconds: januaryFirstUtcMilliseconds,
    });
  });

  it('converts a 13-digit Unix timestamp in milliseconds to a local date string', () => {
    expect(timestampToDate('1704067200000')).toEqual({
      ok: true,
      value: formatLocalDate(new Date(januaryFirstUtcMilliseconds)),
      milliseconds: januaryFirstUtcMilliseconds,
    });
  });

  it('trims timestamp input before converting', () => {
    expect(timestampToDate(' 1704067200 ')).toEqual({
      ok: true,
      value: formatLocalDate(new Date(januaryFirstUtcMilliseconds)),
      milliseconds: januaryFirstUtcMilliseconds,
    });
  });

  it('converts a parseable local date string to Unix timestamps', () => {
    expect(dateToTimestamp('2024-01-01 00:00:00')).toEqual({
      ok: true,
      seconds: Math.floor(januaryFirstLocalMilliseconds / 1000),
      milliseconds: januaryFirstLocalMilliseconds,
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

  it('returns an error for impossible local date input without throwing', () => {
    const result = dateToTimestamp('2024-02-31 00:00:00');

    expect(result.ok).toBe(false);
  });
});
