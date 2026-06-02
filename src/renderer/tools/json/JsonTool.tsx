import { useState, type ReactElement } from 'react';

import { TextAreaPair } from '../../components/TextAreaPair';
import { ToolChrome } from '../../components/ToolChrome';
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

  async function run(operation: JsonOperation): Promise<void> {
    const result = operation === 'format' ? formatJson(input) : compactJson(input);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setOutput(result.value);
    setError('');
    await window.easytools.addRecentRun({
      toolId: 'json',
      operation,
      summary: operation === 'format' ? 'JSON 格式化' : 'JSON 压缩',
      preview: result.value.slice(0, 120),
    });
    onRecentRunAdded();
  }

  function clear(): void {
    setInput('');
    setOutput('');
    setError('');
  }

  async function copyOutput(): Promise<void> {
    if (!output) {
      return;
    }

    await navigator.clipboard.writeText(output);
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
