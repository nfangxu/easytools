import { describe, expect, it } from 'vitest';

import {
  getAppTitle,
  getRecentRunsLoadState,
  getToolPanelState,
  getVisitedToolIds,
  isLatestRecentRunsRequest,
  readRecentRuns,
  shouldShowRecentRuns,
  type AppRoute,
} from './AppShell';

describe('AppShell page state', () => {
  it('shows EasyTools on the home page and appends the tool name on tool pages', () => {
    expect(getAppTitle({ page: 'home' }, 'JSON 格式化')).toBe('EasyTools');
    expect(getAppTitle({ page: 'tool', toolId: 'json' }, 'JSON 格式化')).toBe('EasyTools / JSON 格式化');
  });

  it('keeps visited tool panels mounted while only the selected tool is visible', () => {
    const route: AppRoute = { page: 'tool', toolId: 'base64' };

    expect(getVisitedToolIds(['json'], route)).toEqual(['json', 'base64']);
    expect(getToolPanelState('json', route, ['json', 'base64'])).toEqual({ shouldMount: true, isActive: false });
    expect(getToolPanelState('base64', route, ['json', 'base64'])).toEqual({ shouldMount: true, isActive: true });
    expect(getToolPanelState('timestamp', route, ['json', 'base64'])).toEqual({ shouldMount: false, isActive: false });
  });

  it('only shows recent runs on tool pages', () => {
    expect(shouldShowRecentRuns({ page: 'home' })).toBe(false);
    expect(shouldShowRecentRuns({ page: 'tool', toolId: 'json' })).toBe(true);
  });
});

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

  it('treats a missing preload API as a failed recent-run load', async () => {
    await expect(readRecentRuns(undefined)).resolves.toEqual({ ok: false });
  });
});
