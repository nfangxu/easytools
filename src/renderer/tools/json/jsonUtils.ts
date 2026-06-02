export type ToolResult = { ok: true; value: string } | { ok: false; error: string };

function parseJson(input: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(input) };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid input';

    return { ok: false, error: `Invalid JSON: ${message}` };
  }
}

export function formatJson(input: string): ToolResult {
  const result = parseJson(input);

  if (!result.ok) {
    return result;
  }

  return { ok: true, value: JSON.stringify(result.value, null, 2) };
}

export function compactJson(input: string): ToolResult {
  const result = parseJson(input);

  if (!result.ok) {
    return result;
  }

  return { ok: true, value: JSON.stringify(result.value) };
}
