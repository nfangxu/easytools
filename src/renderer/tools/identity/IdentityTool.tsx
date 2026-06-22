import { Copy, RefreshCw, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';

import { ToolGauge, type ToolGaugeLed } from '../../components/ToolGauge';
import { ToolPlate } from '../../components/ToolPlate';
import { useI18n } from '../../i18n/I18nProvider';
import {
  copyTextToClipboard,
  isLatestStatusRequest,
  saveRecentRun,
  type ToolStatusCode,
} from '../toolActions';
import {
  DEFAULT_IDENTITY_PREFS,
  loadIdentityPrefs,
  saveIdentityPrefs,
  type IdentityPrefs,
} from './identityPrefs';
import {
  MAX_COUNT,
  MIN_COUNT,
  RECORD_TSV_HEADER,
  clampCount,
  formatRecordTsv,
  generateMany,
  type Gender,
  type IdentityFilters,
  type IdentityRecord,
} from './identityUtils';
import { PROVINCES } from './seedData';

interface IdentityToolProps {
  onRecentRunAdded: () => void;
}

type GenderFilter = 'random' | Gender;

const GENDER_OPTIONS: ReadonlyArray<{ value: GenderFilter; labelKey: string }> = [
  { value: 'random', labelKey: 'tool.identity.gender.random' },
  { value: 'male', labelKey: 'tool.identity.gender.male' },
  { value: 'female', labelKey: 'tool.identity.gender.female' },
];

const DEFAULT_COUNT = '10';

export function IdentityTool({ onRecentRunAdded }: IdentityToolProps): ReactElement {
  const { t } = useI18n();

  // Filter state ----------------------------------------------------------
  const [provinceId, setProvinceId] = useState('');
  const [cityId, setCityId] = useState('');
  const [countyId, setCountyId] = useState('');
  const [birthFrom, setBirthFrom] = useState('');
  const [birthTo, setBirthTo] = useState('');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('random');
  const [countInput, setCountInput] = useState(DEFAULT_COUNT);
  const [prefsHydrated, setPrefsHydrated] = useState(false);

  // Hydrate persisted preferences on mount. The list of counties is
  // filtered by the loaded province/city ids, so a stale countyId from a
  // previous run gets dropped if its parent no longer exists.
  useEffect(() => {
    let cancelled = false;
    void loadIdentityPrefs(
      window.easytools?.getSetting as ((namespace: string) => Promise<unknown>) | undefined,
    ).then((prefs) => {
      if (cancelled) {
        return;
      }
      setProvinceId(prefs.provinceId);
      setCityId(prefs.cityId);
      setCountyId(prefs.countyId);
      setBirthFrom(prefs.birthFrom);
      setBirthTo(prefs.birthTo);
      setGenderFilter(prefs.gender);
      setCountInput(prefs.count);
      setPrefsHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced write-back: snapshot the current filter shape and persist
  // it after a brief pause so each keystroke in the count input doesn't
  // hit the DB.
  useEffect(() => {
    if (!prefsHydrated) {
      return;
    }
    const handle = window.setTimeout(() => {
      const prefs: IdentityPrefs = {
        provinceId,
        cityId,
        countyId,
        birthFrom,
        birthTo,
        gender: genderFilter,
        count: countInput,
      };
      void saveIdentityPrefs(
        window.easytools?.setSetting as
          | ((namespace: string, value: unknown) => Promise<void>)
          | undefined,
        prefs,
      );
    }, 250);
    return () => window.clearTimeout(handle);
  }, [
    prefsHydrated,
    provinceId,
    cityId,
    countyId,
    birthFrom,
    birthTo,
    genderFilter,
    countInput,
  ]);

  // Output state ----------------------------------------------------------
  const [records, setRecords] = useState<IdentityRecord[]>([]);
  const [error, setError] = useState('');
  const [statusKey, setStatusKey] = useState<ToolStatusCode>('');
  const [pulseKey, setPulseKey] = useState(0);
  const [ledState, setLedState] = useState<ToolGaugeLed>('idle');
  const statusRequestIdRef = useRef(0);

  // Cascade derivations ---------------------------------------------------
  const cities = useMemo(() => {
    if (!provinceId) {
      return [];
    }
    return PROVINCES.find((province) => province.id === provinceId)?.children ?? [];
  }, [provinceId]);

  const counties = useMemo(() => {
    if (!cityId) {
      return [];
    }
    return cities.find((city) => city.id === cityId)?.children ?? [];
  }, [cities, cityId]);

  function handleProvinceChange(value: string): void {
    setProvinceId(value);
    setCityId('');
    setCountyId('');
  }

  function handleCityChange(value: string): void {
    setCityId(value);
    setCountyId('');
  }

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

  async function handleGenerate(): Promise<void> {
    const parsedCount = Number.parseInt(countInput, 10);
    if (!Number.isFinite(parsedCount) || parsedCount < MIN_COUNT || parsedCount > MAX_COUNT) {
      setError(t('tool.identity.error.invalidCount', { min: MIN_COUNT, max: MAX_COUNT }));
      setLedState('error');
      setPulseKey((value) => value + 1);
      return;
    }

    const fromDate = birthFrom ? parseDateInput(birthFrom) : undefined;
    const toDate = birthTo ? parseDateInput(birthTo) : undefined;
    if (fromDate && toDate && fromDate.getTime() > toDate.getTime()) {
      setError(t('tool.identity.error.invalidRange'));
      setLedState('error');
      setPulseKey((value) => value + 1);
      return;
    }

    const filters: IdentityFilters = {
      provinceId: provinceId || undefined,
      cityId: cityId || undefined,
      countyId: countyId || undefined,
      birthFrom: fromDate,
      birthTo: toDate,
      gender: genderFilter === 'random' ? undefined : genderFilter,
    };
    const generated = generateMany({ count: clampCount(parsedCount), ...filters });

    setRecords(generated);
    setError('');
    setLedState('ok');
    setPulseKey((value) => value + 1);

    const summary = t('tool.identity.summary', { count: generated.length });
    const preview = generated
      .slice(0, 3)
      .map((record) => `${record.name} · ${record.idNumber} · ${record.mobileNumber}`)
      .join('\n');

    const requestId = nextStatusRequestId();
    const recentRunStatus = await saveRecentRun(
      {
        toolId: 'identity',
        operation: 'generate',
        summary,
        preview,
      },
      window.easytools?.addRecentRun,
    );
    setLatestStatus(requestId, recentRunStatus);
    if (!recentRunStatus) {
      onRecentRunAdded();
    }
  }

  async function handleCopyRow(record: IdentityRecord): Promise<void> {
    const requestId = nextStatusRequestId();
    const code = await copyTextToClipboard(
      record.idNumber,
      navigator.clipboard.writeText.bind(navigator.clipboard),
    );
    setLatestStatus(requestId, code);
  }

  async function handleCopyAll(): Promise<void> {
    if (records.length === 0) {
      return;
    }
    const tsv = [RECORD_TSV_HEADER, ...records.map(formatRecordTsv)].join('\n');
    const requestId = nextStatusRequestId();
    const code = await copyTextToClipboard(
      tsv,
      navigator.clipboard.writeText.bind(navigator.clipboard),
    );
    setLatestStatus(requestId, code);
  }

  async function handleCopyJson(): Promise<void> {
    if (records.length === 0) {
      return;
    }
    const json = JSON.stringify(records, null, 2);
    const requestId = nextStatusRequestId();
    const code = await copyTextToClipboard(
      json,
      navigator.clipboard.writeText.bind(navigator.clipboard),
    );
    setLatestStatus(requestId, code);
  }

  function handleClear(): void {
    setRecords([]);
    setError('');
    nextStatusRequestId();
    setStatusKey('');
    setLedState('idle');
  }

  const ageRange = useMemo(() => computeAgeRange(records), [records]);
  const stateLabel = ledState === 'idle' ? 'READY' : 'GENERATE';

  return (
    <div className="tool-panel">
      <ToolPlate
        seriesNumber="06"
        category="Data"
        name="IDENTITY"
        subtitle="GENERATOR"
        description={t('tool.identity.description')}
        operations={
          <button type="button" className="active" onClick={() => void handleGenerate()}>
            <Sparkles size={12} />
            {t('tool.identity.action.generate')}
          </button>
        }
      />
      <div className="tool-body">
        <section className="identity-config-panel" aria-label={t('tool.identity.section.region')}>
          <div className="identity-filter-row">
            <span className="identity-filter-label">{t('tool.identity.section.region')}</span>
            <div className="identity-filter-grid identity-filter-grid-region">
              <select
                value={provinceId}
                onChange={(event) => handleProvinceChange(event.target.value)}
                aria-label={t('tool.identity.region.province')}
              >
                <option value="">{`${t('tool.identity.region.province')} · ${t('tool.identity.region.any')}`}</option>
                {PROVINCES.map((province) => (
                  <option key={province.id} value={province.id}>
                    {province.name}
                  </option>
                ))}
              </select>
              <select
                value={cityId}
                onChange={(event) => handleCityChange(event.target.value)}
                disabled={cities.length === 0}
                aria-label={t('tool.identity.region.city')}
              >
                <option value="">{`${t('tool.identity.region.city')} · ${t('tool.identity.region.any')}`}</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
              <select
                value={countyId}
                onChange={(event) => setCountyId(event.target.value)}
                disabled={counties.length === 0}
                aria-label={t('tool.identity.region.county')}
              >
                <option value="">{`${t('tool.identity.region.county')} · ${t('tool.identity.region.any')}`}</option>
                {counties.map((county) => (
                  <option key={county.id} value={county.id}>
                    {county.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="identity-filter-row">
            <span className="identity-filter-label">{t('tool.identity.section.birth')}</span>
            <div className="identity-filter-grid identity-filter-grid-birth">
              <label className="identity-date-field">
                <span>{t('tool.identity.birth.from')}</span>
                <input
                  type="date"
                  value={birthFrom}
                  onChange={(event) => setBirthFrom(event.target.value)}
                />
              </label>
              <label className="identity-date-field">
                <span>{t('tool.identity.birth.to')}</span>
                <input
                  type="date"
                  value={birthTo}
                  onChange={(event) => setBirthTo(event.target.value)}
                />
              </label>
              <span className="identity-filter-help">{t('tool.identity.birth.help')}</span>
            </div>
          </div>

          <div className="identity-filter-row">
            <span className="identity-filter-label">{t('tool.identity.section.gender')}</span>
            <div className="tool-plate-switch identity-gender-switch" role="radiogroup">
              {GENDER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={option.value === genderFilter}
                  className={option.value === genderFilter ? 'active' : ''}
                  onClick={() => setGenderFilter(option.value)}
                >
                  {t(option.labelKey as Parameters<typeof t>[0])}
                </button>
              ))}
            </div>
          </div>

          <div className="identity-filter-row">
            <span className="identity-filter-label">{t('tool.identity.section.count')}</span>
            <div className="identity-filter-grid identity-filter-grid-count">
              <input
                type="number"
                min={MIN_COUNT}
                max={MAX_COUNT}
                value={countInput}
                onChange={(event) => setCountInput(event.target.value)}
                className="identity-count-input"
              />
              <span className="identity-filter-help">
                {`${MIN_COUNT} – ${MAX_COUNT}`}
              </span>
            </div>
          </div>
        </section>

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

        {records.length > 0 ? (
          <section className="llm-result-section identity-result-section" aria-label={t('tool.identity.column.id')}>
            <div className="llm-results">
              <table className="identity-table">
                <thead>
                  <tr>
                    <th className="identity-col-index">{t('tool.identity.column.index')}</th>
                    <th>{t('tool.identity.column.name')}</th>
                    <th className="identity-col-gender">{t('tool.identity.column.gender')}</th>
                    <th>{t('tool.identity.column.birth')}</th>
                    <th>{t('tool.identity.column.region')}</th>
                    <th>{t('tool.identity.column.id')}</th>
                    <th>{t('tool.identity.column.mobile')}</th>
                    <th className="identity-col-action" aria-label={t('tool.identity.action.copyRow')} />
                  </tr>
                </thead>
                <tbody>
                  {records.map((record, index) => (
                    <tr key={`${record.idNumber}-${index}`}>
                      <td className="identity-col-index">{String(index + 1).padStart(2, '0')}</td>
                      <td>{record.name}</td>
                      <td className="identity-col-gender">
                        {t(
                          (record.gender === 'male'
                            ? 'tool.identity.gender.male.short'
                            : 'tool.identity.gender.female.short') as Parameters<typeof t>[0],
                        )}
                      </td>
                      <td>{record.birthDate}</td>
                      <td>{`${record.region.provinceName} / ${record.region.countyName}`}</td>
                      <td className="identity-col-id">{record.idNumber}</td>
                      <td>{record.mobileNumber}</td>
                      <td className="identity-col-action">
                        <button
                          type="button"
                          className="field-copy-btn"
                          onClick={() => void handleCopyRow(record)}
                          title={t('tool.identity.action.copyRow')}
                          aria-label={t('tool.identity.action.copyRow')}
                        >
                          <Copy size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <p className="identity-empty">{t('tool.identity.empty')}</p>
        )}

        <ToolGauge
          state={ledState}
          stateLabel={stateLabel}
          pulseKey={pulseKey}
          segments={[
            { label: 'COUNT', value: records.length > 0 ? String(records.length) : '—' },
            {
              label: 'AGE',
              value: ageRange ? `${ageRange.min}–${ageRange.max}` : '—',
            },
          ]}
          actions={
            <>
              <button type="button" onClick={handleClear} disabled={records.length === 0 && !error}>
                <RefreshCw size={12} />
                {t('common.clear')}
              </button>
              <button
                type="button"
                onClick={() => void handleCopyJson()}
                disabled={records.length === 0}
              >
                {t('tool.identity.action.copyJson')}
              </button>
              <button
                type="button"
                className="active"
                onClick={() => void handleCopyAll()}
                disabled={records.length === 0}
              >
                <Copy size={12} />
                {t('tool.identity.action.copyAll')}
              </button>
            </>
          }
        />
      </div>
    </div>
  );
}

function parseDateInput(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return undefined;
  }
  const [, yyyy, mm, dd] = match;
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  date.setHours(0, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function computeAgeRange(records: IdentityRecord[]): { min: number; max: number } | null {
  if (records.length === 0) {
    return null;
  }
  const now = new Date();
  let min = Infinity;
  let max = -Infinity;
  for (const record of records) {
    const born = parseDateInput(record.birthDate);
    if (!born) {
      continue;
    }
    let age = now.getFullYear() - born.getFullYear();
    const monthDiff = now.getMonth() - born.getMonth();
    const dayDiff = now.getDate() - born.getDate();
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age -= 1;
    }
    if (age < min) min = age;
    if (age > max) max = age;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return null;
  }
  return { min: Math.max(0, min), max: Math.max(0, max) };
}
