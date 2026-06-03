import { describe, expect, it } from 'vitest';

import {
  getAppTitle,
  getPageTransitionClassName,
  getRecentRunsLoadState,
  getRecentRunsOpenStateAfterOutsideClick,
  getToolPanelClassName,
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

  it('only shows recent runs when a tool page has the recent runs panel open', () => {
    expect(shouldShowRecentRuns({ page: 'home' }, true)).toBe(false);
    expect(shouldShowRecentRuns({ page: 'tool', toolId: 'json' }, false)).toBe(false);
    expect(shouldShowRecentRuns({ page: 'tool', toolId: 'json' }, true)).toBe(true);
  });

  it('closes recent runs when an outside popover click occurs', () => {
    expect(getRecentRunsOpenStateAfterOutsideClick({ page: 'home' }, true)).toBe(false);
    expect(getRecentRunsOpenStateAfterOutsideClick({ page: 'tool', toolId: 'json' }, true)).toBe(false);
    expect(getRecentRunsOpenStateAfterOutsideClick({ page: 'tool', toolId: 'json' }, false)).toBe(false);
  });

  it('adds page transition classes for mounted pages', () => {
    expect(getPageTransitionClassName({ page: 'home' })).toBe('page-transition page-transition-home');
    expect(getPageTransitionClassName({ page: 'tool', toolId: 'json' })).toBe('page-transition page-transition-tool');
  });

  it('adds tool panel transition classes for visible and hidden panels', () => {
    expect(getToolPanelClassName(true)).toBe('tool-panel-slot tool-panel-slot-active');
    expect(getToolPanelClassName(false)).toBe('tool-panel-slot tool-panel-slot-inactive');
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

  it('loads recent runs for the current tool', async () => {
    const requestedToolIds: string[] = [];

    await expect(
      readRecentRuns(async (toolId) => {
        requestedToolIds.push(toolId);
        return [];
      }, 'json'),
    ).resolves.toEqual({ ok: true, runs: [] });
    expect(requestedToolIds).toEqual(['json']);
  });

  it('converts rejected recent-run loads into a failed result', async () => {
    await expect(
      readRecentRuns(async () => {
        throw new Error('ipc failed');
      }, 'json'),
    ).resolves.toEqual({ ok: false });
  });

  it('treats a missing preload API as a failed recent-run load', async () => {
    await expect(readRecentRuns(undefined, 'json')).resolves.toEqual({ ok: false });
  });
});
