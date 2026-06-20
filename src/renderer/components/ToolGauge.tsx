import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';

export type ToolGaugeLed = 'idle' | 'armed' | 'ok' | 'error';

export interface ToolGaugeSegment {
  /** Short uppercase label rendered as a stencil caption. */
  label: string;
  /** The mono-styled value, e.g. "248 B" or "0.42 ms". */
  value: string;
  /** Optional 0-1 ratio that fills a small horizontal meter. */
  meter?: number;
}

interface ToolGaugeProps {
  /**
   * The state lamp on the left + the stenciled state label.
   * Pass `state="idle"` when nothing has run yet.
   */
  state: ToolGaugeLed;
  /** Stenciled label next to the lamp, e.g. "ENCODE" / "PARSE" / "READY". */
  stateLabel: string;
  /** Right-aligned readouts. Use 1–4 segments for best fit. */
  segments: ToolGaugeSegment[];
  /**
   * Token that changes whenever a new operation is committed — used to
   * trigger the sweep animation. Usually a counter you bump on run().
   */
  pulseKey?: number | string;
  /** Optional right-side action slot (COPY / CLEAR / etc.). */
  actions?: ReactNode;
}

export function ToolGauge({
  state,
  stateLabel,
  segments,
  pulseKey,
  actions,
}: ToolGaugeProps): ReactElement {
  const [isSweeping, setIsSweeping] = useState(false);
  const previousPulseKey = useRef<typeof pulseKey>(pulseKey);

  useEffect(() => {
    if (pulseKey === undefined) {
      return;
    }
    if (previousPulseKey.current === pulseKey) {
      return;
    }
    previousPulseKey.current = pulseKey;
    setIsSweeping(true);
    const handle = window.setTimeout(() => setIsSweeping(false), 360);
    return () => window.clearTimeout(handle);
  }, [pulseKey]);

  const ledClassName = `tool-gauge-led tool-gauge-led-${state}`;
  const rootClassName = `tool-gauge${isSweeping ? ' tool-gauge-active' : ''}`;

  return (
    <div className={rootClassName} role="status" aria-live="polite">
      <div className="tool-gauge-state">
        <span className={ledClassName} aria-hidden="true" />
        <span className="tool-gauge-state-label">{stateLabel}</span>
      </div>
      <div className="tool-gauge-segments">
        {segments.map((segment, index) => (
          <div key={`${segment.label}-${index}`} className="tool-gauge-segment">
            <span className="tool-gauge-segment-label">{segment.label}</span>
            {segment.meter !== undefined ? (
              <span className="tool-gauge-segment-meter" aria-hidden="true">
                <span
                  className="tool-gauge-segment-meter-fill"
                  style={{ width: `${clamp01(segment.meter) * 100}%` }}
                />
              </span>
            ) : null}
            <span className="tool-gauge-segment-value">{segment.value}</span>
          </div>
        ))}
      </div>
      {actions ? <div className="tool-gauge-actions">{actions}</div> : null}
    </div>
  );
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}
