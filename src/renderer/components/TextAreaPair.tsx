import { Copy } from 'lucide-react';
import { useState, type ReactElement } from 'react';

import { useI18n } from '../i18n/I18nProvider';

interface TextAreaPairProps {
  inputLabel: string;
  outputLabel: string;
  inputValue: string;
  outputValue: string;
  onInputChange: (value: string) => void;
  inputPlaceholder?: string;
  outputPlaceholder?: string;
  outputReadOnly?: boolean;
  showCopyButton?: boolean;
}

export function TextAreaPair({
  inputLabel,
  outputLabel,
  inputValue,
  outputValue,
  onInputChange,
  inputPlaceholder,
  outputPlaceholder,
  outputReadOnly = true,
  showCopyButton = true,
}: TextAreaPairProps): ReactElement {
  const { t } = useI18n();
  const [, setCopySuccess] = useState(false);

  async function copyOutput(): Promise<void> {
    try {
      await navigator.clipboard.writeText(outputValue);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 1500);
    } catch {
      // Silently fail
    }
  }

  return (
    <div className="textarea-pair">
      <div className="field-block">
        <div className="field-header">
          <span className="field-title">{inputLabel}</span>
          <span className="field-meta">{inputValue.length} ch</span>
        </div>
        <textarea
          value={inputValue}
          onChange={(event) => {
            onInputChange(event.target.value);
          }}
          placeholder={inputPlaceholder}
          spellCheck={false}
        />
      </div>
      <div className="field-block">
        <div className="field-header">
          <span className="field-title">{outputLabel}</span>
          {showCopyButton && outputValue ? (
            <button
              type="button"
              className="field-copy-btn"
              onClick={() => void copyOutput()}
              title={t('common.copyToClipboard')}
              aria-label={t('common.copyToClipboard')}
            >
              <Copy size={16} />
            </button>
          ) : null}
        </div>
        <textarea
          value={outputValue}
          readOnly={outputReadOnly}
          placeholder={outputPlaceholder}
          spellCheck={false}
        />
      </div>
    </div>
  );
}
