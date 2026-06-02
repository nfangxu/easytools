import { useRef, useState, type ReactElement } from 'react';

import { TextAreaPair } from '../../components/TextAreaPair';
import { ToolChrome } from '../../components/ToolChrome';
import { copyTextToClipboard, isLatestStatusRequest, saveRecentRun } from '../toolActions';
import { decodeBase64, encodeBase64 } from './base64Utils';

interface Base64ToolProps {
  onRecentRunAdded: () => void;
}

type Base64Operation = 'encode' | 'decode';

export function Base64Tool({ onRecentRunAdded }: Base64ToolProps): ReactElement {
  const [input, setInput] = useState('EasyTools 中文');
  const [output, setOutput] = useState('');
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

  async function run(operation: Base64Operation): Promise<void> {
    const result = operation === 'encode' ? encodeBase64(input) : decodeBase64(input);

    if (!result.ok) {
      setError(result.error);
      nextStatusRequestId();
      setStatus('');
      return;
    }

    const statusRequestId = nextStatusRequestId();
    setOutput(result.value);
    setError('');
    const recentRunStatus = await saveRecentRun(
      {
        toolId: 'base64',
        operation,
        summary: operation === 'encode' ? 'Base64 编码' : 'Base64 解码',
        preview: result.value.slice(0, 120),
      },
      window.easytools.addRecentRun,
    );
    setLatestStatus(statusRequestId, recentRunStatus);
    if (!recentRunStatus) {
      onRecentRunAdded();
    }
  }

  function swap(): void {
    setInput(output);
    setOutput(input);
    setError('');
    nextStatusRequestId();
    setStatus('');
  }

  async function copyOutput(): Promise<void> {
    const statusRequestId = nextStatusRequestId();
    const copyStatus = await copyTextToClipboard(output, navigator.clipboard.writeText.bind(navigator.clipboard));
    setLatestStatus(statusRequestId, copyStatus);
  }

  return (
    <ToolChrome title="Base64 加解密" description="对文本进行 Base64 编码或解码，支持中文内容。">
      <div className="toolbar">
        <button type="button" onClick={() => void run('encode')}>
          编码
        </button>
        <button type="button" onClick={() => void run('decode')}>
          解码
        </button>
        <button type="button" className="secondary" onClick={swap} disabled={!output}>
          交换
        </button>
        <button type="button" className="secondary" onClick={() => void copyOutput()} disabled={!output}>
          复制输出
        </button>
      </div>
      {error ? <div className="error-banner" role="alert">{error}</div> : null}
      {status ? (
        <div className="status-message" role="status" aria-live="polite">
          {status}
        </div>
      ) : null}
      <TextAreaPair
        inputLabel="输入"
        outputLabel="输出"
        inputValue={input}
        outputValue={output}
        onInputChange={setInput}
        inputPlaceholder="输入普通文本或 Base64"
        outputPlaceholder="运行后显示结果"
      />
    </ToolChrome>
  );
}
