import type { RecentRun, RecentRunInput } from '../../shared/types';
import type { TranslationKey } from '../i18n/translations';

/**
 * Status codes returned by tool actions. These are translation keys; the
 * caller must run them through `t()` before display so the rendered text
 * matches the active language.
 *
 * An empty string means "no status" (success without any banner).
 */
export type ToolStatusCode = '' | TranslationKey;

export const TOOL_STATUS = {
  copied: 'status.copied',
  copyFailed: 'status.copyFailed',
  electronApiUnavailable: 'status.electronUnavailable',
  recentRunSaveFailed: 'status.recentRunFailed',
} as const satisfies Record<string, TranslationKey>;

export function isLatestStatusRequest(requestId: number, latestRequestId: number): boolean {
  return requestId === latestRequestId;
}

export async function copyTextToClipboard(
  text: string,
  writeText: (value: string) => Promise<void>,
): Promise<ToolStatusCode> {
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
): Promise<ToolStatusCode> {
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
