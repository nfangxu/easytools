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
import { decodeBase64, encodeBase64 } from './base64Utils';

interface Base64ToolProps {
  onRecentRunAdded: () => void;
}

type Base64Operation = 'encode' | 'decode';

export function Base64Tool({ onRecentRunAdded }: Base64ToolProps): ReactElement {
  const { t } = useI18n();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [statusKey, setStatusKey] = useState<ToolStatusCode>('');
  const [activeOperation, setActiveOperation] = useState<Base64Operation>('encode');
  const [processingTime, setProcessingTime] = useState('—');
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

  async function run(operation: Base64Operation): Promise<void> {
    const startTime = performance.now();
    setActiveOperation(operation);
    const result = operation === 'encode' ? encodeBase64(input) : decodeBase64(input);

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
    const endTime = performance.now();
    setProcessingTime(`${(endTime - startTime).toFixed(2)} ms`);
    setLedState('ok');
    setPulseKey((value) => value + 1);
    const recentRunStatus = await saveRecentRun(
      {
        toolId: 'base64',
        operation,
        summary: t(operation === 'encode' ? 'tool.base64.summary.encode' : 'tool.base64.summary.decode'),
        preview: result.value.slice(0, 120),
      },
      window.easytools?.addRecentRun,
    );
    setLatestStatus(statusRequestId, recentRunStatus);
    if (!recentRunStatus) {
      onRecentRunAdded();
    }
  }

  function clearAll(): void {
    setInput('');
    setOutput('');
    setError('');
    nextStatusRequestId();
    setStatusKey('');
    setProcessingTime('—');
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

  const inputBytes = input.length;
  const outputBytes = output.length;
  const meterMax = Math.max(inputBytes, outputBytes, 1);

  return (
    <div className="tool-panel">
      <ToolPlate
        seriesNumber="02"
        category="Text"
        name="BASE64"
        subtitle="ENCODER"
        description={t('tool.base64.description')}
        operations={
          <ToolPlateSwitch>
            <button
              type="button"
              className={activeOperation === 'encode' ? 'active' : ''}
              onClick={() => void run('encode')}
            >
              {t('tool.base64.action.encode')}
            </button>
            <button
              type="button"
              className={activeOperation === 'decode' ? 'active' : ''}
              onClick={() => void run('decode')}
            >
              {t('tool.base64.action.decode')}
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
          inputLabel={t('tool.base64.label.input')}
          outputLabel={t('tool.base64.label.output')}
          inputValue={input}
          outputValue={output}
          onInputChange={setInput}
          inputPlaceholder={t('tool.base64.placeholder.input')}
          outputPlaceholder=""
          showCopyButton={false}
        />
        <ToolGauge
          state={ledState}
          stateLabel={activeOperation === 'encode' ? 'ENCODE' : 'DECODE'}
          pulseKey={pulseKey}
          segments={[
            { label: 'IN', value: `${inputBytes} B`, meter: inputBytes / meterMax },
            { label: 'OUT', value: `${outputBytes} B`, meter: outputBytes / meterMax },
            { label: '◷', value: processingTime },
          ]}
          actions={
            <>
              <button type="button" onClick={clearAll}>
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
