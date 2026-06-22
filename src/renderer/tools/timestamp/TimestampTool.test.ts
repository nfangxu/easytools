import { describe, expect, it } from 'vitest';

import { buildCurrentTimeState, buildDateToTimestampState, buildTimestampToDateState } from './TimestampTool';

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
    expect(buildCurrentTimeState(new Date(1704067200000))).toEqual({
      timestamp: '1704067200',
      dateText: '2024-01-01 08:00:00',
      result: '2024-01-01 08:00:00\n1704067200 s\n1704067200000 ms',
    });
  });
});
