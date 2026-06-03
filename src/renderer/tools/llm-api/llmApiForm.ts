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

export function buildLlmApiRecentRunSummary(input: {
  protocol: LlmApiProtocol;
  baseUrl: string;
  total: number;
  availableCount: number;
}): { summary: string; preview: string } {
  const label = protocolLabel(input.protocol);
  return {
    summary: `${label} 校验：${input.availableCount}/${input.total} 可用`,
    preview: `${label} | ${input.baseUrl} | checked=${input.total}, available=${input.availableCount}`,
  };
}
