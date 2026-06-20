import { describe, expect, test } from 'vitest';

import { buildLlmApiPreviewLine, parseApiKeys, protocolLabel } from './llmApiForm';

describe('llmApiForm', () => {
  test('parses API keys from multiline text and removes empty lines', () => {
    expect(parseApiKeys('\n sk-one \n\nsk-two\n')).toEqual(['sk-one', 'sk-two']);
  });

  test('exposes language-neutral protocol labels', () => {
    expect(protocolLabel('openai')).toBe('OpenAI-compatible');
    expect(protocolLabel('anthropic')).toBe('Anthropic-compatible');
  });

  test('builds a preview line without exposing API keys', () => {
    const line = buildLlmApiPreviewLine({
      protocol: 'openai',
      baseUrl: 'https://api.example.test',
      total: 3,
      availableCount: 2,
    });

    expect(line).toBe('OpenAI-compatible | https://api.example.test | checked=3, available=2');
    expect(line).not.toContain('sk-');
  });
});