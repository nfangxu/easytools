export interface ParsedJwt {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  headerJson: string;
  payloadJson: string;
  signingInput: string;
  signature: string;
}

export type JwtParseResult = { ok: true; value: ParsedJwt } | { ok: false; error: string };

export interface JwtSignatureVerificationResult {
  supported: boolean;
  valid: boolean;
  message: string;
}

const HMAC_ALGORITHMS: Record<string, { hash: string; label: string }> = {
  HS256: { hash: 'SHA-256', label: 'HS256' },
  HS384: { hash: 'SHA-384', label: 'HS384' },
  HS512: { hash: 'SHA-512', label: 'HS512' },
};

export function parseJwt(token: string): JwtParseResult {
  const trimmed = token.trim();
  const parts = trimmed.split('.');

  if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
    return { ok: false, error: 'JWT 必须包含 header、payload、signature 三段。' };
  }

  try {
    const header = parseJwtJsonPart(parts[0], 'header');
    const payload = parseJwtJsonPart(parts[1], 'payload');

    return {
      ok: true,
      value: {
        header,
        payload,
        headerJson: JSON.stringify(header, null, 2),
        payloadJson: JSON.stringify(payload, null, 2),
        signingInput: `${parts[0]}.${parts[1]}`,
        signature: parts[2],
      },
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'JWT 解析失败。' };
  }
}

export function analyzeJwtTiming(payload: Record<string, unknown>, nowSeconds = Date.now() / 1000): string[] {
  const messages: string[] = [];
  const exp = readNumericDate(payload.exp);
  const nbf = readNumericDate(payload.nbf);
  const iat = readNumericDate(payload.iat);

  if (exp !== null) {
    messages.push(`${exp <= nowSeconds ? '已过期' : '未过期'}：${formatNumericDate(exp)}`);
  }

  if (nbf !== null) {
    messages.push(`${nbf > nowSeconds ? '尚未生效' : '已生效'}：${formatNumericDate(nbf)}`);
  }

  if (iat !== null) {
    messages.push(`签发时间：${formatNumericDate(iat)}`);
  }

  return messages.length > 0 ? messages : ['未包含 exp/nbf/iat 时间声明。'];
}

export async function verifyJwtHmacSignature(
  token: string,
  secret: string,
): Promise<JwtSignatureVerificationResult> {
  const parsed = parseJwt(token);

  if (!parsed.ok) {
    return { supported: false, valid: false, message: parsed.error };
  }

  const algorithmName = typeof parsed.value.header.alg === 'string' ? parsed.value.header.alg : '';
  const algorithm = HMAC_ALGORITHMS[algorithmName];

  if (!algorithm) {
    return {
      supported: false,
      valid: false,
      message: '当前仅支持 HS256/HS384/HS512 密钥校验。',
    };
  }

  if (!secret) {
    return {
      supported: true,
      valid: false,
      message: '请输入密钥后再校验签名。',
    };
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: algorithm.hash },
    false,
    ['verify'],
  );
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    bytesToArrayBuffer(base64UrlToBytes(parsed.value.signature)),
    new TextEncoder().encode(parsed.value.signingInput),
  );

  return {
    supported: true,
    valid,
    message: valid ? `${algorithm.label} 签名校验通过。` : `${algorithm.label} 签名校验失败。`,
  };
}

function parseJwtJsonPart(value: string, partName: string): Record<string, unknown> {
  const decoded = new TextDecoder().decode(base64UrlToBytes(value));
  const parsed: unknown = JSON.parse(decoded);

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${partName} 必须是 JSON 对象。`);
  }

  return parsed as Record<string, unknown>;
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function readNumericDate(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function formatNumericDate(value: number): string {
  const date = new Date(value * 1000);
  const parts = new Intl.DateTimeFormat('zh-CN', {
    hour12: false,
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '00';

  return `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')}:${part('second')}`;
}
