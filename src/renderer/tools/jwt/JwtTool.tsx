import { useRef, useState, type ReactElement } from 'react';

import { ToolChrome } from '../../components/ToolChrome';
import { copyTextToClipboard, isLatestStatusRequest, saveRecentRun } from '../toolActions';
import {
  analyzeJwtTiming,
  parseJwt,
  verifyJwtHmacSignature,
  type JwtSignatureVerificationResult,
} from './jwtUtils';

interface JwtToolProps {
  onRecentRunAdded: () => void;
}

const SAMPLE_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJzdWIiOiIxMjMiLCJuYW1lIjoiRWFzeVRvb2xzIiwiZXhwIjoyMDAwMDAwMDAwfQ.' +
  '731XyRuCPYScsadTcJfwCNwcrRWXH77jFmxS4Uu9CNA';

export function JwtTool({ onRecentRunAdded }: JwtToolProps): ReactElement {
  const [token, setToken] = useState(SAMPLE_JWT);
  const [secret, setSecret] = useState('');
  const [headerJson, setHeaderJson] = useState('');
  const [payloadJson, setPayloadJson] = useState('');
  const [claims, setClaims] = useState<string[]>([]);
  const [signatureStatus, setSignatureStatus] = useState<JwtSignatureVerificationResult | null>(null);
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

  async function parseAndVerify(): Promise<void> {
    const parsed = parseJwt(token);

    if (!parsed.ok) {
      setError(parsed.error);
      setHeaderJson('');
      setPayloadJson('');
      setClaims([]);
      setSignatureStatus(null);
      nextStatusRequestId();
      setStatus('');
      return;
    }

    const verification = secret
      ? await verifyJwtHmacSignature(token, secret)
      : null;
    const timing = analyzeJwtTiming(parsed.value.payload);
    const statusRequestId = nextStatusRequestId();

    setHeaderJson(parsed.value.headerJson);
    setPayloadJson(parsed.value.payloadJson);
    setClaims(timing);
    setSignatureStatus(verification);
    setError('');

    const recentRunStatus = await saveRecentRun(
      {
        toolId: 'jwt',
        operation: secret ? 'parse-verify' : 'parse',
        summary: secret ? 'JWT 解析并校验签名' : 'JWT 解析',
        preview: `alg=${String(parsed.value.header.alg ?? '-')}, claims=${timing.join(' | ')}`,
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
    setError('');
    nextStatusRequestId();
    setStatus('');
  }

  async function copyPayload(): Promise<void> {
    const statusRequestId = nextStatusRequestId();
    const copyStatus = await copyTextToClipboard(payloadJson, navigator.clipboard.writeText.bind(navigator.clipboard));
    setLatestStatus(statusRequestId, copyStatus);
  }

  return (
    <ToolChrome title="JWT 校验解析" description="解析 JWT Header/Payload，并支持 HS256/HS384/HS512 密钥校验。">
      <div className="jwt-layout">
        <label className="field-block jwt-token-field">
          <span>JWT</span>
          <textarea
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="粘贴 JWT 字符串"
            spellCheck={false}
          />
        </label>
        <label className="field-block">
          <span>HMAC 密钥（可选）</span>
          <input
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            placeholder="仅用于 HS256/HS384/HS512"
          />
        </label>
      </div>
      <div className="toolbar">
        <button type="button" onClick={() => void parseAndVerify()}>
          解析
        </button>
        <button type="button" className="secondary" onClick={() => void copyPayload()} disabled={!payloadJson}>
          复制 Payload
        </button>
        <button type="button" className="secondary" onClick={clear}>
          清空
        </button>
      </div>
      {error ? <div className="error-banner" role="alert">{error}</div> : null}
      {status ? <div className="status-message" role="status" aria-live="polite">{status}</div> : null}
      {headerJson || payloadJson ? (
        <div className="jwt-output-grid">
          <JwtOutputPanel title="Header" value={headerJson} />
          <JwtOutputPanel title="Payload" value={payloadJson} />
          <section className="jwt-claims-panel">
            <h2>校验结果</h2>
            <ul>
              {claims.map((claim) => (
                <li key={claim}>{claim}</li>
              ))}
              {signatureStatus ? <li>{signatureStatus.message}</li> : <li>未输入密钥，未校验签名。</li>}
            </ul>
          </section>
        </div>
      ) : null}
    </ToolChrome>
  );
}

function JwtOutputPanel({ title, value }: { title: string; value: string }): ReactElement {
  return (
    <label className="field-block">
      <span>{title}</span>
      <textarea className="jwt-output" value={value} readOnly placeholder="解析后显示 JSON" />
    </label>
  );
}
