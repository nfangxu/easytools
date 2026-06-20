import { Copy, RefreshCw, Shield } from 'lucide-react';
import { useRef, useState, type ReactElement } from 'react';

import { ToolGauge, type ToolGaugeLed } from '../../components/ToolGauge';
import { ToolPlate } from '../../components/ToolPlate';
import { useI18n } from '../../i18n/I18nProvider';
import type { Translator } from '../../i18n/I18nProvider';
import {
  copyTextToClipboard,
  isLatestStatusRequest,
  saveRecentRun,
  type ToolStatusCode,
} from '../toolActions';
import {
  analyzeJwtTiming,
  parseJwt,
  verifyJwtHmacSignature,
  type JwtMessage,
  type JwtSignatureVerificationResult,
} from './jwtUtils';

interface JwtToolProps {
  onRecentRunAdded: () => void;
}

const SAMPLE_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJzdWIiOiIxMjMiLCJuYW1lIjoiRWFzeVRvb2xzIiwiZXhwIjoyMDAwMDAwMDAwfQ.' +
  '731XyRuCPYScsadTcJfwCNwcrRWXH77jFmxS4Uu9CNA';

function formatMessage(t: Translator, message: JwtMessage): string {
  return t(message.key, message.vars);
}

export function JwtTool({ onRecentRunAdded }: JwtToolProps): ReactElement {
  const { t } = useI18n();
  const [token, setToken] = useState(SAMPLE_JWT);
  const [secret, setSecret] = useState('');
  const [headerJson, setHeaderJson] = useState('');
  const [payloadJson, setPayloadJson] = useState('');
  const [claims, setClaims] = useState<JwtMessage[]>([]);
  const [signatureStatus, setSignatureStatus] = useState<JwtSignatureVerificationResult | null>(null);
  const [error, setError] = useState('');
  const [statusKey, setStatusKey] = useState<ToolStatusCode>('');
  const [alg, setAlg] = useState<string>('—');
  const [pulseKey, setPulseKey] = useState(0);
  const [ledState, setLedState] = useState<ToolGaugeLed>('idle');
  const statusRequestIdRef = useRef(0);

  function nextStatusRequestId(): number {
    const requestId = statusRequestIdRef.current + 1;
    statusRequestIdRef.current = requestId;

    return requestId;
  }

  function setLatestStatus(requestId: number, code: ToolStatusCode): void {
    if (isLatestStatusRequest(requestId, statusRequestIdRef.current)) {
      setStatusKey(code);
    }
  }

  async function parseAndVerify(): Promise<void> {
    const parsed = parseJwt(token);

    if (!parsed.ok) {
      setError(formatMessage(t, parsed.message));
      setHeaderJson('');
      setPayloadJson('');
      setClaims([]);
      setSignatureStatus(null);
      setAlg('—');
      nextStatusRequestId();
      setStatusKey('');
      setLedState('error');
      setPulseKey((value) => value + 1);
      return;
    }

    const verification = secret ? await verifyJwtHmacSignature(token, secret) : null;
    const timing = analyzeJwtTiming(parsed.value.payload);
    const statusRequestId = nextStatusRequestId();

    setHeaderJson(parsed.value.headerJson);
    setPayloadJson(parsed.value.payloadJson);
    setClaims(timing);
    setSignatureStatus(verification);
    setAlg(String(parsed.value.header.alg ?? '—'));
    setError('');
    setLedState(verification && !verification.valid ? 'error' : 'ok');
    setPulseKey((value) => value + 1);

    const recentRunStatus = await saveRecentRun(
      {
        toolId: 'jwt',
        operation: secret ? 'parse-verify' : 'parse',
        summary: t(secret ? 'tool.jwt.summary.parseVerify' : 'tool.jwt.summary.parse'),
        preview: `alg=${String(parsed.value.header.alg ?? '-')}, claims=${timing.length}`,
      },
      window.easytools?.addRecentRun,
    );
    setLatestStatus(statusRequestId, recentRunStatus);
    if (!recentRunStatus) {
      onRecentRunAdded();
    }
  }

  function clear(): void {
    setToken('');
    setSecret('');
    setHeaderJson('');
    setPayloadJson('');
    setClaims([]);
    setSignatureStatus(null);
    setAlg('—');
    setError('');
    nextStatusRequestId();
    setStatusKey('');
    setLedState('idle');
  }

  async function copyPayload(): Promise<void> {
    const statusRequestId = nextStatusRequestId();
    const copyStatus = await copyTextToClipboard(
      payloadJson,
      navigator.clipboard.writeText.bind(navigator.clipboard),
    );
    setLatestStatus(statusRequestId, copyStatus);
  }

  const sigStateLabel = signatureStatus
    ? signatureStatus.valid
      ? t('tool.jwt.sigState.valid')
      : t('tool.jwt.sigState.invalid')
    : secret
      ? t('tool.jwt.sigState.pending')
      : t('tool.jwt.sigState.unverified');

  return (
    <div className="tool-panel">
      <ToolPlate
        seriesNumber="04"
        category="Text"
        name="JWT"
        subtitle="DEBUGGER"
        description={t('tool.jwt.description')}
        operations={
          <button type="button" className="active" onClick={() => void parseAndVerify()}>
            <Shield size={12} />
            {t('tool.jwt.action.parse')}
          </button>
        }
      />
      <div className="tool-body">
        <div className="jwt-layout">
          <label className="field-block jwt-token-field">
            <span>{t('tool.jwt.label.token')}</span>
            <textarea
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder={t('tool.jwt.placeholder.token')}
              spellCheck={false}
            />
          </label>
          <label className="field-block">
            <span>{t('tool.jwt.label.secret')}</span>
            <input
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              placeholder={t('tool.jwt.placeholder.secret')}
            />
          </label>
        </div>
        {error ? (
          <div className="error-banner" role="alert">
            {error}
          </div>
        ) : null}
        {statusKey ? (
          <div className="status-message" role="status" aria-live="polite">
            {t(statusKey)}
          </div>
        ) : null}
        {headerJson || payloadJson ? (
          <div className="jwt-output-grid">
            <JwtOutputPanel title={t('tool.jwt.label.header')} value={headerJson} placeholder={t('tool.jwt.placeholder.output')} />
            <JwtOutputPanel title={t('tool.jwt.label.payload')} value={payloadJson} placeholder={t('tool.jwt.placeholder.output')} />
            <section className="jwt-claims-panel">
              <h2>{t('tool.jwt.claims')}</h2>
              <ul>
                {claims.map((claim, index) => (
                  <li key={`${claim.key}-${index}`}>{formatMessage(t, claim)}</li>
                ))}
                {signatureStatus ? (
                  <li>{formatMessage(t, signatureStatus.message)}</li>
                ) : (
                  <li>{t('tool.jwt.noSecret')}</li>
                )}
              </ul>
            </section>
          </div>
        ) : null}
        <ToolGauge
          state={ledState}
          stateLabel="PARSE"
          pulseKey={pulseKey}
          segments={[
            { label: 'ALG', value: alg },
            { label: 'CLAIMS', value: String(claims.length) },
            { label: 'SIG', value: sigStateLabel },
          ]}
          actions={
            <>
              <button type="button" onClick={clear}>
                <RefreshCw size={12} />
                {t('common.clear')}
              </button>
              <button
                type="button"
                className="active"
                onClick={() => void copyPayload()}
                disabled={!payloadJson}
              >
                <Copy size={12} />
                {t('tool.jwt.action.copyPayload')}
              </button>
            </>
          }
        />
      </div>
    </div>
  );
}

function JwtOutputPanel({
  title,
  value,
  placeholder,
}: {
  title: string;
  value: string;
  placeholder: string;
}): ReactElement {
  return (
    <label className="field-block">
      <span>{title}</span>
      <textarea className="jwt-output" value={value} readOnly placeholder={placeholder} />
    </label>
  );
}
