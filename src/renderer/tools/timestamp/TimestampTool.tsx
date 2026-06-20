import { Copy, RefreshCw } from 'lucide-react';
import { useRef, useState, type ReactElement } from 'react';

import { ToolGauge, type ToolGaugeLed } from '../../components/ToolGauge';
import { ToolPlate, ToolPlateSwitch } from '../../components/ToolPlate';
import { useI18n } from '../../i18n/I18nProvider';
import {
  copyTextToClipboard,
  isLatestStatusRequest,
  saveRecentRun,
  type ToolStatusCode,
} from '../toolActions';
import {
  dateToTimestamp,
  timestampToDate,
  type DateToTimestampResult,
  type TimestampToDateResult,
} from './timestampUtils';

interface TimestampToolProps {
  onRecentRunAdded: () => void;
}

type SuccessfulTimestampToDate = Extract<TimestampToDateResult, { ok: true }>;
type SuccessfulDateToTimestamp = Extract<DateToTimestampResult, { ok: true }>;
type TimestampDirection = 'to-date' | 'to-timestamp';

export function buildTimestampToDateState(converted: SuccessfulTimestampToDate): {
  dateText: string;
  result: string;
} {
  return {
    dateText: converted.value,
    result: `${converted.value}\n${converted.milliseconds} ms`,
  };
}

export function buildDateToTimestampState(converted: SuccessfulDateToTimestamp): {
  timestamp: string;
  result: string;
} {
  return {
    timestamp: String(converted.seconds),
    result: `${converted.seconds} s\n${converted.milliseconds} ms`,
  };
}

export function TimestampTool({ onRecentRunAdded }: TimestampToolProps): ReactElement {
  const { t } = useI18n();
  const [timestampInput, setTimestampInput] = useState('1704067200');
  const [dateInput, setDateInput] = useState('2024-01-01 00:00:00');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [statusKey, setStatusKey] = useState<ToolStatusCode>('');
  const [direction, setDirection] = useState<TimestampDirection>('to-date');
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

  async function runTimestampToDate(): Promise<void> {
    setDirection('to-date');
    const conversion = timestampToDate(timestampInput);

    if (!conversion.ok) {
      setError(conversion.error);
      nextStatusRequestId();
      setStatusKey('');
      setLedState('error');
      setPulseKey((value) => value + 1);
      return;
    }

    const statusRequestId = nextStatusRequestId();
    const nextState = buildTimestampToDateState(conversion);
    setDateInput(nextState.dateText);
    setResult(nextState.result);
    setError('');
    setLedState('ok');
    setPulseKey((value) => value + 1);
    const recentRunStatus = await saveRecentRun(
      {
        toolId: 'timestamp',
        operation: 'timestamp-to-date',
        summary: t('tool.timestamp.summary.toDate'),
        preview: nextState.result.slice(0, 120),
      },
      window.easytools?.addRecentRun,
    );
    setLatestStatus(statusRequestId, recentRunStatus);
    if (!recentRunStatus) {
      onRecentRunAdded();
    }
  }

  async function runDateToTimestamp(): Promise<void> {
    setDirection('to-timestamp');
    const conversion = dateToTimestamp(dateInput);

    if (!conversion.ok) {
      setError(conversion.error);
      nextStatusRequestId();
      setStatusKey('');
      setLedState('error');
      setPulseKey((value) => value + 1);
      return;
    }

    const statusRequestId = nextStatusRequestId();
    const nextState = buildDateToTimestampState(conversion);
    setTimestampInput(nextState.timestamp);
    setResult(nextState.result);
    setError('');
    setLedState('ok');
    setPulseKey((value) => value + 1);
    const recentRunStatus = await saveRecentRun(
      {
        toolId: 'timestamp',
        operation: 'date-to-timestamp',
        summary: t('tool.timestamp.summary.toTimestamp'),
        preview: nextState.result.slice(0, 120),
      },
      window.easytools?.addRecentRun,
    );
    setLatestStatus(statusRequestId, recentRunStatus);
    if (!recentRunStatus) {
      onRecentRunAdded();
    }
  }

  function clear(): void {
    setTimestampInput('');
    setDateInput('');
    setResult('');
    setError('');
    nextStatusRequestId();
    setStatusKey('');
    setLedState('idle');
  }

  async function copyResult(): Promise<void> {
    const statusRequestId = nextStatusRequestId();
    const copyStatus = await copyTextToClipboard(
      result,
      navigator.clipboard.writeText.bind(navigator.clipboard),
    );
    setLatestStatus(statusRequestId, copyStatus);
  }

  return (
    <div className="tool-panel">
      <ToolPlate
        seriesNumber="01"
        category="Date"
        name="TIMESTAMP"
        subtitle="CONVERTER"
        description={t('tool.timestamp.description')}
        operations={
          <ToolPlateSwitch>
            <button
              type="button"
              className={direction === 'to-date' ? 'active' : ''}
              onClick={() => void runTimestampToDate()}
            >
              {t('tool.timestamp.action.toDate')}
            </button>
            <button
              type="button"
              className={direction === 'to-timestamp' ? 'active' : ''}
              onClick={() => void runDateToTimestamp()}
            >
              {t('tool.timestamp.action.toTimestamp')}
            </button>
          </ToolPlateSwitch>
        }
      />
      <div className="tool-body">
        <div className="timestamp-grid">
          <label className="field-block compact-field">
            <span>{t('tool.timestamp.label.timestamp')}</span>
            <input
              value={timestampInput}
              onChange={(event) => {
                setTimestampInput(event.target.value);
              }}
              placeholder={t('tool.timestamp.placeholder.timestamp')}
            />
          </label>
          <label className="field-block compact-field">
            <span>{t('tool.timestamp.label.datetime')}</span>
            <input
              value={dateInput}
              onChange={(event) => {
                setDateInput(event.target.value);
              }}
              placeholder={t('tool.timestamp.placeholder.datetime')}
            />
          </label>
        </div>
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
        <label className="field-block">
          <span>{t('tool.timestamp.label.result')}</span>
          <textarea
            className="result-area"
            value={result}
            readOnly
            placeholder={t('tool.timestamp.placeholder.result')}
            spellCheck={false}
          />
        </label>
        <ToolGauge
          state={ledState}
          stateLabel={direction === 'to-date' ? '→ DATE' : '→ TS'}
          pulseKey={pulseKey}
          segments={[
            {
              label: 'INPUT',
              value: direction === 'to-date' ? timestampInput || '—' : dateInput || '—',
            },
            {
              label: 'RESULT',
              value: result ? result.split('\n')[0] : '—',
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
                onClick={() => void copyResult()}
                disabled={!result}
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
