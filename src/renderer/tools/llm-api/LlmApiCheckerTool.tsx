import { useEffect, useMemo, useState, type ReactElement } from 'react';

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
import {
  BUILTIN_LLM_API_TEMPLATES,
  CUSTOM_TEMPLATES_SETTING_NAMESPACE,
  buildTemplateValidationInputs,
  parseCustomTemplatesSetting,
  sanitizeTemplateDraft,
  serializeCustomTemplatesSetting,
  type LlmApiTemplate,
} from './llmApiTemplates';

interface LlmApiCheckerToolProps {
  onRecentRunAdded: () => void;
}

interface ProtocolValidationResult {
  protocol: LlmApiProtocol;
  baseUrl: string;
  result: LlmApiBatchValidationResult;
}

const EMPTY_TEMPLATE_DRAFT = {
  name: '',
  openaiBaseUrl: '',
  openaiModel: '',
  anthropicBaseUrl: '',
  anthropicModel: '',
};

export function LlmApiCheckerTool({ onRecentRunAdded }: LlmApiCheckerToolProps): ReactElement {
  const [selectedTemplateId, setSelectedTemplateId] = useState(BUILTIN_LLM_API_TEMPLATES[0].id);
  const [customTemplates, setCustomTemplates] = useState<LlmApiTemplate[]>([]);
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
  const [templateDraft, setTemplateDraft] = useState(EMPTY_TEMPLATE_DRAFT);
  const [apiKeysText, setApiKeysText] = useState('');
  const [results, setResults] = useState<ProtocolValidationResult[]>([]);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const templates = useMemo(() => [...BUILTIN_LLM_API_TEMPLATES, ...customTemplates], [customTemplates]);
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? templates[0];

  useEffect(() => {
    let isMounted = true;

    async function loadCustomTemplates(): Promise<void> {
      try {
        const setting = await window.easytools?.getSetting(CUSTOM_TEMPLATES_SETTING_NAMESPACE);

        if (isMounted) {
          setCustomTemplates(parseCustomTemplatesSetting(setting ?? null));
        }
      } catch {
        if (isMounted) {
          setStatus('自定义模板加载失败');
        }
      }
    }

    void loadCustomTemplates();

    return () => {
      isMounted = false;
    };
  }, []);

  async function runValidation(): Promise<void> {
    const apiKeys = parseApiKeys(apiKeysText);
    const validationInputs = buildTemplateValidationInputs({
      template: selectedTemplate,
      apiKeys,
    });

    if (validationInputs.length === 0) {
      setError('当前模板至少需要填写一个协议地址。');
      return;
    }

    if (apiKeys.length === 0) {
      setError('请至少输入一个 API Key。');
      return;
    }

    setIsRunning(true);
    setError('');
    setStatus(`正在校验 ${selectedTemplate.name} 的 ${validationInputs.length} 个协议端点...`);
    setResults([]);

    try {
      if (!window.easytools?.validateLlmApi) {
        throw new Error(TOOL_STATUS.electronApiUnavailable);
      }

      const validationResults: ProtocolValidationResult[] = [];

      for (const validationInput of validationInputs) {
        const validationResult = await window.easytools.validateLlmApi(validationInput);
        validationResults.push({
          protocol: validationInput.protocol,
          baseUrl: validationInput.baseUrl,
          result: validationResult,
        });
      }

      setResults(validationResults);
      setStatus(buildStatusMessage(selectedTemplate.name, validationResults));
      await saveRecentRun(validationResults);
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : '校验失败。');
      setStatus('');
    } finally {
      setIsRunning(false);
    }
  }

  async function saveRecentRun(validationResults: ProtocolValidationResult[]): Promise<void> {
    const total = validationResults.reduce((sum, item) => sum + item.result.total, 0);
    const availableCount = validationResults.reduce((sum, item) => sum + item.result.availableCount, 0);
    const preview = validationResults
      .map((item) => {
        const recentRun = buildLlmApiRecentRunSummary({
          protocol: item.protocol,
          baseUrl: item.baseUrl,
          total: item.result.total,
          availableCount: item.result.availableCount,
        });

        return recentRun.preview;
      })
      .join('\n');
    const summary = `${selectedTemplate.name} 校验：${availableCount}/${total} 可用`;

    try {
      if (!window.easytools?.addRecentRun) {
        setStatus(`${summary}，${TOOL_STATUS.electronApiUnavailable}`);
        return;
      }

      await window.easytools.addRecentRun({
        toolId: 'llm-api',
        operation: selectedTemplate.name,
        summary,
        preview,
      });
      onRecentRunAdded();
    } catch {
      setStatus(`${summary}，最近记录保存失败`);
    }
  }

  async function saveTemplate(): Promise<void> {
    try {
      const template = sanitizeTemplateDraft({
        name: templateDraft.name,
        endpoints: {
          openai: {
            baseUrl: templateDraft.openaiBaseUrl,
            model: templateDraft.openaiModel,
          },
          anthropic: {
            baseUrl: templateDraft.anthropicBaseUrl,
            model: templateDraft.anthropicModel,
          },
        },
      });
      const nextTemplates = [
        ...customTemplates.filter((item) => item.id !== template.id),
        template,
      ];

      await window.easytools?.setSetting(
        CUSTOM_TEMPLATES_SETTING_NAMESPACE,
        serializeCustomTemplatesSetting(nextTemplates),
      );
      setCustomTemplates(nextTemplates);
      setSelectedTemplateId(template.id);
      setTemplateDraft(EMPTY_TEMPLATE_DRAFT);
      setIsTemplateEditorOpen(false);
      setError('');
      setStatus(`已保存模板：${template.name}`);
    } catch (templateError) {
      setError(templateError instanceof Error ? templateError.message : '模板保存失败。');
    }
  }

  function clear(): void {
    setApiKeysText('');
    setResults([]);
    setError('');
    setStatus('');
  }

  return (
    <ToolChrome title="大模型 API 校验" description="选择厂商模板，批量校验 OpenAI 与 Anthropic 兼容 API Key。">
      <div className="llm-form">
        <label className="field-block">
          <span>模板</span>
          <select
            value={selectedTemplate.id}
            onChange={(event) => {
              setSelectedTemplateId(event.target.value);
              setResults([]);
              setError('');
              setStatus('');
            }}
          >
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </label>
        <TemplateEndpointSummary template={selectedTemplate} />
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
      {isTemplateEditorOpen ? (
        <div className="llm-template-editor">
          <label className="field-block">
            <span>模板名称</span>
            <input
              value={templateDraft.name}
              onChange={(event) => setTemplateDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="例如：公司网关"
            />
          </label>
          <label className="field-block">
            <span>OpenAI 协议地址</span>
            <input
              value={templateDraft.openaiBaseUrl}
              onChange={(event) => setTemplateDraft((current) => ({ ...current, openaiBaseUrl: event.target.value }))}
              placeholder="https://example.com/v1"
            />
          </label>
          <label className="field-block">
            <span>OpenAI 模型名（可选）</span>
            <input
              value={templateDraft.openaiModel}
              onChange={(event) => setTemplateDraft((current) => ({ ...current, openaiModel: event.target.value }))}
              placeholder="留空使用模型列表第一个"
            />
          </label>
          <label className="field-block">
            <span>Anthropic 协议地址</span>
            <input
              value={templateDraft.anthropicBaseUrl}
              onChange={(event) => setTemplateDraft((current) => ({ ...current, anthropicBaseUrl: event.target.value }))}
              placeholder="https://example.com/anthropic"
            />
          </label>
          <label className="field-block">
            <span>Anthropic 模型名（可选）</span>
            <input
              value={templateDraft.anthropicModel}
              onChange={(event) => setTemplateDraft((current) => ({ ...current, anthropicModel: event.target.value }))}
              placeholder="留空使用模型列表第一个"
            />
          </label>
        </div>
      ) : null}
      <div className="toolbar">
        <button type="button" onClick={() => void runValidation()} disabled={isRunning}>
          {isRunning ? '校验中' : '开始校验'}
        </button>
        {isTemplateEditorOpen ? (
          <button type="button" className="secondary" onClick={() => void saveTemplate()} disabled={isRunning}>
            保存模板
          </button>
        ) : (
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setIsTemplateEditorOpen(true);
              setError('');
            }}
            disabled={isRunning}
          >
            添加模板
          </button>
        )}
        {isTemplateEditorOpen ? (
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setIsTemplateEditorOpen(false);
              setTemplateDraft(EMPTY_TEMPLATE_DRAFT);
              setError('');
            }}
            disabled={isRunning}
          >
            取消
          </button>
        ) : null}
        <button type="button" className="secondary" onClick={clear} disabled={isRunning}>
          清空
        </button>
      </div>
      {error ? <div className="error-banner" role="alert">{error}</div> : null}
      {status ? <div className="status-message" role="status" aria-live="polite">{status}</div> : null}
      {results.map((item) => (
        <ValidationResultsTable
          key={`${item.protocol}-${item.baseUrl}`}
          protocol={item.protocol}
          baseUrl={item.baseUrl}
          results={item.result.results}
        />
      ))}
    </ToolChrome>
  );
}

function TemplateEndpointSummary({ template }: { template: LlmApiTemplate }): ReactElement {
  return (
    <div className="llm-template-summary" aria-label="模板协议地址">
      {(['openai', 'anthropic'] as const).map((protocol) => {
        const endpoint = template.endpoints[protocol];

        return (
          <div key={protocol} className={endpoint ? 'llm-template-endpoint' : 'llm-template-endpoint llm-template-endpoint-muted'}>
            <strong>{protocolLabel(protocol)}</strong>
            <span>{endpoint?.baseUrl || '未配置'}</span>
            {endpoint?.model ? <small>{endpoint.model}</small> : <small>自动选择模型</small>}
          </div>
        );
      })}
    </div>
  );
}

function ValidationResultsTable({
  protocol,
  baseUrl,
  results,
}: {
  protocol: LlmApiProtocol;
  baseUrl: string;
  results: LlmApiKeyValidationResult[];
}): ReactElement {
  return (
    <div className="llm-results">
      <table>
        <caption>{protocolLabel(protocol)} 校验结果 · {baseUrl}</caption>
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

function buildStatusMessage(templateName: string, results: ProtocolValidationResult[]): string {
  const total = results.reduce((sum, item) => sum + item.result.total, 0);
  const availableCount = results.reduce((sum, item) => sum + item.result.availableCount, 0);

  return `${templateName} 校验完成：${availableCount}/${total} 可用`;
}

function stepText(step: { status: string; message: string }, successText = step.message): string {
  return step.status === 'success' ? successText : step.message;
}

function statusLabel(status: LlmApiKeyValidationResult['status']): string {
  if (status === 'available') return '可用';
  if (status === 'partial') return '部分可用';
  return '不可用';
}
