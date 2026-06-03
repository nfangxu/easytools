import { BrowserWindow, ipcMain } from 'electron';

import type {
  LlmApiValidationInput,
  RecentRunInput,
  SettingValue,
} from '../shared/types';
import type { createDatabase } from './database';
import { validateLlmApiBatch } from './llmApiChecker';

const MAX_SHORT_TEXT_LENGTH = 80;
const MAX_SUMMARY_LENGTH = 240;
const MAX_PREVIEW_LENGTH = 500;
const MAX_SETTING_JSON_LENGTH = 8 * 1024;
const MAX_SETTING_DEPTH = 20;
const MAX_SETTING_NODES = 1000;
const MAX_LLM_BASE_URL_LENGTH = 300;
const MAX_LLM_API_KEY_LENGTH = 500;
const MAX_LLM_API_KEYS = 50;

export type WindowControlAction = 'minimize' | 'toggleMaximize' | 'close';

const windowControlChannels = {
  'window:minimize': 'minimize',
  'window:toggle-maximize': 'toggleMaximize',
  'window:close': 'close',
} as const;

export function getWindowControlAction(channel: string): WindowControlAction {
  const action = windowControlChannels[channel as keyof typeof windowControlChannels];

  if (!action) {
    throw new Error('Unsupported window control channel.');
  }

  return action;
}

export function registerIpc(database: ReturnType<typeof createDatabase>): void {
  ipcMain.handle('settings:get', (_event, namespace: string) =>
    database.getSetting(validateNamespace(namespace)),
  );

  ipcMain.handle(
    'settings:set',
    (_event, namespace: string, value: unknown) => {
      database.setSetting(
        validateNamespace(namespace),
        validateSettingValue(value),
      );
    },
  );

  ipcMain.handle('recent-runs:list', (_event, toolId: unknown) =>
    database.listRecentRuns(validateNamespace(toolId)),
  );

  ipcMain.handle('recent-runs:add', (_event, input: unknown) =>
    database.addRecentRun(validateRecentRunInput(input)),
  );

  ipcMain.handle('llm-api:validate', (_event, input: unknown) =>
    validateLlmApiBatch(validateLlmApiValidationInput(input)),
  );

  for (const channel of Object.keys(windowControlChannels)) {
    ipcMain.handle(channel, (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) return;

      switch (getWindowControlAction(channel)) {
        case 'minimize':
          window.minimize();
          break;
        case 'toggleMaximize':
          if (window.isMaximized()) {
            window.unmaximize();
          } else {
            window.maximize();
          }
          break;
        case 'close':
          window.close();
          break;
      }
    });
  }
}

export function validateNamespace(namespace: unknown): string {
  return validateTextField(namespace, 'namespace', MAX_SHORT_TEXT_LENGTH);
}

export function validateSettingValue(value: unknown): SettingValue {
  if (!isSerializableSettingValue(value, new Set(), 0, { count: 0 })) {
    throw new Error(
      'Setting value must be JSON-serializable within SettingValue scope.',
    );
  }

  const serialized = JSON.stringify(value);

  if (serialized.length > MAX_SETTING_JSON_LENGTH) {
    throw new Error('Setting value must serialize to 8 KB or less.');
  }

  return value;
}

export function validateRecentRunInput(input: unknown): RecentRunInput {
  if (!isRecord(input)) {
    throw new Error('Recent run input must be an object.');
  }

  const recentRun: RecentRunInput = {
    toolId: validateTextField(input.toolId, 'toolId', MAX_SHORT_TEXT_LENGTH),
    operation: validateTextField(
      input.operation,
      'operation',
      MAX_SHORT_TEXT_LENGTH,
    ),
    summary: validateTextField(input.summary, 'summary', MAX_SUMMARY_LENGTH),
  };

  if (input.preview !== undefined) {
    recentRun.preview = validateTextField(
      input.preview,
      'preview',
      MAX_PREVIEW_LENGTH,
      true,
    );
  }

  return recentRun;
}

export function validateLlmApiValidationInput(input: unknown): LlmApiValidationInput {
  if (!isRecord(input)) {
    throw new Error('LLM API validation input must be an object.');
  }

  if (input.protocol !== 'openai' && input.protocol !== 'anthropic') {
    throw new Error('protocol must be openai or anthropic.');
  }

  const baseUrl = validateTextField(input.baseUrl, 'baseUrl', MAX_LLM_BASE_URL_LENGTH);
  const model = input.model === undefined
    ? ''
    : validateTextField(input.model, 'model', MAX_SHORT_TEXT_LENGTH, true);

  if (!Array.isArray(input.apiKeys)) {
    throw new Error('apiKeys must be an array.');
  }

  if (input.apiKeys.length === 0 || input.apiKeys.length > MAX_LLM_API_KEYS) {
    throw new Error(`apiKeys must contain 1 to ${MAX_LLM_API_KEYS} items.`);
  }

  return {
    protocol: input.protocol,
    baseUrl,
    model,
    apiKeys: input.apiKeys.map((apiKey) =>
      validateTextField(apiKey, 'apiKey', MAX_LLM_API_KEY_LENGTH),
    ),
  };
}

function validateTextField(
  value: unknown,
  fieldName: string,
  maxLength: number,
  allowEmpty = false,
): string {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string.`);
  }

  if (!allowEmpty && value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }

  if (value.length > maxLength) {
    throw new Error(`${fieldName} must be ${maxLength} characters or fewer.`);
  }

  return value;
}

function isSerializableSettingValue(
  value: unknown,
  seen: Set<object>,
  depth: number,
  nodeBudget: { count: number },
): value is SettingValue {
  if (depth > MAX_SETTING_DEPTH) {
    throw new Error(
      `Setting value exceeds maximum depth of ${MAX_SETTING_DEPTH}.`,
    );
  }

  nodeBudget.count += 1;

  if (nodeBudget.count > MAX_SETTING_NODES) {
    throw new Error(
      `Setting value must contain ${MAX_SETTING_NODES} nodes or fewer.`,
    );
  }

  if (value === null) return true;

  switch (typeof value) {
    case 'string':
    case 'boolean':
      return true;
    case 'number':
      return Number.isFinite(value);
    case 'object':
      if (Array.isArray(value)) {
        return isSerializableArray(value, seen, depth, nodeBudget);
      }

      return isSerializableRecord(value, seen, depth, nodeBudget);
    default:
      return false;
  }
}

function isSerializableArray(
  value: unknown[],
  seen: Set<object>,
  depth: number,
  nodeBudget: { count: number },
): value is SettingValue[] {
  if (seen.has(value)) return false;

  seen.add(value);

  for (const nestedValue of value) {
    if (!isSerializableSettingValue(nestedValue, seen, depth + 1, nodeBudget)) {
      seen.delete(value);
      return false;
    }
  }

  seen.delete(value);
  return true;
}

function isSerializableRecord(
  value: object,
  seen: Set<object>,
  depth: number,
  nodeBudget: { count: number },
): value is { [key: string]: SettingValue } {
  if (Object.getPrototypeOf(value) !== Object.prototype) return false;
  if (seen.has(value)) return false;

  seen.add(value);

  for (const nestedValue of Object.values(value)) {
    if (!isSerializableSettingValue(nestedValue, seen, depth + 1, nodeBudget)) {
      seen.delete(value);
      return false;
    }
  }

  seen.delete(value);
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}
