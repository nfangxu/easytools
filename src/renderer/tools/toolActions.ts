import type { RecentRun, RecentRunInput } from '../../shared/types';

export const TOOL_STATUS = {
  copied: '已复制',
  copyFailed: '复制失败',
  electronApiUnavailable: 'Electron API 不可用，请通过 npm run dev 启动桌面应用。',
  recentRunSaveFailed: '最近记录保存失败',
} as const;

export function isLatestStatusRequest(requestId: number, latestRequestId: number): boolean {
  return requestId === latestRequestId;
}

export async function copyTextToClipboard(
  text: string,
  writeText: (value: string) => Promise<void>,
): Promise<string> {
  if (!text) {
    return '';
  }

  try {
    await writeText(text);
    return TOOL_STATUS.copied;
  } catch {
    return TOOL_STATUS.copyFailed;
  }
}

export async function saveRecentRun(
  input: RecentRunInput,
  addRecentRun: ((value: RecentRunInput) => Promise<RecentRun>) | undefined,
): Promise<string> {
  if (!addRecentRun) {
    return TOOL_STATUS.electronApiUnavailable;
  }

  try {
    await addRecentRun(input);
    return '';
  } catch {
    return TOOL_STATUS.recentRunSaveFailed;
  }
}
