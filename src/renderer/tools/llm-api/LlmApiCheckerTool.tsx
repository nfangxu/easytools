import { useEffect, useMemo, useState, type ReactElement } from 'react';

import type {
  LlmApiBatchValidationResult,
  LlmApiKeyValidationResult,
  LlmApiProtocol,
} from '../../../shared/types';
import { ToolGauge, type ToolGaugeLed } from '../../components/ToolGauge';
import { ToolPlate } from '../../components/ToolPlate';
import { useI18n } from '../../i18n/I18nProvider';
import type { Translator } from '../../i18n/I18nProvider';
import { TOOL_STATUS } from '../toolActions';
import { buildLlmApiPreviewLine, parseApiKeys, protocolLabel } from './llmApiForm';
import {
  BUILTIN_LLM_API_TEMPLATES,
  CUSTOM_TEMPLATES_SETTING_NAMESPACE,
  LlmApiTemplateValidationError,
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
  const { t } = useI18n();
  const [selectedTemplateId, setSelectedTemplateId] = useState(BUILTIN_LLM_API_TEMPLATES[0].id);
  const [customTemplates, setCustomTemplates] = useState<LlmApiTemplate[]>([]);
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
  const [templateDraft, setTemplateDraft] = useState(EMPTY_TEMPLATE_DRAFT);
  const [apiKeysText, setApiKeysText] = useState('');
  const [results, setResults] = useState<ProtocolValidationResult[]>([]);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);
  const templates = useMemo(
    () => [...BUILTIN_LLM_API_TEMPLATES, ...customTemplates],
    [customTemplates],
  );
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
          setStatus(t('tool.llm.status.loadFailed'));
        }
      }
    }

    void loadCustomTemplates();

    return () => {
      isMounted = false;
    };
  }, [t]);

  async function runValidation(): Promise<void> {
    const apiKeys = parseApiKeys(apiKeysText);
    const validationInputs = buildTemplateValidationInputs({
      template: selectedTemplate,
      apiKeys,
    });

    if (validationInputs.length === 0) {
      setError(t('tool.llm.error.noEndpoint'));
      return;
    }

    if (apiKeys.length === 0) {
      setError(t('tool.llm.error.noKeys'));
      return;
    }

    setIsRunning(true);
    setError('');
    setStatus(
      t('tool.llm.status.running', {
        template: selectedTemplate.name,
        count: validationInputs.length,
      }),
    );
    setResults([]);

    try {
      if (!window.easytools?.validateLlmApi) {
        throw new Error(t(TOOL_STATUS.electronApiUnavailable));
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
      setStatus(buildStatusMessage(t, selectedTemplate.name, validationResults));
      setPulseKey((value) => value + 1);
      await saveRecentRun(validationResults);
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : t('tool.llm.error.validationFailed'));
      setStatus('');
      setPulseKey((value) => value + 1);
    } finally {
      setIsRunning(false);
    }
  }

  async function saveRecentRun(validationResults: ProtocolValidationResult[]): Promise<void> {
    const total = validationResults.reduce((sum, item) => sum + item.result.total, 0);
    const availableCount = validationResults.reduce(
      (sum, item) => sum + item.result.availableCount,
      0,
    );
    const preview = validationResults
      .map((item) =>
        buildLlmApiPreviewLine({
          protocol: item.protocol,
          baseUrl: item.baseUrl,
          total: item.result.total,
          availableCount: item.result.availableCount,
        }),
      )
      .join('\n');
    const summary = t('tool.llm.summary', {
      template: selectedTemplate.name,
      available: availableCount,
      total,
    });

    try {
      if (!window.easytools?.addRecentRun) {
        setStatus(`${summary}, ${t(TOOL_STATUS.electronApiUnavailable)}`);
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
      setStatus(t('tool.llm.status.recentSaveFailed', { summary }));
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
      setStatus(t('tool.llm.status.savedTemplate', { name: template.name }));
    } catch (templateError) {
      if (templateError instanceof LlmApiTemplateValidationError) {
        setError(t(templateError.key));
      } else {
        setError(templateError instanceof Error ? templateError.message : t('tool.llm.error.saveFailed'));
      }
    }
  }

  function clear(): void {
    setApiKeysText('');
    setResults([]);
    setError('');
    setStatus('');
  }

  const totalKeys = results.reduce((sum, item) => sum + item.result.total, 0);
  const availableKeys = results.reduce((sum, item) => sum + item.result.availableCount, 0);
  const ledState: ToolGaugeLed = error
    ? 'error'
    : isRunning
      ? 'armed'
      : totalKeys > 0
        ? availableKeys === totalKeys
          ? 'ok'
          : availableKeys > 0
            ? 'armed'
            : 'error'
        : 'idle';

  return (
    <div className="tool-panel">
      <ToolPlate
        seriesNumber="05"
        category="AI"
        name="LLM API"
        subtitle="CHECKER"
        description={t('tool.llm.description')}
      />
      <div className="tool-body">
        <section className="llm-config-panel" aria-label={t('tool.llm.aria.config')}>
          <div className="llm-template-row">
            <label className="field-block compact-field">
              <span>{t('tool.llm.label.template')}</span>
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
            <TemplateEndpointSummary template={selectedTemplate} t={t} />
          </div>
          <label className="field-block llm-key-field">
            <span>{t('tool.llm.label.keys')}</span>
            <textarea
              value={apiKeysText}
              onChange={(event) => setApiKeysText(event.target.value)}
              placeholder={t('tool.llm.placeholder.keys')}
              spellCheck={false}
            />
          </label>
          <div className="toolbar llm-action-bar">
            <button
              type="button"
              className="active"
              onClick={() => void runValidation()}
              disabled={isRunning}
            >
              {isRunning ? t('tool.llm.action.running') : t('tool.llm.action.run')}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setIsTemplateEditorOpen((current) => !current);
                setTemplateDraft(EMPTY_TEMPLATE_DRAFT);
                setError('');
              }}
              disabled={isRunning}
              aria-expanded={isTemplateEditorOpen}
            >
              {isTemplateEditorOpen ? t('tool.llm.action.closeTemplate') : t('tool.llm.action.addTemplate')}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={clear}
              disabled={isRunning}
            >
              {t('common.clear')}
            </button>
          </div>
        </section>
        {isTemplateEditorOpen ? (
          <section className="llm-template-editor-panel" aria-label={t('tool.llm.aria.editor')}>
            <div className="llm-template-editor">
              <label className="field-block llm-template-editor-name compact-field">
                <span>{t('tool.llm.editor.name')}</span>
                <input
                  value={templateDraft.name}
                  onChange={(event) =>
                    setTemplateDraft((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder={t('tool.llm.editor.placeholder.name')}
                />
              </label>
              <label className="field-block compact-field">
                <span>{t('tool.llm.editor.openaiBaseUrl')}</span>
                <input
                  value={templateDraft.openaiBaseUrl}
                  onChange={(event) =>
                    setTemplateDraft((current) => ({ ...current, openaiBaseUrl: event.target.value }))
                  }
                  placeholder="https://example.com/v1"
                />
              </label>
              <label className="field-block compact-field">
                <span>{t('tool.llm.editor.openaiModel')}</span>
                <input
                  value={templateDraft.openaiModel}
                  onChange={(event) =>
                    setTemplateDraft((current) => ({ ...current, openaiModel: event.target.value }))
                  }
                  placeholder={t('tool.llm.editor.placeholder.modelEmpty')}
                />
              </label>
              <label className="field-block compact-field">
                <span>{t('tool.llm.editor.anthropicBaseUrl')}</span>
                <input
                  value={templateDraft.anthropicBaseUrl}
                  onChange={(event) =>
                    setTemplateDraft((current) => ({
                      ...current,
                      anthropicBaseUrl: event.target.value,
                    }))
                  }
                  placeholder="https://example.com/anthropic"
                />
              </label>
              <label className="field-block compact-field">
                <span>{t('tool.llm.editor.anthropicModel')}</span>
                <input
                  value={templateDraft.anthropicModel}
                  onChange={(event) =>
                    setTemplateDraft((current) => ({
                      ...current,
                      anthropicModel: event.target.value,
                    }))
                  }
                  placeholder={t('tool.llm.editor.placeholder.modelEmpty')}
                />
              </label>
            </div>
            <div className="toolbar llm-template-editor-actions">
              <button
                type="button"
                className="active"
                onClick={() => void saveTemplate()}
                disabled={isRunning}
              >
                {t('tool.llm.action.save')}
              </button>
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
                {t('common.cancel')}
              </button>
            </div>
          </section>
        ) : null}
        {error ? (
          <div className="error-banner" role="alert">
            {error}
          </div>
        ) : null}
        {status ? (
          <div className="status-message" role="status" aria-live="polite">
            {status}
          </div>
        ) : null}
        {results.map((item) => (
          <ValidationResultsTable
            key={`${item.protocol}-${item.baseUrl}`}
            protocol={item.protocol}
            baseUrl={item.baseUrl}
            results={item.result.results}
            t={t}
          />
        ))}
        <ToolGauge
          state={ledState}
          stateLabel={isRunning ? 'VERIFY' : 'READY'}
          pulseKey={pulseKey}
          segments={[
            { label: 'TEMPLATE', value: selectedTemplate.name },
            {
              label: 'KEYS',
              value: totalKeys > 0 ? String(totalKeys) : '—',
            },
            {
              label: 'AVAIL',
              value: totalKeys > 0 ? `${availableKeys}/${totalKeys}` : '—',
              meter: totalKeys > 0 ? availableKeys / totalKeys : undefined,
            },
          ]}
        />
      </div>
    </div>
  );
}

function TemplateEndpointSummary({
  template,
  t,
}: {
  template: LlmApiTemplate;
  t: Translator;
}): ReactElement {
  return (
    <div className="llm-template-summary" aria-label={t('tool.llm.aria.endpoints')}>
      {(['openai', 'anthropic'] as const).map((protocol) => {
        const endpoint = template.endpoints[protocol];

        return (
          <div
            key={protocol}
            className={
              endpoint
                ? 'llm-template-endpoint'
                : 'llm-template-endpoint llm-template-endpoint-muted'
            }
          >
            <strong>{protocolLabel(protocol)}</strong>
            <span>{endpoint?.baseUrl || t('tool.llm.endpoint.notConfigured')}</span>
            {endpoint?.model ? (
              <small>{endpoint.model}</small>
            ) : (
              <small>{t('tool.llm.endpoint.autoSelect')}</small>
            )}
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
  t,
}: {
  protocol: LlmApiProtocol;
  baseUrl: string;
  results: LlmApiKeyValidationResult[];
  t: Translator;
}): ReactElement {
  const availableCount = results.filter((item) => item.status === 'available').length;
  const protocolName = protocolLabel(protocol);

  return (
    <section
      className="llm-result-section"
      aria-label={t('tool.llm.aria.results', { protocol: protocolName })}
    >
      <header className="llm-result-heading">
        <div>
          <h2>{protocolName}</h2>
          <p>{baseUrl}</p>
        </div>
        <span>{t('tool.llm.results.available', { available: availableCount, total: results.length })}</span>
      </header>
      <div className="llm-results">
        <table>
          <thead>
            <tr>
              <th>{t('tool.llm.column.key')}</th>
              <th>{t('tool.llm.column.model')}</th>
              <th>{t('tool.llm.column.balance')}</th>
              <th>{t('tool.llm.column.chat')}</th>
              <th>{t('tool.llm.column.status')}</th>
              <th>{t('tool.llm.column.error')}</th>
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
                  <span className={`llm-status llm-status-${item.status}`}>
                    {statusLabel(t, item.status)}
                  </span>
                </td>
                <td>{item.errorSummary || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function buildStatusMessage(
  t: Translator,
  templateName: string,
  results: ProtocolValidationResult[],
): string {
  const total = results.reduce((sum, item) => sum + item.result.total, 0);
  const availableCount = results.reduce((sum, item) => sum + item.result.availableCount, 0);

  return t('tool.llm.status.complete', { template: templateName, available: availableCount, total });
}

function stepText(step: { status: string; message: string }, successText = step.message): string {
  return step.status === 'success' ? successText : step.message;
}

function statusLabel(t: Translator, status: LlmApiKeyValidationResult['status']): string {
  if (status === 'available') return t('tool.llm.statusLabel.available');
  if (status === 'partial') return t('tool.llm.statusLabel.partial');
  return t('tool.llm.statusLabel.unavailable');
}
