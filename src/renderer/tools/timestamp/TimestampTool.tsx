import { useRef, useState, type ReactElement } from 'react';

import { ToolChrome } from '../../components/ToolChrome';
import { copyTextToClipboard, isLatestStatusRequest, saveRecentRun } from '../toolActions';
import { dateToTimestamp, timestampToDate, type DateToTimestampResult, type TimestampToDateResult } from './timestampUtils';

interface TimestampToolProps {
  onRecentRunAdded: () => void;
}

type SuccessfulTimestampToDate = Extract<TimestampToDateResult, { ok: true }>;
type SuccessfulDateToTimestamp = Extract<DateToTimestampResult, { ok: true }>;

export function buildTimestampToDateState(converted: SuccessfulTimestampToDate): { dateText: string; result: string } {
  return {
    dateText: converted.value,
    result: `${converted.value}\n${converted.milliseconds} ms`,
  };
}

export function buildDateToTimestampState(converted: SuccessfulDateToTimestamp): { timestamp: string; result: string } {
  return {
    timestamp: String(converted.seconds),
    result: `${converted.seconds} s\n${converted.milliseconds} ms`,
  };
}

export function TimestampTool({ onRecentRunAdded }: TimestampToolProps): ReactElement {
  const [timestampInput, setTimestampInput] = useState('1704067200');
  const [dateInput, setDateInput] = useState('2024-01-01 00:00:00');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const statusRequestIdRef = useRef(0);

  function nextStatusRequestId(): number {
    const requestId = statusRequestIdRef.current + 1;
    statusRequestIdRef.current = requestId;

    return requestId;
  }

  function setLatestStatus(requestId: number, nextStatus: string): void {
    if (isLatestStatusRequest(requestId, statusRequestIdRef.current)) {
      setStatus(nextStatus);
    }
  }

  async function runTimestampToDate(): Promise<void> {
    const conversion = timestampToDate(timestampInput);

    if (!conversion.ok) {
      setError(conversion.error);
      nextStatusRequestId();
      setStatus('');
      return;
    }

    const statusRequestId = nextStatusRequestId();
    const nextState = buildTimestampToDateState(conversion);
    setDateInput(nextState.dateText);
    setResult(nextState.result);
    setError('');
    const recentRunStatus = await saveRecentRun(
      {
        toolId: 'timestamp',
        operation: 'timestamp-to-date',
        summary: '时间戳转日期',
        preview: nextState.result.slice(0, 120),
      },
      window.easytools.addRecentRun,
    );
    setLatestStatus(statusRequestId, recentRunStatus);
    if (!recentRunStatus) {
      onRecentRunAdded();
    }
  }

  async function runDateToTimestamp(): Promise<void> {
    const conversion = dateToTimestamp(dateInput);

    if (!conversion.ok) {
      setError(conversion.error);
      nextStatusRequestId();
      setStatus('');
      return;
    }

    const statusRequestId = nextStatusRequestId();
    const nextState = buildDateToTimestampState(conversion);
    setTimestampInput(nextState.timestamp);
    setResult(nextState.result);
    setError('');
    const recentRunStatus = await saveRecentRun(
      {
        toolId: 'timestamp',
        operation: 'date-to-timestamp',
        summary: '日期转时间戳',
        preview: nextState.result.slice(0, 120),
      },
      window.easytools.addRecentRun,
    );
    setLatestStatus(statusRequestId, recentRunStatus);
    if (!recentRunStatus) {
      onRecentRunAdded();
    }
  }

  async function copyResult(): Promise<void> {
    const statusRequestId = nextStatusRequestId();
    const copyStatus = await copyTextToClipboard(result, navigator.clipboard.writeText.bind(navigator.clipboard));
    setLatestStatus(statusRequestId, copyStatus);
  }

  return (
    <ToolChrome title="时间戳转换" description="在 Unix 时间戳和本地日期时间之间转换。">
      <div className="timestamp-grid">
        <label className="field-block compact-field">
          <span>时间戳</span>
          <input
            value={timestampInput}
            onChange={(event) => {
              setTimestampInput(event.target.value);
            }}
            placeholder="10 位秒或 13 位毫秒"
          />
        </label>
        <label className="field-block compact-field">
          <span>日期时间</span>
          <input
            value={dateInput}
            onChange={(event) => {
              setDateInput(event.target.value);
            }}
            placeholder="YYYY-MM-DD HH:mm:ss"
          />
        </label>
      </div>
      <div className="toolbar">
        <button type="button" onClick={() => void runTimestampToDate()}>
          转日期
        </button>
        <button type="button" onClick={() => void runDateToTimestamp()}>
          转时间戳
        </button>
        <button type="button" className="secondary" onClick={() => void copyResult()} disabled={!result}>
          复制结果
        </button>
      </div>
      {error ? <div className="error-banner" role="alert">{error}</div> : null}
      {status ? (
        <div className="status-message" role="status" aria-live="polite">
          {status}
        </div>
      ) : null}
      <label className="field-block">
        <span>结果</span>
        <textarea
          className="result-area"
          value={result}
          readOnly
          placeholder="运行后显示转换结果"
          spellCheck={false}
        />
      </label>
    </ToolChrome>
  );
}
