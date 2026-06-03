import type {
  LlmApiBatchValidationResult,
  LlmApiKeyStatus,
  LlmApiKeyValidationResult,
  LlmApiProtocol,
  LlmApiStepResult,
  LlmApiValidationInput,
} from '../shared/types';

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

const DEFAULT_TIMEOUT_MS = 15_000;
const ANTHROPIC_VERSION = '2023-06-01';

export function maskApiKey(apiKey: string): string {
  const trimmed = apiKey.trim();
  if (trimmed.length <= 6) {
    return `${trimmed.slice(0, 3)}...${trimmed.slice(-3)}`;
  }

  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}

export async function validateLlmApiBatch(
  input: LlmApiValidationInput,
  fetcher: Fetcher = fetch,
): Promise<LlmApiBatchValidationResult> {
  const normalized = normalizeInput(input);
  const results: LlmApiKeyValidationResult[] = [];

  for (const apiKey of normalized.apiKeys) {
    results.push(await validateSingleKey(normalized, apiKey, fetcher));
  }

  return {
    total: results.length,
    availableCount: results.filter((result) => result.status === 'available').length,
    results,
  };
}

function normalizeInput(input: LlmApiValidationInput): LlmApiValidationInput {
  if (input.protocol !== 'openai' && input.protocol !== 'anthropic') {
    throw new Error('Protocol must be openai or anthropic.');
  }

  const baseUrl = input.baseUrl.trim().replace(/\/+$/, '');
  if (!baseUrl) {
    throw new Error('Base URL is required.');
  }

  try {
    const parsed = new URL(baseUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Base URL must use http or https.');
    }
  } catch {
    throw new Error('Base URL must be a valid URL.');
  }

  const apiKeys = input.apiKeys.map((key) => key.trim()).filter(Boolean);
  if (apiKeys.length === 0) {
    throw new Error('At least one API key is required.');
  }

  if (apiKeys.length > 50) {
    throw new Error('At most 50 API keys can be checked at once.');
  }

  return {
    protocol: input.protocol,
    baseUrl,
    apiKeys,
    model: input.model?.trim() ?? '',
  };
}

async function validateSingleKey(
  input: LlmApiValidationInput,
  apiKey: string,
  fetcher: Fetcher,
): Promise<LlmApiKeyValidationResult> {
  const modelList = await listModels(input.protocol, input.baseUrl, apiKey, fetcher);
  const selectedModel = input.model || modelList.modelIds[0] || '';
  const balance = await queryBalance(input.protocol, input.baseUrl, apiKey, fetcher);
  const chat = selectedModel
    ? await testChat(input.protocol, input.baseUrl, apiKey, selectedModel, fetcher)
    : { status: 'skipped' as const, message: 'No model available for chat test.' };
  const status = resolveStatus(modelList.step, chat);

  return {
    protocol: input.protocol,
    maskedKey: maskApiKey(apiKey),
    selectedModel,
    modelList: modelList.step,
    balance,
    chat,
    status,
    errorSummary: buildErrorSummary(modelList.step, balance, chat),
  };
}

async function listModels(
  protocol: LlmApiProtocol,
  baseUrl: string,
  apiKey: string,
  fetcher: Fetcher,
): Promise<{ step: LlmApiStepResult; modelIds: string[] }> {
  const response = await safeJsonFetch(`${baseUrl}/v1/models`, {
    method: 'GET',
    headers: protocolHeaders(protocol, apiKey),
  }, fetcher);

  if (!response.ok) {
    return {
      step: { status: 'failed', message: response.message },
      modelIds: [],
    };
  }

  const modelIds = extractModelIds(response.body);
  return {
    step: {
      status: 'success',
      message: modelIds.length > 0 ? `${modelIds.length} models returned.` : 'Model list returned.',
    },
    modelIds,
  };
}

async function queryBalance(
  protocol: LlmApiProtocol,
  baseUrl: string,
  apiKey: string,
  fetcher: Fetcher,
): Promise<LlmApiStepResult> {
  const paths = protocol === 'openai'
    ? ['/dashboard/billing/credit_grants', '/v1/dashboard/billing/credit_grants', '/v1/balance']
    : ['/v1/usage', '/v1/balance'];

  for (const path of paths) {
    const response = await safeJsonFetch(`${baseUrl}${path}`, {
      method: 'GET',
      headers: protocolHeaders(protocol, apiKey),
    }, fetcher);

    if (response.ok) {
      return { status: 'success', message: summarizeBalance(response.body) };
    }

    if (response.statusCode === 401 || response.statusCode === 403) {
      return { status: 'failed', message: response.message };
    }
  }

  return { status: 'unsupported', message: 'Balance endpoint is not supported or did not return data.' };
}

async function testChat(
  protocol: LlmApiProtocol,
  baseUrl: string,
  apiKey: string,
  model: string,
  fetcher: Fetcher,
): Promise<LlmApiStepResult> {
  if (protocol === 'openai') {
    const response = await safeJsonFetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        ...protocolHeaders(protocol, apiKey),
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Who are you?' }],
        max_tokens: 32,
        temperature: 0,
      }),
    }, fetcher);

    return response.ok
      ? { status: 'success', message: 'Chat completion succeeded.' }
      : { status: 'failed', message: response.message };
  }

  const response = await safeJsonFetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      ...protocolHeaders(protocol, apiKey),
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'Who are you?' }],
      max_tokens: 32,
    }),
  }, fetcher);

  return response.ok
    ? { status: 'success', message: 'Message request succeeded.' }
    : { status: 'failed', message: response.message };
}

function protocolHeaders(protocol: LlmApiProtocol, apiKey: string): Record<string, string> {
  if (protocol === 'openai') {
    return { Authorization: `Bearer ${apiKey}` };
  }

  return {
    'x-api-key': apiKey,
    'anthropic-version': ANTHROPIC_VERSION,
  };
}

async function safeJsonFetch(
  url: string,
  init: RequestInit,
  fetcher: Fetcher,
): Promise<{ ok: true; body: unknown } | { ok: false; statusCode: number; message: string }> {
  try {
    const response = await fetcher(url, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
    const body = await readJsonBody(response);

    if (!response.ok) {
      return {
        ok: false,
        statusCode: response.status,
        message: summarizeHttpError(response.status, body),
      };
    }

    return { ok: true, body };
  } catch (error) {
    return {
      ok: false,
      statusCode: 0,
      message: error instanceof Error ? error.message : 'Network request failed.',
    };
  }
}

async function readJsonBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function summarizeHttpError(status: number, body: unknown): string {
  const message = extractErrorMessage(body);
  return message ? `HTTP ${status}: ${message}` : `HTTP ${status}`;
}

function extractErrorMessage(body: unknown): string {
  if (!body || typeof body !== 'object') return '';
  const record = body as Record<string, unknown>;
  const error = record.error;

  if (typeof error === 'string') return error.slice(0, 240);
  if (error && typeof error === 'object') {
    const message = (error as Record<string, unknown>).message;
    if (typeof message === 'string') return message.slice(0, 240);
  }
  if (typeof record.message === 'string') return record.message.slice(0, 240);
  return '';
}

function extractModelIds(body: unknown): string[] {
  if (!body || typeof body !== 'object') return [];
  const data = (body as Record<string, unknown>).data;
  if (!Array.isArray(data)) return [];

  return data
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        const id = (item as Record<string, unknown>).id;
        return typeof id === 'string' ? id : '';
      }
      return '';
    })
    .filter(Boolean);
}

function summarizeBalance(body: unknown): string {
  if (!body || typeof body !== 'object') return 'Balance endpoint returned data.';
  const record = body as Record<string, unknown>;
  for (const key of ['total_available', 'total_granted', 'balance', 'credit', 'credits']) {
    const value = record[key];
    if (typeof value === 'number' || typeof value === 'string') {
      return `${key}: ${value}`;
    }
  }
  return 'Balance endpoint returned data.';
}

function resolveStatus(modelList: LlmApiStepResult, chat: LlmApiStepResult): LlmApiKeyStatus {
  if (chat.status === 'success') return 'available';
  if (modelList.status === 'success') return 'partial';
  return 'unavailable';
}

function buildErrorSummary(...steps: LlmApiStepResult[]): string {
  return steps
    .filter((step) => step.status === 'failed')
    .map((step) => step.message)
    .join(' | ')
    .slice(0, 500);
}
