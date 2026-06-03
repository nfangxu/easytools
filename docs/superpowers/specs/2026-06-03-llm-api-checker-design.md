# LLM API Checker Design

## Goal

Add a desktop utility that validates one base API URL against multiple API keys, one key at a time. The tool supports OpenAI-compatible and Anthropic-compatible APIs and reports whether each key can list models, optionally read balance information, and complete a small chat request.

## Scope

The first version supports:

- One API base URL per run.
- Protocol selection: `openai` or `anthropic`.
- Multiple API keys entered as newline-separated text.
- Optional model override. If empty, the checker uses the first model returned by the model-list call when possible.
- Serial key validation to reduce rate-limit risk.
- Result rows per key with masked key, model-list status, balance status, chat status, final availability, and error summary.
- Recent-run metadata only: protocol, base URL, checked count, available count, and timestamp.

The first version does not store API keys, does not run checks in parallel, and does not implement provider-specific paid account dashboards.

## Protocol Behavior

OpenAI-compatible:

- Models: `GET {baseUrl}/v1/models`
- Chat: `POST {baseUrl}/v1/chat/completions`
- Auth header: `Authorization: Bearer <key>`
- Chat body uses a user message: `Who are you?`

Anthropic-compatible:

- Models: `GET {baseUrl}/v1/models`
- Chat: `POST {baseUrl}/v1/messages`
- Auth headers: `x-api-key: <key>` and `anthropic-version: 2023-06-01`
- Chat body uses a user message: `Who are you?`

Balance:

- There is no universal official balance endpoint across OpenAI-compatible or Anthropic-compatible providers.
- The checker treats balance as optional. It can try common provider endpoints and report `unsupported` or `failed` without making the whole key unavailable.

## Architecture

Network calls run in the Electron main process, not the renderer. The preload bridge exposes a narrow typed method:

- `validateLlmApi(input): Promise<LlmApiBatchValidationResult>`

The renderer owns form state and presentation. The main process owns request construction, timeouts, response parsing, API key masking, and validation.

## Privacy And Storage

API keys are transient only:

- They are never written to SQLite.
- They are never stored in recent-run preview.
- They are masked before returning to the renderer.
- Error summaries must not include complete request headers or full keys.

Recent runs store only safe metadata, such as `Checked 5 OpenAI-compatible keys, 3 available`.

## Result Semantics

Per-key final status:

- `available`: chat test succeeds.
- `partial`: model list succeeds but chat fails.
- `unavailable`: model list and chat both fail or auth clearly fails.

Batch result:

- Total checked.
- Available count.
- Per-key results in input order.

## Error Handling

Each check uses bounded timeouts. Errors are summarized with concise messages:

- HTTP status code and provider error message when available.
- Network timeout.
- Invalid base URL.
- Empty key.
- No model available for chat when model override is empty and model list fails.

The batch continues when one key fails.

## UI

Add a new tool under category `AI 工具`:

- Name: `大模型 API 校验`
- Fields: protocol selector, API base URL, optional model, multi-line API keys.
- Actions: start validation, clear.
- Result table: masked key, model list, balance, chat, final status, error summary.

The UI should be compact and utilitarian like the existing tools.

## Testing

Tests should cover:

- Input parsing and key masking.
- OpenAI request construction and success/failure parsing using mocked fetch.
- Anthropic request construction and success/failure parsing using mocked fetch.
- Serial batch behavior continues after failures.
- Preload/shared type coverage through TypeScript.
- Registry includes the new tool.
