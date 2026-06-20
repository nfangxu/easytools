import type {
  LlmApiProtocol,
  LlmApiValidationInput,
  SettingValue,
} from '../../../shared/types';
import type { TranslationKey } from '../../i18n/translations';

export interface LlmApiTemplateEndpoint {
  baseUrl: string;
  model: string;
}

export interface LlmApiTemplate {
  id: string;
  name: string;
  source: 'builtin' | 'custom';
  endpoints: Partial<Record<LlmApiProtocol, LlmApiTemplateEndpoint>>;
}

export interface LlmApiTemplateDraft {
  name: string;
  endpoints: Partial<Record<LlmApiProtocol, Partial<LlmApiTemplateEndpoint>>>;
}

/**
 * Thrown by `sanitizeTemplateDraft` when a draft fails validation. The `key`
 * is a translation key the caller should run through `t()` for display.
 */
export class LlmApiTemplateValidationError extends Error {
  constructor(public readonly key: TranslationKey) {
    super(key);
    this.name = 'LlmApiTemplateValidationError';
  }
}

export const CUSTOM_TEMPLATES_SETTING_NAMESPACE = 'llm-api:custom-templates';

export const BUILTIN_LLM_API_TEMPLATES: LlmApiTemplate[] = [
  {
    id: 'builtin:openai',
    name: 'OpenAI',
    source: 'builtin',
    endpoints: {
      openai: {
        baseUrl: 'https://api.openai.com',
        model: '',
      },
    },
  },
  {
    id: 'builtin:anthropic',
    name: 'Anthropic',
    source: 'builtin',
    endpoints: {
      anthropic: {
        baseUrl: 'https://api.anthropic.com',
        model: '',
      },
    },
  },
  {
    id: 'builtin:minimax-global',
    name: 'MiniMax（国际）',
    source: 'builtin',
    endpoints: {
      openai: {
        baseUrl: 'https://api.minimax.io/v1',
        model: 'MiniMax-M3',
      },
      anthropic: {
        baseUrl: 'https://api.minimax.io/anthropic',
        model: 'MiniMax-M3',
      },
    },
  },
  {
    id: 'builtin:minimax-cn',
    name: 'MiniMax（中国）',
    source: 'builtin',
    endpoints: {
      openai: {
        baseUrl: 'https://api.minimaxi.com/v1',
        model: 'MiniMax-M3',
      },
      anthropic: {
        baseUrl: 'https://api.minimaxi.com/anthropic',
        model: 'MiniMax-M3',
      },
    },
  },
  {
    id: 'builtin:aliyun-bailian-beijing',
    name: '阿里百炼（北京）',
    source: 'builtin',
    endpoints: {
      openai: {
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        model: '',
      },
      anthropic: {
        baseUrl: 'https://dashscope.aliyuncs.com/apps/anthropic',
        model: '',
      },
    },
  },
  {
    id: 'builtin:aliyun-bailian-singapore',
    name: '阿里百炼（新加坡）',
    source: 'builtin',
    endpoints: {
      openai: {
        baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
        model: '',
      },
      anthropic: {
        baseUrl: 'https://dashscope-intl.aliyuncs.com/apps/anthropic',
        model: '',
      },
    },
  },
  {
    id: 'builtin:aliyun-bailian-us',
    name: '阿里百炼（美国）',
    source: 'builtin',
    endpoints: {
      openai: {
        baseUrl: 'https://dashscope-us.aliyuncs.com/compatible-mode/v1',
        model: '',
      },
      anthropic: {
        baseUrl: 'https://dashscope-us.aliyuncs.com/apps/anthropic',
        model: '',
      },
    },
  },
];

export function sanitizeTemplateDraft(draft: LlmApiTemplateDraft): LlmApiTemplate {
  const name = draft.name.trim();

  if (!name) {
    throw new LlmApiTemplateValidationError('tool.llm.error.templateNameRequired');
  }

  const endpoints: LlmApiTemplate['endpoints'] = {};
  const openai = sanitizeEndpoint(draft.endpoints.openai);
  const anthropic = sanitizeEndpoint(draft.endpoints.anthropic);

  if (openai) {
    endpoints.openai = openai;
  }

  if (anthropic) {
    endpoints.anthropic = anthropic;
  }

  if (!endpoints.openai && !endpoints.anthropic) {
    throw new LlmApiTemplateValidationError('tool.llm.error.atLeastOneEndpoint');
  }

  return {
    id: `custom:${slugify(name)}`,
    name,
    source: 'custom',
    endpoints,
  };
}

export function buildTemplateValidationInputs(input: {
  template: LlmApiTemplate;
  apiKeys: string[];
}): LlmApiValidationInput[] {
  const validationInputs: LlmApiValidationInput[] = [];

  for (const protocol of ['openai', 'anthropic'] as const) {
    const endpoint = input.template.endpoints[protocol];

    if (!endpoint?.baseUrl.trim()) {
      continue;
    }

    validationInputs.push({
      protocol,
      baseUrl: endpoint.baseUrl,
      model: endpoint.model,
      apiKeys: input.apiKeys,
    });
  }

  return validationInputs;
}

export function serializeCustomTemplatesSetting(templates: LlmApiTemplate[]): SettingValue {
  return templates
    .filter((template) => template.source === 'custom')
    .map((template) => ({
      id: template.id,
      name: template.name,
      endpoints: {
        openai: template.endpoints.openai
          ? { ...template.endpoints.openai }
          : null,
        anthropic: template.endpoints.anthropic
          ? { ...template.endpoints.anthropic }
          : null,
      },
    }));
}

export function parseCustomTemplatesSetting(value: SettingValue | null): LlmApiTemplate[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const templates: LlmApiTemplate[] = [];

  for (const item of value) {
    if (!isSettingRecord(item) || typeof item.name !== 'string') {
      continue;
    }

    const endpointsRecord = isSettingRecord(item.endpoints) ? item.endpoints : {};

    try {
      templates.push(
        sanitizeTemplateDraft({
          name: item.name,
          endpoints: {
            openai: parseEndpoint(endpointsRecord.openai),
            anthropic: parseEndpoint(endpointsRecord.anthropic),
          },
        }),
      );
    } catch {
      continue;
    }
  }

  return templates;
}

function sanitizeEndpoint(
  endpoint: Partial<LlmApiTemplateEndpoint> | undefined,
): LlmApiTemplateEndpoint | null {
  const baseUrl = endpoint?.baseUrl?.trim() ?? '';

  if (!baseUrl) {
    return null;
  }

  return {
    baseUrl,
    model: endpoint?.model?.trim() ?? '',
  };
}

function parseEndpoint(value: SettingValue | undefined): Partial<LlmApiTemplateEndpoint> {
  if (!isSettingRecord(value)) {
    return {};
  }

  return {
    baseUrl: typeof value.baseUrl === 'string' ? value.baseUrl : '',
    model: typeof value.model === 'string' ? value.model : '',
  };
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');

  return slug || `template-${Date.now()}`;
}

function isSettingRecord(value: unknown): value is Record<string, SettingValue> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
