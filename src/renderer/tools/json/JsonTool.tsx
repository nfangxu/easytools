import { useState, type ReactElement } from 'react';

import { TextAreaPair } from '../../components/TextAreaPair';
import { ToolChrome } from '../../components/ToolChrome';
import { copyTextToClipboard, saveRecentRun } from '../toolActions';
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

  async function run(operation: JsonOperation): Promise<void> {
    const result = operation === 'format' ? formatJson(input) : compactJson(input);

    if (!result.ok) {
      setError(result.error);
      setStatus('');
      return;
    }

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
    setStatus(recentRunStatus);
    if (!recentRunStatus) {
      onRecentRunAdded();
    }
  }

  function clear(): void {
    setInput('');
    setOutput('');
    setError('');
    setStatus('');
  }

  async function copyOutput(): Promise<void> {
    setStatus(await copyTextToClipboard(output, navigator.clipboard.writeText.bind(navigator.clipboard)));
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
      {error ? <div className="error-banner">{error}</div> : null}
      {status ? <div className="status-message">{status}</div> : null}
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
