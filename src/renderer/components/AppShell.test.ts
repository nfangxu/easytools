import { describe, expect, it } from 'vitest';

import { getRecentRunsLoadState, isLatestRecentRunsRequest, readRecentRuns } from './AppShell';

describe('AppShell recent run loading', () => {
  it('ignores stale recent-run responses', () => {
    expect(isLatestRecentRunsRequest(1, 2)).toBe(false);
    expect(isLatestRecentRunsRequest(2, 2)).toBe(true);
  });

  it('keeps stale failed recent-run responses from updating rail status', () => {
    expect(getRecentRunsLoadState(1, 2, { ok: false })).toEqual({ shouldApply: false, status: '' });
  });

  it('surfaces current recent-run load failures', () => {
    expect(getRecentRunsLoadState(2, 2, { ok: false })).toEqual({
      shouldApply: true,
      status: '最近记录加载失败',
    });
  });

  it('converts rejected recent-run loads into a failed result', async () => {
    await expect(
      readRecentRuns(async () => {
        throw new Error('ipc failed');
      }),
    ).resolves.toEqual({ ok: false });
  });
});
