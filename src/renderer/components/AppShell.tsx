import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';

import type { RecentRun } from '../../shared/types';
import { tools, type ToolDefinition } from '../tools/registry';
import { TitleBar } from './TitleBar';

type ToolId = ToolDefinition['id'];

export type AppRoute = { page: 'home' } | { page: 'tool'; toolId: ToolId };

function groupToolsByCategory(toolList: ToolDefinition[]): Array<[ToolDefinition['category'], ToolDefinition[]]> {
  const groups: Array<[ToolDefinition['category'], ToolDefinition[]]> = [];

  for (const tool of toolList) {
    const currentGroup = groups.find(([category]) => category === tool.category);

    if (currentGroup) {
      currentGroup[1].push(tool);
    } else {
      groups.push([tool.category, [tool]]);
    }
  }

  return groups;
}

function formatRecentTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('zh-CN', {
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
  return route.page === 'tool' ? `EasyTools / ${selectedToolName}` : 'EasyTools';
}

export function getVisitedToolIds(visitedToolIds: ToolId[], route: AppRoute): ToolId[] {
  if (route.page === 'home' || visitedToolIds.includes(route.toolId)) {
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

export function getPageTransitionClassName(route: AppRoute): string {
  return route.page === 'home'
    ? 'page-transition page-transition-home'
    : 'page-transition page-transition-tool';
}

export function getToolPanelClassName(isActive: boolean): string {
  return isActive
    ? 'tool-panel-slot tool-panel-slot-active'
    : 'tool-panel-slot tool-panel-slot-inactive';
}

export function shouldShowRecentRuns(route: AppRoute, isRecentRunsOpen: boolean): boolean {
  return route.page === 'tool' && isRecentRunsOpen;
}

export function getRecentRunsOpenStateAfterOutsideClick(
  route: AppRoute,
  isRecentRunsOpen: boolean,
): boolean {
  if (!shouldShowRecentRuns(route, isRecentRunsOpen)) {
    return false;
  }

  return false;
}

interface RecentRunsRailProps {
  recentRuns: RecentRun[];
  status: string;
}

type RecentRunsLoadResult = { ok: true } | { ok: false };
type RecentRunsReadResult = { ok: true; runs: RecentRun[] } | { ok: false };

const RECENT_RUNS_LOAD_FAILED_STATUS = '最近记录加载失败';

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
): { shouldApply: boolean; status: string } {
  const shouldApply = isLatestRecentRunsRequest(requestId, latestRequestId);

  if (!shouldApply) {
    return { shouldApply, status: '' };
  }

  return {
    shouldApply,
    status: result.ok ? '' : RECENT_RUNS_LOAD_FAILED_STATUS,
  };
}

function RecentRunsRail({ recentRuns, status }: RecentRunsRailProps): ReactElement {
  return (
    <aside className="recent-rail">
      <div className="rail-header">
        <h2>最近运行</h2>
      </div>
      {status ? (
        <div className="rail-status" role="status" aria-live="polite">
          {status}
        </div>
      ) : null}
      {recentRuns.length === 0 ? (
        <p className="empty-state">暂无记录</p>
      ) : (
        <ol className="recent-list">
          {recentRuns.map((run) => (
            <li key={run.id} className="recent-item">
              <div className="recent-topline">
                <strong>{run.summary}</strong>
                <time dateTime={run.createdAt}>{formatRecentTime(run.createdAt)}</time>
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
  const [route, setRoute] = useState<AppRoute>({ page: 'home' });
  const [visitedToolIds, setVisitedToolIds] = useState<ToolId[]>([]);
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);
  const [recentRunsStatus, setRecentRunsStatus] = useState('');
  const [isRecentRunsOpen, setIsRecentRunsOpen] = useState(false);
  const recentRunsRequestIdRef = useRef(0);
  const groupedTools = useMemo(() => groupToolsByCategory(tools), []);
  const selectedTool = route.page === 'tool'
    ? tools.find((tool) => tool.id === route.toolId) ?? tools[0]
    : tools[0];
  const appTitle = getAppTitle(route, selectedTool.name);

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
    setRecentRunsStatus(loadState.status);
  }, []);

  useEffect(() => {
    if (route.page === 'tool') {
      void loadRecentRuns(route.toolId);
    }
  }, [loadRecentRuns, route]);

  function openTool(toolId: ToolId): void {
    const nextRoute: AppRoute = { page: 'tool', toolId };
    setVisitedToolIds((current) => getVisitedToolIds(current, nextRoute));
    setRoute(nextRoute);
  }

  return (
    <div className="app-frame">
      <TitleBar title={appTitle} />
      <main className="app-shell" aria-label={appTitle}>
        {route.page === 'home' ? (
          <section className={`home-page ${getPageTransitionClassName(route)}`} aria-label="工具列表">
            <header className="home-hero">
              <p>EasyTools</p>
              <h1>选择一个本地工具</h1>
            </header>
            <div className="tool-catalog">
              {groupedTools.map(([category, categoryTools]) => (
                <section key={category} className="tool-category">
                  <h2>{category}</h2>
                  <div className="tool-card-grid">
                    {categoryTools.map((tool) => (
                      <button
                        key={tool.id}
                        type="button"
                        className="tool-card"
                        onClick={() => {
                          openTool(tool.id);
                        }}
                      >
                        <span>{tool.name}</span>
                        <small>{tool.category}</small>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>
        ) : (
          <section className={`tool-page ${getPageTransitionClassName(route)}`} aria-label={selectedTool.name}>
            <header className="tool-page-header">
              <div className="tool-page-title-group">
                <button
                  type="button"
                  className="secondary back-button"
                  onClick={() => {
                    setIsRecentRunsOpen(false);
                    setRoute({ page: 'home' });
                  }}
                >
                  返回工具列表
                </button>
                <div>
                  <p>EasyTools</p>
                  <h1>{selectedTool.name}</h1>
                </div>
              </div>
              <button
                type="button"
                className="secondary recent-runs-toggle"
                aria-expanded={isRecentRunsOpen}
                onClick={() => {
                  setIsRecentRunsOpen((current) => !current);
                }}
              >
                最近运行
              </button>
            </header>
            <div className="tool-page-content">
              <section className="workspace" aria-label={selectedTool.name}>
                {tools.map((tool) => {
                  const panelState = getToolPanelState(tool.id, route, visitedToolIds);

                  if (!panelState.shouldMount) {
                    return null;
                  }

                  const ToolComponent = tool.component;

                  return (
                    <div
                      key={tool.id}
                      className={getToolPanelClassName(panelState.isActive)}
                      hidden={!panelState.isActive}
                    >
                      <ToolComponent onRecentRunAdded={() => void loadRecentRuns(tool.id)} />
                    </div>
                  );
                })}
              </section>
              {shouldShowRecentRuns(route, isRecentRunsOpen) ? (
                <>
                  <button
                    type="button"
                    className="recent-popover-backdrop"
                    aria-label="关闭最近运行"
                    onClick={() => {
                      setIsRecentRunsOpen(getRecentRunsOpenStateAfterOutsideClick(route, isRecentRunsOpen));
                    }}
                  />
                  <div className="recent-popover">
                    <RecentRunsRail recentRuns={recentRuns} status={recentRunsStatus} />
                  </div>
                </>
              ) : null}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
