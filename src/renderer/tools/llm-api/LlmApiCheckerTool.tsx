import { useState, type ReactElement } from 'react';

import type {
  LlmApiBatchValidationResult,
  LlmApiKeyValidationResult,
  LlmApiProtocol,
} from '../../../shared/types';
import { ToolChrome } from '../../components/ToolChrome';
import { TOOL_STATUS } from '../toolActions';
import {
  buildLlmApiRecentRunSummary,
  parseApiKeys,
  protocolLabel,
} from './llmApiForm';

interface LlmApiCheckerToolProps {
  onRecentRunAdded: () => void;
}

const DEFAULT_BASE_URL = 'https://api.openai.com';

export function LlmApiCheckerTool({ onRecentRunAdded }: LlmApiCheckerToolProps): ReactElement {
  const [protocol, setProtocol] = useState<LlmApiProtocol>('openai');
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [model, setModel] = useState('');
  const [apiKeysText, setApiKeysText] = useState('');
  const [result, setResult] = useState<LlmApiBatchValidationResult | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  async function runValidation(): Promise<void> {
    const apiKeys = parseApiKeys(apiKeysText);

    if (!baseUrl.trim()) {
      setError('请输入 API 地址。');
      return;
    }

    if (apiKeys.length === 0) {
      setError('请至少输入一个 API Key。');
      return;
    }

    setIsRunning(true);
    setError('');
    setStatus('正在逐个校验...');
    setResult(null);

    try {
      if (!window.easytools?.validateLlmApi) {
        throw new Error(TOOL_STATUS.electronApiUnavailable);
      }

      const validationResult = await window.easytools.validateLlmApi({
        protocol,
        baseUrl,
        apiKeys,
        model,
      });
      setResult(validationResult);
      setStatus(`校验完成：${validationResult.availableCount}/${validationResult.total} 可用`);
      await saveRecentRun(validationResult);
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : '校验失败。');
      setStatus('');
    } finally {
      setIsRunning(false);
    }
  }

  async function saveRecentRun(validationResult: LlmApiBatchValidationResult): Promise<void> {
    const recentRun = buildLlmApiRecentRunSummary({
      protocol,
      baseUrl,
      total: validationResult.total,
      availableCount: validationResult.availableCount,
    });

    try {
      if (!window.easytools?.addRecentRun) {
        setStatus(`${recentRun.summary}，${TOOL_STATUS.electronApiUnavailable}`);
        return;
      }

      await window.easytools.addRecentRun({
        toolId: 'llm-api',
        operation: protocol,
        summary: recentRun.summary,
        preview: recentRun.preview,
      });
      onRecentRunAdded();
    } catch {
      setStatus(`${recentRun.summary}，最近记录保存失败`);
    }
  }

  function clear(): void {
    setModel('');
    setApiKeysText('');
    setResult(null);
    setError('');
    setStatus('');
  }

  return (
    <ToolChrome title="大模型 API 校验" description="批量校验 OpenAI 或 Anthropic 兼容 API Key。">
      <div className="llm-form">
        <label className="field-block">
          <span>兼容协议</span>
          <select value={protocol} onChange={(event) => setProtocol(event.target.value as LlmApiProtocol)}>
            <option value="openai">OpenAI-compatible</option>
            <option value="anthropic">Anthropic-compatible</option>
          </select>
        </label>
        <label className="field-block">
          <span>API 地址</span>
          <input
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder="https://api.openai.com"
          />
        </label>
        <label className="field-block">
          <span>模型名（可选）</span>
          <input value={model} onChange={(event) => setModel(event.target.value)} placeholder="留空使用模型列表第一个" />
        </label>
        <label className="field-block llm-key-field">
          <span>API Key（每行一个）</span>
          <textarea
            value={apiKeysText}
            onChange={(event) => setApiKeysText(event.target.value)}
            placeholder="sk-..."
            spellCheck={false}
          />
        </label>
      </div>
      <div className="toolbar">
        <button type="button" onClick={() => void runValidation()} disabled={isRunning}>
          {isRunning ? '校验中' : '开始校验'}
        </button>
        <button type="button" className="secondary" onClick={clear} disabled={isRunning}>
          清空
        </button>
      </div>
      {error ? <div className="error-banner" role="alert">{error}</div> : null}
      {status ? <div className="status-message" role="status" aria-live="polite">{status}</div> : null}
      {result ? <ValidationResultsTable protocol={protocol} results={result.results} /> : null}
    </ToolChrome>
  );
}

function ValidationResultsTable({
  protocol,
  results,
}: {
  protocol: LlmApiProtocol;
  results: LlmApiKeyValidationResult[];
}): ReactElement {
  return (
    <div className="llm-results">
      <table>
        <caption>{protocolLabel(protocol)} 校验结果</caption>
        <thead>
          <tr>
            <th>API Key</th>
            <th>模型</th>
            <th>余额</th>
            <th>对话</th>
            <th>结论</th>
            <th>错误摘要</th>
          </tr>
        </thead>
        <tbody>
          {results.map((item) => (
            <tr key={`${item.maskedKey}-${item.selectedModel}`}>
              <td>{item.maskedKey}</td>
              <td>{stepText(item.modelList, item.selectedModel || '-')}</td>
              <td>{stepText(item.balance)}</td>
              <td>{stepText(item.chat)}</td>
              <td>
                <span className={`llm-status llm-status-${item.status}`}>{statusLabel(item.status)}</span>
              </td>
              <td>{item.errorSummary || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function stepText(step: { status: string; message: string }, successText = step.message): string {
  return step.status === 'success' ? successText : step.message;
}

function statusLabel(status: LlmApiKeyValidationResult['status']): string {
  if (status === 'available') return '可用';
  if (status === 'partial') return '部分可用';
  return '不可用';
}
