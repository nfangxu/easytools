import type { ReactElement } from 'react';

interface TextAreaPairProps {
  inputLabel: string;
  outputLabel: string;
  inputValue: string;
  outputValue: string;
  onInputChange: (value: string) => void;
  inputPlaceholder?: string;
  outputPlaceholder?: string;
  outputReadOnly?: boolean;
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
}: TextAreaPairProps): ReactElement {
  return (
    <div className="textarea-pair">
      <label className="field-block">
        <span>{inputLabel}</span>
        <textarea
          value={inputValue}
          onChange={(event) => {
            onInputChange(event.target.value);
          }}
          placeholder={inputPlaceholder}
          spellCheck={false}
        />
      </label>
      <label className="field-block">
        <span>{outputLabel}</span>
        <textarea
          value={outputValue}
          readOnly={outputReadOnly}
          placeholder={outputPlaceholder}
          spellCheck={false}
        />
      </label>
    </div>
  );
}
