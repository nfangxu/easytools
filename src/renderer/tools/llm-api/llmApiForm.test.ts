import { describe, expect, test } from 'vitest';

import {
  buildLlmApiRecentRunSummary,
  parseApiKeys,
} from './llmApiForm';

describe('llmApiForm', () => {
  test('parses API keys from multiline text and removes empty lines', () => {
    expect(parseApiKeys('\n sk-one \n\nsk-two\n')).toEqual(['sk-one', 'sk-two']);
  });

  test('builds safe recent-run summary without API keys', () => {
    const summary = buildLlmApiRecentRunSummary({
      protocol: 'openai',
      baseUrl: 'https://api.example.test',
      total: 3,
      availableCount: 2,
    });

    expect(summary.summary).toBe('OpenAI-compatible 校验：2/3 可用');
    expect(summary.preview).toContain('https://api.example.test');
    expect(summary.preview).not.toContain('sk-');
  });
});
