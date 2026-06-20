import { describe, expect, it } from 'vitest';

import {
  getAppTitle,
  getRecentRunsLoadState,
  getToolPanelClassName,
  getToolPanelState,
  getVisitedToolIds,
  isLatestRecentRunsRequest,
  readRecentRuns,
  shouldShowRecentRuns,
  toolNameKey,
  type AppRoute,
} from './AppShell';

describe('AppShell page state', () => {
  it('shows EasyTools on the home page and appends the tool name on tool pages', () => {
    expect(getAppTitle({ page: 'home' }, 'JSON Formatter')).toBe('EasyTools');
    expect(getAppTitle({ page: 'tool', toolId: 'json' }, 'JSON Formatter')).toBe('EasyTools / JSON Formatter');
  });

  it('shows the bare EasyTools title on the settings page', () => {
    expect(getAppTitle({ page: 'settings' }, 'JSON Formatter')).toBe('EasyTools');
  });

  it('keeps visited tool panels mounted while only the selected tool is visible', () => {
    const route: AppRoute = { page: 'tool', toolId: 'base64' };

    expect(getVisitedToolIds(['json'], route)).toEqual(['json', 'base64']);
    expect(getToolPanelState('json', route, ['json', 'base64'])).toEqual({ shouldMount: true, isActive: false });
    expect(getToolPanelState('base64', route, ['json', 'base64'])).toEqual({ shouldMount: true, isActive: true });
    expect(getToolPanelState('timestamp', route, ['json', 'base64'])).toEqual({ shouldMount: false, isActive: false });
  });

  it('does not append non-tool routes to the visited list', () => {
    expect(getVisitedToolIds(['json'], { page: 'home' })).toEqual(['json']);
    expect(getVisitedToolIds(['json'], { page: 'settings' })).toEqual(['json']);
  });

  it('only shows recent runs when a tool page has the recent runs panel open', () => {
    expect(shouldShowRecentRuns({ page: 'home' }, true)).toBe(false);
    expect(shouldShowRecentRuns({ page: 'tool', toolId: 'json' }, false)).toBe(false);
    expect(shouldShowRecentRuns({ page: 'tool', toolId: 'json' }, true)).toBe(true);
    expect(shouldShowRecentRuns({ page: 'settings' }, true)).toBe(false);
  });

  it('adds tool panel transition classes for visible and hidden panels', () => {
    expect(getToolPanelClassName(true)).toBe('tool-panel-slot tool-panel-slot-active');
    expect(getToolPanelClassName(false)).toBe('tool-panel-slot tool-panel-slot-inactive');
  });

  it('maps every tool id to a translation key for its display name', () => {
    expect(toolNameKey('timestamp')).toBe('tool.timestamp.name');
    expect(toolNameKey('base64')).toBe('tool.base64.name');
    expect(toolNameKey('json')).toBe('tool.json.name');
    expect(toolNameKey('jwt')).toBe('tool.jwt.name');
    expect(toolNameKey('llm-api')).toBe('tool.llm.name');
    expect(toolNameKey('identity')).toBe('tool.identity.name');
  });
});

describe('AppShell recent run loading', () => {
  it('ignores stale recent-run responses', () => {
    expect(isLatestRecentRunsRequest(1, 2)).toBe(false);
    expect(isLatestRecentRunsRequest(2, 2)).toBe(true);
  });

  it('keeps stale failed recent-run responses from updating rail status', () => {
    expect(getRecentRunsLoadState(1, 2, { ok: false })).toEqual({ shouldApply: false, statusKey: '' });
  });

  it('surfaces current recent-run load failures as a translation key', () => {
    expect(getRecentRunsLoadState(2, 2, { ok: false })).toEqual({
      shouldApply: true,
      statusKey: 'recent.loadFailed',
    });
  });

  it('clears the rail status when the latest load succeeds', () => {
    expect(getRecentRunsLoadState(2, 2, { ok: true })).toEqual({
      shouldApply: true,
      statusKey: '',
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