import type { LlmApiProtocol } from '../../../shared/types';

export function parseApiKeys(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function protocolLabel(protocol: LlmApiProtocol): string {
  return protocol === 'openai' ? 'OpenAI-compatible' : 'Anthropic-compatible';
}

/**
 * Build the language-neutral preview line we persist to the recent-runs DB
 * for one protocol's validation result. The protocol label is intentionally
 * left in English ("OpenAI-compatible" / "Anthropic-compatible") because it
 * doubles as a technical identifier that should read the same in any locale.
 *
 * The summary headline that wraps multiple preview lines is built by the
 * tool component using the active translator, so it picks up the user's
 * language at the time the run is recorded.
 */
export function buildLlmApiPreviewLine(input: {
  protocol: LlmApiProtocol;
  baseUrl: string;
  total: number;
  availableCount: number;
}): string {
  const label = protocolLabel(input.protocol);
  return `${label} | ${input.baseUrl} | checked=${input.total}, available=${input.availableCount}`;
}
