import { describe, expect, test } from 'vitest';

import {
  BUILTIN_LLM_API_TEMPLATES,
  LlmApiTemplateValidationError,
  buildTemplateValidationInputs,
  parseCustomTemplatesSetting,
  sanitizeTemplateDraft,
  serializeCustomTemplatesSetting,
} from './llmApiTemplates';

describe('llmApiTemplates', () => {
  test('provides built-in templates with dual protocol endpoints when supported', () => {
    const minimax = BUILTIN_LLM_API_TEMPLATES.find((template) => template.id === 'builtin:minimax-global');
    const bailian = BUILTIN_LLM_API_TEMPLATES.find((template) => template.id === 'builtin:aliyun-bailian-beijing');

    expect(minimax?.endpoints.openai?.baseUrl).toBe('https://api.minimax.io/v1');
    expect(minimax?.endpoints.anthropic?.baseUrl).toBe('https://api.minimax.io/anthropic');
    expect(bailian?.endpoints.openai?.baseUrl).toBe('https://dashscope.aliyuncs.com/compatible-mode/v1');
    expect(bailian?.endpoints.anthropic?.baseUrl).toBe('https://dashscope.aliyuncs.com/apps/anthropic');
  });

  test('rejects custom templates without any protocol endpoint with a translation key', () => {
    const draft = {
      name: 'Empty vendor',
      endpoints: {
        openai: { baseUrl: '   ', model: '' },
        anthropic: { baseUrl: '', model: '' },
      },
    };

    expect(() => sanitizeTemplateDraft(draft)).toThrow(LlmApiTemplateValidationError);

    try {
      sanitizeTemplateDraft(draft);
    } catch (error) {
      expect(error).toBeInstanceOf(LlmApiTemplateValidationError);
      expect((error as LlmApiTemplateValidationError).key).toBe('tool.llm.error.atLeastOneEndpoint');
    }
  });

  test('rejects unnamed custom templates with a translation key', () => {
    try {
      sanitizeTemplateDraft({
        name: '   ',
        endpoints: { openai: { baseUrl: 'https://gateway.example.com/v1' } },
      });
    } catch (error) {
      expect(error).toBeInstanceOf(LlmApiTemplateValidationError);
      expect((error as LlmApiTemplateValidationError).key).toBe('tool.llm.error.templateNameRequired');
    }
  });

  test('trims custom template fields and drops empty endpoints', () => {
    expect(
      sanitizeTemplateDraft({
        name: '  Internal Gateway  ',
        endpoints: {
          openai: { baseUrl: ' https://gateway.example.com/v1 ', model: ' qwen-plus ' },
          anthropic: { baseUrl: ' ', model: ' ignored ' },
        },
      }),
    ).toEqual({
      id: 'custom:internal-gateway',
      name: 'Internal Gateway',
      source: 'custom',
      endpoints: {
        openai: {
          baseUrl: 'https://gateway.example.com/v1',
          model: 'qwen-plus',
        },
      },
    });
  });

  test('keeps custom template ids stable for Chinese names', () => {
    expect(
      sanitizeTemplateDraft({
        name: '公司网关',
        endpoints: {
          openai: { baseUrl: 'https://gateway.example.com/v1' },
        },
      }).id,
    ).toBe('custom:公司网关');
  });

  test('builds one validation input for each endpoint present in the selected template', () => {
    const inputs = buildTemplateValidationInputs({
      template: {
        id: 'custom:dual',
        name: 'Dual',
        source: 'custom',
        endpoints: {
          openai: { baseUrl: 'https://openai.example.com/v1', model: 'openai-model' },
          anthropic: { baseUrl: 'https://anthropic.example.com', model: 'claude-model' },
        },
      },
      apiKeys: ['sk-one', 'sk-two'],
    });

    expect(inputs).toEqual([
      {
        protocol: 'openai',
        baseUrl: 'https://openai.example.com/v1',
        model: 'openai-model',
        apiKeys: ['sk-one', 'sk-two'],
      },
      {
        protocol: 'anthropic',
        baseUrl: 'https://anthropic.example.com',
        model: 'claude-model',
        apiKeys: ['sk-one', 'sk-two'],
      },
    ]);
  });

  test('round trips custom templates through the settings value shape', () => {
    const templates = [
      sanitizeTemplateDraft({
        name: 'Gateway',
        endpoints: {
          openai: { baseUrl: 'https://gateway.example.com/v1', model: '' },
        },
      }),
    ];

    expect(parseCustomTemplatesSetting(serializeCustomTemplatesSetting(templates))).toEqual(templates);
    expect(parseCustomTemplatesSetting({ bad: 'value' })).toEqual([]);
  });
});