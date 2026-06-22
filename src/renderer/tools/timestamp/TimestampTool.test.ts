import { describe, expect, it } from 'vitest';

import { buildCurrentTimeState, buildDateToTimestampState, buildTimestampToDateState } from './TimestampTool';
import { timestampToDate } from './timestampUtils';

describe('TimestampTool display state', () => {
  it('copies converted dates into the date input and labels milliseconds', () => {
    expect(buildTimestampToDateState({ ok: true, value: '2024-01-01 08:00:00', milliseconds: 1704067200000 })).toEqual({
      dateText: '2024-01-01 08:00:00',
      result: '2024-01-01 08:00:00\n1704067200000 ms',
    });
  });

  it('copies converted seconds into the timestamp input and labels both units', () => {
    expect(buildDateToTimestampState({ ok: true, seconds: 1704067200, milliseconds: 1704067200000 })).toEqual({
      timestamp: '1704067200',
      result: '1704067200 s\n1704067200000 ms',
    });
  });

  it('builds display state for the current clock time', () => {
    // dateText is formatted in the runtime's local timezone, so derive the
    // expected value from the same conversion the tool uses instead of
    // hardcoding a timezone-specific string (CI runs on UTC, locally UTC+8).
    const converted = timestampToDate('1704067200000');
    if (!converted.ok) {
      throw new Error('expected timestampToDate to succeed for 1704067200000');
    }

    expect(buildCurrentTimeState(new Date(1704067200000))).toEqual({
      timestamp: '1704067200',
      dateText: converted.value,
      result: `${converted.value}\n1704067200 s\n1704067200000 ms`,
    });
  });
});
