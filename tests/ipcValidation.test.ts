import { describe, expect, it } from 'vitest';

import {
  getWindowControlAction,
  validateNamespace,
  validateRecentRunInput,
  validateSettingValue,
} from '../src/main/ipc';

describe('window control IPC', () => {
  it('maps allowed window control channels to window actions', () => {
    expect(getWindowControlAction('window:minimize')).toBe('minimize');
    expect(getWindowControlAction('window:toggle-maximize')).toBe('toggleMaximize');
    expect(getWindowControlAction('window:close')).toBe('close');
  });

  it('rejects unknown window control channels', () => {
    expect(() => getWindowControlAction('window:open-devtools')).toThrow('Unsupported window control channel');
  });
});

describe('ipc validation', () => {
  it('accepts valid IPC payloads', () => {
    expect(validateNamespace('json')).toBe('json');
    expect(
      validateSettingValue({
        indent: 2,
        enabled: true,
        modes: ['compact', { label: 'expanded', levels: [1, 2, null] }],
      }),
    ).toEqual({
      indent: 2,
      enabled: true,
      modes: ['compact', { label: 'expanded', levels: [1, 2, null] }],
    });
    expect(
      validateRecentRunInput({
        toolId: 'base64',
        operation: 'encode',
        summary: 'Encoded 12 characters',
        preview: 'RWFzeVRvb2xz',
      }),
    ).toEqual({
      toolId: 'base64',
      operation: 'encode',
      summary: 'Encoded 12 characters',
      preview: 'RWFzeVRvb2xz',
    });
  });

  it('returns only allowed recent run fields from IPC payloads', () => {
    expect(
      validateRecentRunInput({
        toolId: 'base64',
        operation: 'encode',
        summary: 'Encoded 12 characters',
        preview: 'RWFzeVRvb2xz',
        rawInput: 'EasyTools',
      }),
    ).toEqual({
      toolId: 'base64',
      operation: 'encode',
      summary: 'Encoded 12 characters',
      preview: 'RWFzeVRvb2xz',
    });
  });

  it('rejects invalid namespaces and oversized namespaces', () => {
    expect(() => validateNamespace('')).toThrow('namespace');
    expect(() => validateNamespace('a'.repeat(81))).toThrow('80');
    expect(() => validateNamespace(42)).toThrow('namespace');
  });

  it('rejects invalid setting values', () => {
    expect(() => validateSettingValue(undefined)).toThrow('JSON-serializable');
    expect(() => validateSettingValue(Number.POSITIVE_INFINITY)).toThrow(
      'JSON-serializable',
    );
    expect(() => validateSettingValue(() => undefined)).toThrow(
      'JSON-serializable',
    );
    expect(() => validateSettingValue(Symbol('json'))).toThrow(
      'JSON-serializable',
    );
    expect(() => validateSettingValue(new Date())).toThrow(
      'JSON-serializable',
    );

    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(() => validateSettingValue(circular)).toThrow('JSON-serializable');
  });

  it('rejects oversized serialized setting values', () => {
    expect(() => validateSettingValue('a'.repeat(8 * 1024))).toThrow('8 KB');
  });

  it('rejects overly deep nested setting values with a validation error', () => {
    let value: unknown = null;

    for (let index = 0; index < 21; index += 1) {
      value = [value];
    }

    expect(() => validateSettingValue(value)).toThrow('depth');
  });

  it('rejects setting values with too many nodes', () => {
    expect(() => validateSettingValue(Array.from({ length: 1001 }, () => null)))
      .toThrow('1000');
  });

  it('rejects invalid recent run payloads', () => {
    expect(() =>
      validateRecentRunInput({
        toolId: '',
        operation: 'encode',
        summary: 'Encoded 12 characters',
      }),
    ).toThrow('toolId');
    expect(() =>
      validateRecentRunInput({
        toolId: 'base64',
        summary: 'Encoded 12 characters',
      }),
    ).toThrow('operation');
    expect(() =>
      validateRecentRunInput({
        toolId: 'base64',
        operation: 'encode',
      }),
    ).toThrow('summary');
    expect(() =>
      validateRecentRunInput({
        toolId: 'base64',
        operation: 'e'.repeat(81),
        summary: 'Encoded 12 characters',
      }),
    ).toThrow('80');
    expect(() =>
      validateRecentRunInput({
        toolId: 'base64',
        operation: 'encode',
        summary: 's'.repeat(241),
      }),
    ).toThrow('240');
    expect(() =>
      validateRecentRunInput({
        toolId: 'base64',
        operation: 'encode',
        summary: 'Encoded 12 characters',
        preview: 'p'.repeat(501),
      }),
    ).toThrow('500');
    expect(() =>
      validateRecentRunInput({
        toolId: 'base64',
        operation: 'encode',
        summary: 'Encoded 12 characters',
        preview: 12,
      }),
    ).toThrow('preview');
  });
});
