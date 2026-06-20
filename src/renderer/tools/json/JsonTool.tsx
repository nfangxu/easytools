import { Copy, RefreshCw } from 'lucide-react';
import { useRef, useState, type ReactElement } from 'react';

import { TextAreaPair } from '../../components/TextAreaPair';
import { ToolGauge, type ToolGaugeLed } from '../../components/ToolGauge';
import { ToolPlate, ToolPlateSwitch } from '../../components/ToolPlate';
import { useI18n } from '../../i18n/I18nProvider';
import {
  copyTextToClipboard,
  isLatestStatusRequest,
  saveRecentRun,
  type ToolStatusCode,
} from '../toolActions';
import { compactJson, formatJson } from './jsonUtils';

interface JsonToolProps {
  onRecentRunAdded: () => void;
}

type JsonOperation = 'format' | 'compact';

const SAMPLE_JSON = '{"name":"EasyTools","tools":["JSON","Base64","Timestamp"]}';

export function JsonTool({ onRecentRunAdded }: JsonToolProps): ReactElement {
  const { t } = useI18n();
  const [input, setInput] = useState(SAMPLE_JSON);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [statusKey, setStatusKey] = useState<ToolStatusCode>('');
  const [activeOperation, setActiveOperation] = useState<JsonOperation>('format');
  const [pulseKey, setPulseKey] = useState(0);
  const [ledState, setLedState] = useState<ToolGaugeLed>('idle');
  const statusRequestIdRef = useRef(0);

  function nextStatusRequestId(): number {
    const requestId = statusRequestIdRef.current + 1;
    statusRequestIdRef.current = requestId;

    return requestId;
  }

  function setLatestStatus(requestId: number, code: ToolStatusCode): void {
    if (isLatestStatusRequest(requestId, statusRequestIdRef.current)) {
      setStatusKey(code);
    }
  }

  async function run(operation: JsonOperation): Promise<void> {
    setActiveOperation(operation);
    const result = operation === 'format' ? formatJson(input) : compactJson(input);

    if (!result.ok) {
      setError(result.error);
      nextStatusRequestId();
      setStatusKey('');
      setLedState('error');
      setPulseKey((value) => value + 1);
      return;
    }

    const statusRequestId = nextStatusRequestId();
    setOutput(result.value);
    setError('');
    setLedState('ok');
    setPulseKey((value) => value + 1);
    const recentRunStatus = await saveRecentRun(
      {
        toolId: 'json',
        operation,
        summary: t(operation === 'format' ? 'tool.json.summary.format' : 'tool.json.summary.compact'),
        preview: result.value.slice(0, 120),
      },
      window.easytools?.addRecentRun,
    );
    setLatestStatus(statusRequestId, recentRunStatus);
    if (!recentRunStatus) {
      onRecentRunAdded();
    }
  }

  function clear(): void {
    setInput('');
    setOutput('');
    setError('');
    nextStatusRequestId();
    setStatusKey('');
    setLedState('idle');
  }

  async function copyOutput(): Promise<void> {
    const statusRequestId = nextStatusRequestId();
    const copyStatus = await copyTextToClipboard(
      output,
      navigator.clipboard.writeText.bind(navigator.clipboard),
    );
    setLatestStatus(statusRequestId, copyStatus);
  }

  const inputChars = input.length;
  const outputChars = output.length;
  const meterMax = Math.max(inputChars, outputChars, 1);

  return (
    <div className="tool-panel">
      <ToolPlate
        seriesNumber="03"
        category="Text"
        name="JSON"
        subtitle="FORMATTER"
        description={t('tool.json.description')}
        operations={
          <ToolPlateSwitch>
            <button
              type="button"
              className={activeOperation === 'format' ? 'active' : ''}
              onClick={() => void run('format')}
            >
              {t('tool.json.action.format')}
            </button>
            <button
              type="button"
              className={activeOperation === 'compact' ? 'active' : ''}
              onClick={() => void run('compact')}
            >
              {t('tool.json.action.compact')}
            </button>
          </ToolPlateSwitch>
        }
      />
      <div className="tool-body">
        {error ? (
          <div className="error-banner" role="alert">
            {error}
          </div>
        ) : null}
        {statusKey ? (
          <div className="status-message" role="status" aria-live="polite">
            {t(statusKey)}
          </div>
        ) : null}
        <TextAreaPair
          inputLabel={t('common.input')}
          outputLabel={t('common.output')}
          inputValue={input}
          outputValue={output}
          onInputChange={setInput}
          inputPlaceholder={t('tool.json.placeholder.input')}
          outputPlaceholder={t('tool.json.placeholder.output')}
        />
        <ToolGauge
          state={ledState}
          stateLabel={activeOperation === 'format' ? 'FORMAT' : 'COMPACT'}
          pulseKey={pulseKey}
          segments={[
            { label: 'IN', value: `${inputChars} ch`, meter: inputChars / meterMax },
            { label: 'OUT', value: `${outputChars} ch`, meter: outputChars / meterMax },
            {
              label: 'Δ',
              value:
                inputChars && outputChars
                  ? `${outputChars > inputChars ? '+' : ''}${outputChars - inputChars}`
                  : '—',
            },
          ]}
          actions={
            <>
              <button type="button" onClick={clear}>
                <RefreshCw size={12} />
                {t('common.clear')}
              </button>
              <button
                type="button"
                className="active"
                onClick={() => void copyOutput()}
                disabled={!output}
              >
                <Copy size={12} />
                {t('common.copy')}
              </button>
            </>
          }
        />
      </div>
    </div>
  );
}
