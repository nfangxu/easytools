import { useState, type ReactElement } from 'react';

import { ToolChrome } from '../../components/ToolChrome';
import { dateToTimestamp, timestampToDate } from './timestampUtils';

interface TimestampToolProps {
  onRecentRunAdded: () => void;
}

export function TimestampTool({ onRecentRunAdded }: TimestampToolProps): ReactElement {
  const [timestampInput, setTimestampInput] = useState('1704067200');
  const [dateInput, setDateInput] = useState('2024-01-01 00:00:00');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  async function runTimestampToDate(): Promise<void> {
    const conversion = timestampToDate(timestampInput);

    if (!conversion.ok) {
      setError(conversion.error);
      return;
    }

    setResult(conversion.value);
    setError('');
    await window.easytools.addRecentRun({
      toolId: 'timestamp',
      operation: 'timestamp-to-date',
      summary: '时间戳转日期',
      preview: conversion.value.slice(0, 120),
    });
    onRecentRunAdded();
  }

  async function runDateToTimestamp(): Promise<void> {
    const conversion = dateToTimestamp(dateInput);

    if (!conversion.ok) {
      setError(conversion.error);
      return;
    }

    const value = `${conversion.seconds}\n${conversion.milliseconds}`;
    setResult(value);
    setError('');
    await window.easytools.addRecentRun({
      toolId: 'timestamp',
      operation: 'date-to-timestamp',
      summary: '日期转时间戳',
      preview: value.slice(0, 120),
    });
    onRecentRunAdded();
  }

  async function copyResult(): Promise<void> {
    if (!result) {
      return;
    }

    await navigator.clipboard.writeText(result);
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
      {error ? <div className="error-banner">{error}</div> : null}
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
