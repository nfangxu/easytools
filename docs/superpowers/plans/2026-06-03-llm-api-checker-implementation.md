# LLM API Checker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a batch LLM API checker tool for OpenAI-compatible and Anthropic-compatible APIs.

**Architecture:** Main process performs all network validation through a new typed IPC method. Renderer presents a form and result table. API keys are transient and never persisted; only safe metadata is stored in recent runs.

**Tech Stack:** Electron IPC, TypeScript, React, Vitest, built-in `fetch`/`AbortSignal.timeout`.

---

## File Structure

- Create `src/main/llmApiChecker.ts`: request validation, protocol-specific calls, key masking, batch orchestration.
- Create `tests/llmApiChecker.test.ts`: mocked fetch tests for OpenAI and Anthropic flows.
- Modify `src/shared/types.ts`: add LLM checker types and `validateLlmApi` to `EasyToolsApi`.
- Modify `src/main/ipc.ts`: register `llm-api:validate` with runtime input validation.
- Modify `src/preload/index.ts`: expose `validateLlmApi`.
- Modify `src/renderer/vite-env.d.ts`: picks up expanded shared API type.
- Create `src/renderer/tools/llm-api/LlmApiCheckerTool.tsx`: form, start/clear, result table.
- Create `src/renderer/tools/llm-api/llmApiForm.ts`: parse key textarea and summarize results.
- Create `src/renderer/tools/llm-api/llmApiForm.test.ts`: parse/summarize tests.
- Modify `src/renderer/tools/registry.ts`: add tool under `AI 工具`.
- Modify `src/renderer/tools/registry.test.ts`: expect new tool.
- Modify `src/renderer/styles.css`: compact form/table/status styles.

---

## Tasks

### Task 1: Main Process LLM API Checker

- [ ] Write failing tests in `tests/llmApiChecker.test.ts` for key masking, OpenAI success, Anthropic success, failed key continuation, and no-key validation.
- [ ] Implement shared result/input types in `src/shared/types.ts`.
- [ ] Implement `src/main/llmApiChecker.ts` with serial batch validation and mocked-fetch injection.
- [ ] Add IPC validation and handler in `src/main/ipc.ts`.
- [ ] Expose preload method in `src/preload/index.ts`.
- [ ] Run `npm test -- tests/llmApiChecker.test.ts` and `npm run typecheck`.
- [ ] Commit as `feat: add llm api validation service`.

### Task 2: Renderer Tool UI

- [ ] Write failing tests in `src/renderer/tools/llm-api/llmApiForm.test.ts` for key parsing and safe recent-run summary.
- [ ] Implement `llmApiForm.ts`.
- [ ] Implement `LlmApiCheckerTool.tsx` using `window.easytools.validateLlmApi`.
- [ ] Add the tool to registry and registry test.
- [ ] Add CSS for compact form grid and result table.
- [ ] Run `npm test -- src/renderer/tools/llm-api/llmApiForm.test.ts src/renderer/tools/registry.test.ts` and `npm run typecheck`.
- [ ] Commit as `feat: add llm api checker tool`.

### Task 3: Verification

- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Verify no code path stores full API keys in SQLite or recent runs.
- [ ] Commit fixes if needed.

## Self-Review

- Spec coverage: covers protocols, batch serial checking, no key storage, optional balance, UI, and tests.
- Deferred-work markers: none.
- Type consistency: shared types are the source for main, preload, and renderer.
