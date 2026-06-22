import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import {
  Bell,
  Settings,
  FileText,
  Clock,
  Hash,
  Shield,
  Code,
  ArrowRightLeft,
  Search,
  User,
  IdCard,
  Cpu,
} from 'lucide-react';

import type { RecentRun } from '../../shared/types';
import { useI18n } from '../i18n/I18nProvider';
import type { TranslationKey } from '../i18n/translations';
import { tools, type ToolDefinition } from '../tools/registry';
import { SettingsPage } from './SettingsPage';
import { TitleBar } from './TitleBar';
import { ToolErrorBoundary } from './ToolErrorBoundary';

type ToolId = ToolDefinition['id'];

export type AppRoute =
  | { page: 'home' }
  | { page: 'tool'; toolId: ToolId }
  | { page: 'settings' };

const TOOL_NAME_KEYS: Record<ToolId, TranslationKey> = {
  timestamp: 'tool.timestamp.name',
  base64: 'tool.base64.name',
  json: 'tool.json.name',
  jwt: 'tool.jwt.name',
  'llm-api': 'tool.llm.name',
  identity: 'tool.identity.name',
};

export function toolNameKey(toolId: ToolId): TranslationKey {
  return TOOL_NAME_KEYS[toolId];
}

function getToolIcon(toolId: string) {
  const iconMap: Record<string, ReactElement> = {
    timestamp: <Clock size={18} />,
    base64: <Code size={18} />,
    md5: <Hash size={18} />,
    url: <ArrowRightLeft size={18} />,
    jwt: <Shield size={18} />,
    json: <FileText size={18} />,
    'llm-api': <Cpu size={18} />,
    identity: <IdCard size={18} />,
  };
  return iconMap[toolId] || <Code size={18} />;
}

function formatRecentTime(value: string, language: 'en' | 'zh'): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isLatestRecentRunsRequest(requestId: number, latestRequestId: number): boolean {
  return requestId === latestRequestId;
}

export function getAppTitle(route: AppRoute, selectedToolName: string): string {
  if (route.page === 'tool') {
    return `EasyTools / ${selectedToolName}`;
  }
  return 'EasyTools';
}

export function getVisitedToolIds(visitedToolIds: ToolId[], route: AppRoute): ToolId[] {
  if (route.page !== 'tool' || visitedToolIds.includes(route.toolId)) {
    return visitedToolIds;
  }

  return [...visitedToolIds, route.toolId];
}

export function getToolPanelState(
  toolId: ToolId,
  route: AppRoute,
  visitedToolIds: ToolId[],
): { shouldMount: boolean; isActive: boolean } {
  const isActive = route.page === 'tool' && route.toolId === toolId;

  return {
    shouldMount: isActive || visitedToolIds.includes(toolId),
    isActive,
  };
}

export function getToolPanelClassName(isActive: boolean): string {
  return isActive
    ? 'tool-panel-slot tool-panel-slot-active'
    : 'tool-panel-slot tool-panel-slot-inactive';
}

interface RecentRunsRailProps {
  recentRuns: RecentRun[];
  /**
   * The status banner — empty string for "no banner", or a translation key
   * such as `'recent.loadFailed'`. The rail translates at render time.
   */
  statusKey: '' | TranslationKey;
}

type RecentRunsLoadResult = { ok: true } | { ok: false };
type RecentRunsReadResult = { ok: true; runs: RecentRun[] } | { ok: false };

export async function readRecentRuns(
  listRecentRuns: ((toolId: string) => Promise<RecentRun[]>) | undefined,
  toolId: ToolId,
): Promise<RecentRunsReadResult> {
  if (!listRecentRuns) {
    return { ok: false };
  }

  try {
    return { ok: true, runs: await listRecentRuns(toolId) };
  } catch {
    return { ok: false };
  }
}

export function getRecentRunsLoadState(
  requestId: number,
  latestRequestId: number,
  result: RecentRunsLoadResult,
): { shouldApply: boolean; statusKey: '' | TranslationKey } {
  const shouldApply = isLatestRecentRunsRequest(requestId, latestRequestId);

  if (!shouldApply) {
    return { shouldApply, statusKey: '' };
  }

  return {
    shouldApply,
    statusKey: result.ok ? '' : 'recent.loadFailed',
  };
}

function RecentRunsRail({ recentRuns, statusKey }: RecentRunsRailProps): ReactElement {
  const { t, language } = useI18n();

  return (
    <aside className="recent-rail">
      <div className="rail-header">
        <h2>{t('recent.title')}</h2>
      </div>
      {statusKey ? (
        <div className="rail-status" role="status" aria-live="polite">
          {t(statusKey)}
        </div>
      ) : null}
      {recentRuns.length === 0 ? (
        <p className="empty-state">{t('recent.empty')}</p>
      ) : (
        <ol className="recent-list">
          {recentRuns.map((run) => (
            <li key={run.id} className="recent-item">
              <div className="recent-topline">
                <strong>{run.summary}</strong>
                <time dateTime={run.createdAt}>{formatRecentTime(run.createdAt, language)}</time>
              </div>
              <div className="recent-operation">{run.operation}</div>
              {run.preview ? <p>{run.preview}</p> : null}
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}

export function AppShell(): ReactElement {
  const { t } = useI18n();
  const [route, setRoute] = useState<AppRoute>({ page: 'tool', toolId: 'base64' });
  const [visitedToolIds, setVisitedToolIds] = useState<ToolId[]>([]);
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);
  const [recentRunsStatusKey, setRecentRunsStatusKey] = useState<'' | TranslationKey>('');
  const [isRecentRunsOpen, setIsRecentRunsOpen] = useState(false);
  /**
   * Per-tool reset counter for the error boundary. Bumping the counter
   * forces React to remount the wrapped component tree (and therefore
   * clear any state that put the tool in a bad place in the first place).
   */
  const [toolResetCount, setToolResetCount] = useState<Record<ToolId, number>>({} as Record<ToolId, number>);
  const recentRunsRequestIdRef = useRef(0);
  const selectedTool =
    route.page === 'tool' ? tools.find((tool) => tool.id === route.toolId) ?? tools[0] : tools[0];
  const selectedToolName = t(toolNameKey(selectedTool.id));
  const appTitle = getAppTitle(route, selectedToolName);

  const loadRecentRuns = useCallback(async (toolId: ToolId) => {
    const requestId = recentRunsRequestIdRef.current + 1;
    recentRunsRequestIdRef.current = requestId;
    const result = await readRecentRuns(window.easytools?.listRecentRuns, toolId);
    const loadState = getRecentRunsLoadState(requestId, recentRunsRequestIdRef.current, result);

    if (!loadState.shouldApply) {
      return;
    }

    if (result.ok) {
      setRecentRuns(result.runs);
    }
    setRecentRunsStatusKey(loadState.statusKey);
  }, []);

  useEffect(() => {
    if (route.page === 'tool') {
      void loadRecentRuns(route.toolId);
    }
  }, [loadRecentRuns, route]);

  function openTool(toolId: ToolId): void {
    const nextRoute: AppRoute = { page: 'tool', toolId };
    setVisitedToolIds((current) => getVisitedToolIds(current, nextRoute));
    setIsRecentRunsOpen(false);
    setRoute(nextRoute);
  }

  function openSettings(): void {
    setIsRecentRunsOpen(false);
    setRoute({ page: 'settings' });
  }

  const isSettingsActive = route.page === 'settings';
  const topNavCurrent =
    route.page === 'settings'
      ? t('settings.name')
      : route.page === 'tool'
        ? selectedToolName
        : t('topnav.workbench');

  return (
    <div className="app-frame">
      <TitleBar title={appTitle} />
      <main className="app-shell" aria-label={appTitle}>
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="sidebar-logo">
              <div className="sidebar-logo-icon">
                <Code size={18} strokeWidth={2.4} />
              </div>
              <div className="sidebar-logo-text">
                <span className="sidebar-logo-name">EASYTOOLS</span>
                <span className="sidebar-logo-tag">{t('sidebar.tag')}</span>
              </div>
            </div>
          </div>
          <div className="sidebar-section-label">{t('sidebar.section.tools')}</div>
          <nav className="sidebar-nav">
            <div className="sidebar-nav-section">
              {tools.map((tool, index) => {
                const isActive = route.page === 'tool' && route.toolId === tool.id;
                return (
                  <button
                    key={tool.id}
                    type="button"
                    className={`sidebar-nav-item ${isActive ? 'sidebar-nav-item-active' : ''}`}
                    onClick={() => {
                      openTool(tool.id);
                    }}
                  >
                    <span className="sidebar-nav-index">{String(index + 1).padStart(2, '0')}</span>
                    <span className="sidebar-nav-icon">{getToolIcon(tool.id)}</span>
                    <span className="sidebar-nav-label">{t(toolNameKey(tool.id))}</span>
                  </button>
                );
              })}
            </div>
          </nav>
          <div className="sidebar-footer">
            <button
              type="button"
              className={`sidebar-footer-item ${isSettingsActive ? 'sidebar-footer-item-active' : ''}`}
              onClick={openSettings}
            >
              <Settings size={16} />
              <span>{t('sidebar.settings')}</span>
            </button>
            <button type="button" className="sidebar-footer-item">
              <FileText size={16} />
              <span>{t('sidebar.docs')}</span>
            </button>
          </div>
        </aside>
        <div className="main-content">
          <header className="top-nav">
            <div className="top-nav-stamp" aria-label={appTitle}>
              <span>EASYTOOLS</span>
              <span className="top-nav-stamp-divider" aria-hidden="true" />
              <span className="top-nav-stamp-current">{topNavCurrent}</span>
            </div>
            <div className="top-nav-actions">
              <div className="search-box">
                <Search size={14} className="search-icon" />
                <input type="text" placeholder={t('topnav.search')} className="search-input" />
                <kbd className="search-hint">⌘K</kbd>
              </div>
              <button type="button" className="top-nav-icon-btn" aria-label={t('topnav.notifications')}>
                <Bell size={16} />
              </button>
              <button type="button" className="top-nav-icon-btn" aria-label={t('topnav.account')}>
                <User size={16} />
              </button>
            </div>
          </header>
          <div className="tool-content">
            {route.page === 'settings' ? (
              <SettingsPage />
            ) : (
              tools.map((tool) => {
                const panelState = getToolPanelState(tool.id, route, visitedToolIds);

                if (!panelState.shouldMount) {
                  return null;
                }

                const ToolComponent = tool.component;
                const resetKey = toolResetCount[tool.id] ?? 0;

                return (
                  <div
                    key={tool.id}
                    className={getToolPanelClassName(panelState.isActive)}
                    hidden={!panelState.isActive}
                  >
                    <ToolErrorBoundary
                      key={`${tool.id}-${resetKey}`}
                      toolName={t(toolNameKey(tool.id))}
                      onReset={() => {
                        setToolResetCount((current) => ({
                          ...current,
                          [tool.id]: (current[tool.id] ?? 0) + 1,
                        }));
                      }}
                    >
                      <ToolComponent onRecentRunAdded={() => void loadRecentRuns(tool.id)} />
                    </ToolErrorBoundary>
                  </div>
                );
              })
            )}
          </div>
          {shouldShowRecentRuns(route, isRecentRunsOpen) ? (
            <>
              <button
                type="button"
                className="recent-popover-backdrop"
                aria-label={t('recent.title')}
                onClick={() => {
                  setIsRecentRunsOpen(false);
                }}
              />
              <div className="recent-popover">
                <RecentRunsRail recentRuns={recentRuns} statusKey={recentRunsStatusKey} />
              </div>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}

export function shouldShowRecentRuns(route: AppRoute, isRecentRunsOpen: boolean): boolean {
  return route.page === 'tool' && isRecentRunsOpen;
}
