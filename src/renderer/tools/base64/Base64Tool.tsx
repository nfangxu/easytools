import { useState, type ReactElement } from 'react';

import { TextAreaPair } from '../../components/TextAreaPair';
import { ToolChrome } from '../../components/ToolChrome';
import { decodeBase64, encodeBase64 } from './base64Utils';

interface Base64ToolProps {
  onRecentRunAdded: () => void;
}

type Base64Operation = 'encode' | 'decode';

export function Base64Tool({ onRecentRunAdded }: Base64ToolProps): ReactElement {
  const [input, setInput] = useState('EasyTools 中文');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  async function run(operation: Base64Operation): Promise<void> {
    const result = operation === 'encode' ? encodeBase64(input) : decodeBase64(input);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setOutput(result.value);
    setError('');
    await window.easytools.addRecentRun({
      toolId: 'base64',
      operation,
      summary: operation === 'encode' ? 'Base64 编码' : 'Base64 解码',
      preview: result.value.slice(0, 120),
    });
    onRecentRunAdded();
  }

  function swap(): void {
    setInput(output);
    setOutput(input);
    setError('');
  }

  async function copyOutput(): Promise<void> {
    if (!output) {
      return;
    }

    await navigator.clipboard.writeText(output);
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
      {error ? <div className="error-banner">{error}</div> : null}
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
