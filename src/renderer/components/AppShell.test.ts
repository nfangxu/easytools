import { describe, expect, it } from 'vitest';

import { isLatestRecentRunsRequest } from './AppShell';

describe('AppShell recent run loading', () => {
  it('ignores stale recent-run responses', () => {
    expect(isLatestRecentRunsRequest(1, 2)).toBe(false);
    expect(isLatestRecentRunsRequest(2, 2)).toBe(true);
  });
});
