export type ToolResult = { ok: true; value: string } | { ok: false; error: string };

type BufferEncoding = 'base64' | 'utf8';

declare const Buffer: {
  from(input: string, encoding: BufferEncoding): { toString(encoding: BufferEncoding): string };
};

const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

export function encodeBase64(input: string): ToolResult {
  try {
    return { ok: true, value: Buffer.from(input, 'utf8').toString('base64') };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid input';

    return { ok: false, error: `Unable to encode Base64: ${message}` };
  }
}

export function decodeBase64(input: string): ToolResult {
  const normalizedInput = input.trim();

  if (!BASE64_PATTERN.test(normalizedInput)) {
    return { ok: false, error: 'Invalid Base64 input' };
  }

  try {
    return { ok: true, value: Buffer.from(normalizedInput, 'base64').toString('utf8') };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid input';

    return { ok: false, error: `Unable to decode Base64: ${message}` };
  }
}
