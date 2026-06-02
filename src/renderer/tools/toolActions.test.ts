import { describe, expect, it } from 'vitest';

import { copyTextToClipboard, isLatestStatusRequest, saveRecentRun } from './toolActions';

describe('tool actions', () => {
  it('returns a clipboard failure status when clipboard write rejects', async () => {
    const status = await copyTextToClipboard('output', async () => {
      throw new Error('denied');
    });

    expect(status).toBe('复制失败');
  });

  it('returns a copied status when clipboard write succeeds', async () => {
    const status = await copyTextToClipboard('output', async () => undefined);

    expect(status).toBe('已复制');
  });

  it('returns a recent-run failure status when persistence rejects', async () => {
    const status = await saveRecentRun(
      {
        toolId: 'json',
        operation: 'format',
        summary: 'JSON 格式化',
        preview: '{}',
      },
      async () => {
        throw new Error('ipc failed');
      },
    );

    expect(status).toBe('最近记录保存失败');
  });

  it('identifies stale async status requests', () => {
    expect(isLatestStatusRequest(1, 2)).toBe(false);
    expect(isLatestStatusRequest(2, 2)).toBe(true);
  });
});
