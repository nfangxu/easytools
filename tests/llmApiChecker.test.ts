import { describe, expect, test } from 'vitest';

import {
  maskApiKey,
  validateLlmApiBatch,
} from '../src/main/llmApiChecker';
import type { LlmApiValidationInput } from '../src/shared/types';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('llmApiChecker', () => {
  test('masks API keys without exposing full values', () => {
    expect(maskApiKey('sk-1234567890abcdef')).toBe('sk-1...cdef');
    expect(maskApiKey('short')).toBe('sho...ort');
  });

  test('validates an OpenAI-compatible key with models and chat', async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const fetcher = async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(url), init });
      if (String(url).endsWith('/v1/models')) {
        return jsonResponse({ data: [{ id: 'gpt-test' }] });
      }
      if (String(url).endsWith('/v1/chat/completions')) {
        return jsonResponse({ choices: [{ message: { content: 'I am a test model.' } }] });
      }
      return jsonResponse({ error: { message: 'not found' } }, 404);
    };

    const result = await validateLlmApiBatch(openAiInput(['sk-openai']), fetcher);

    expect(result.availableCount).toBe(1);
    expect(result.results[0]).toMatchObject({
      protocol: 'openai',
      status: 'available',
      modelList: { status: 'success' },
      chat: { status: 'success' },
      selectedModel: 'gpt-test',
    });
    expect(JSON.stringify(result)).not.toContain('sk-openai');
    expect(requests[1].init?.headers).toMatchObject({
      Authorization: 'Bearer sk-openai',
    });
  });

  test('validates an Anthropic-compatible key with models and messages', async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const fetcher = async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(url), init });
      if (String(url).endsWith('/v1/models')) {
        return jsonResponse({ data: [{ id: 'claude-test' }] });
      }
      if (String(url).endsWith('/v1/messages')) {
        return jsonResponse({ content: [{ type: 'text', text: 'I am Claude-compatible.' }] });
      }
      return jsonResponse({}, 404);
    };

    const result = await validateLlmApiBatch(anthropicInput(['sk-ant']), fetcher);

    expect(result.results[0]).toMatchObject({
      protocol: 'anthropic',
      status: 'available',
      modelList: { status: 'success' },
      chat: { status: 'success' },
      selectedModel: 'claude-test',
    });
    expect(requests[1].init?.headers).toMatchObject({
      'x-api-key': 'sk-ant',
      'anthropic-version': '2023-06-01',
    });
  });

  test('continues serial batch validation after a failed key', async () => {
    const calls: string[] = [];
    const fetcher = async (_url: string | URL | Request, init?: RequestInit) => {
      calls.push(JSON.stringify(init?.headers ?? {}));
      const key = JSON.stringify(init?.headers ?? {});
      if (key.includes('bad-key')) {
        return jsonResponse({ error: { message: 'invalid key' } }, 401);
      }
      return jsonResponse({ data: [{ id: 'gpt-test' }] });
    };

    const result = await validateLlmApiBatch(openAiInput(['bad-key', 'good-key'], 'gpt-test'), fetcher);

    expect(result.total).toBe(2);
    expect(result.availableCount).toBe(1);
    expect(result.results.map((item) => item.status)).toEqual(['unavailable', 'available']);
    expect(calls.join('\n')).toContain('bad-key');
    expect(calls.join('\n')).toContain('good-key');
  });

  test('rejects empty key batches', async () => {
    await expect(validateLlmApiBatch(openAiInput([]))).rejects.toThrow('At least one API key is required.');
  });
});

function openAiInput(apiKeys: string[], model = ''): LlmApiValidationInput {
  return {
    protocol: 'openai',
    baseUrl: 'https://example.test',
    apiKeys,
    model,
  };
}

function anthropicInput(apiKeys: string[], model = ''): LlmApiValidationInput {
  return {
    protocol: 'anthropic',
    baseUrl: 'https://anthropic.example',
    apiKeys,
    model,
  };
}
