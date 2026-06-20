import { describe, expect, it } from 'vitest';

import { tools } from './registry';

describe('tool registry', () => {
  it('exposes the desktop toolbox tools in sidebar order', () => {
    expect(
      tools.map((tool) => ({
        id: tool.id,
        name: tool.name,
        category: tool.category,
      })),
    ).toEqual([
      { id: 'timestamp', name: 'Timestamp Converter', category: 'Date' },
      { id: 'base64', name: 'Base64 Encoder', category: 'Text' },
      { id: 'json', name: 'JSON Formatter', category: 'Text' },
      { id: 'jwt', name: 'JWT Debugger', category: 'Text' },
      { id: 'llm-api', name: 'LLM API Checker', category: 'AI' },
    ]);
  });
});
