import { useRef, useState, type ReactElement } from 'react';

import { TextAreaPair } from '../../components/TextAreaPair';
import { ToolChrome } from '../../components/ToolChrome';
import { copyTextToClipboard, isLatestStatusRequest, saveRecentRun } from '../toolActions';
import { compactJson, formatJson } from './jsonUtils';

interface JsonToolProps {
  onRecentRunAdded: () => void;
}

type JsonOperation = 'format' | 'compact';

const SAMPLE_JSON = '{"name":"EasyTools","tools":["JSON","Base64","Timestamp"]}';

export function JsonTool({ onRecentRunAdded }: JsonToolProps): ReactElement {
  const [input, setInput] = useState(SAMPLE_JSON);
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

  async function run(operation: JsonOperation): Promise<void> {
    const result = operation === 'format' ? formatJson(input) : compactJson(input);

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
        toolId: 'json',
        operation,
        summary: operation === 'format' ? 'JSON 格式化' : 'JSON 压缩',
        preview: result.value.slice(0, 120),
      },
      window.easytools.addRecentRun,
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
    setStatus('');
  }

  async function copyOutput(): Promise<void> {
    const statusRequestId = nextStatusRequestId();
    const copyStatus = await copyTextToClipboard(output, navigator.clipboard.writeText.bind(navigator.clipboard));
    setLatestStatus(statusRequestId, copyStatus);
  }

  return (
    <ToolChrome title="JSON 格式化" description="格式化或压缩 JSON 文本，错误输入会保留在编辑区。">
      <div className="toolbar">
        <button type="button" onClick={() => void run('format')}>
          格式化
        </button>
        <button type="button" onClick={() => void run('compact')}>
          压缩
        </button>
        <button type="button" className="secondary" onClick={clear}>
          清空
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
        inputPlaceholder="粘贴 JSON 文本"
        outputPlaceholder="运行后显示结果"
      />
    </ToolChrome>
  );
}
