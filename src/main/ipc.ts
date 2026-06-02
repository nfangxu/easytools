import { ipcMain } from 'electron';

import type { RecentRunInput, SettingValue } from '../shared/types';
import type { createDatabase } from './database';

const MAX_SHORT_TEXT_LENGTH = 80;
const MAX_SUMMARY_LENGTH = 240;
const MAX_PREVIEW_LENGTH = 500;
const MAX_SETTING_JSON_LENGTH = 8 * 1024;

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

  ipcMain.handle('recent-runs:list', () => database.listRecentRuns());

  ipcMain.handle('recent-runs:add', (_event, input: unknown) =>
    database.addRecentRun(validateRecentRunInput(input)),
  );
}

export function validateNamespace(namespace: unknown): string {
  return validateTextField(namespace, 'namespace', MAX_SHORT_TEXT_LENGTH);
}

export function validateSettingValue(value: unknown): SettingValue {
  if (!isSerializableSettingValue(value, new Set())) {
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
): value is SettingValue {
  if (value === null) return true;

  switch (typeof value) {
    case 'string':
    case 'boolean':
      return true;
    case 'number':
      return Number.isFinite(value);
    case 'object':
      if (Array.isArray(value)) {
        return isSerializableArray(value, seen);
      }

      return isSerializableRecord(value, seen);
    default:
      return false;
  }
}

function isSerializableArray(
  value: unknown[],
  seen: Set<object>,
): value is SettingValue[] {
  if (seen.has(value)) return false;

  seen.add(value);

  for (const nestedValue of value) {
    if (!isSerializableSettingValue(nestedValue, seen)) {
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
): value is { [key: string]: SettingValue } {
  if (Object.getPrototypeOf(value) !== Object.prototype) return false;
  if (seen.has(value)) return false;

  seen.add(value);

  for (const nestedValue of Object.values(value)) {
    if (!isSerializableSettingValue(nestedValue, seen)) {
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
