export type ToolResult = { ok: true; value: string } | { ok: false; error: string };

const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const BINARY_CHUNK_SIZE = 0x8000;

function bytesToBinaryString(bytes: Uint8Array): string {
  const chunks: string[] = [];

  for (let index = 0; index < bytes.length; index += BINARY_CHUNK_SIZE) {
    chunks.push(String.fromCharCode(...bytes.subarray(index, index + BINARY_CHUNK_SIZE)));
  }

  return chunks.join('');
}

function binaryStringToBytes(binary: string): Uint8Array {
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

export function encodeBase64(input: string): ToolResult {
  try {
    const bytes = new TextEncoder().encode(input);

    return { ok: true, value: btoa(bytesToBinaryString(bytes)) };
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
    const bytes = binaryStringToBytes(atob(normalizedInput));
    const value = new TextDecoder('utf-8', { fatal: true }).decode(bytes);

    return { ok: true, value };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid input';

    return { ok: false, error: `Unable to decode Base64: ${message}` };
  }
}
