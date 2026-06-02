import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';

import type { RecentRun } from '../../shared/types';
import { tools, type ToolDefinition } from '../tools/registry';

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

interface RecentRunsRailProps {
  recentRuns: RecentRun[];
  status: string;
}

type RecentRunsLoadResult = { ok: true } | { ok: false };
type RecentRunsReadResult = { ok: true; runs: RecentRun[] } | { ok: false };

const RECENT_RUNS_LOAD_FAILED_STATUS = '最近记录加载失败';

export async function readRecentRuns(listRecentRuns: () => Promise<RecentRun[]>): Promise<RecentRunsReadResult> {
  try {
    return { ok: true, runs: await listRecentRuns() };
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
  const [selectedToolId, setSelectedToolId] = useState<ToolDefinition['id']>('json');
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);
  const [recentRunsStatus, setRecentRunsStatus] = useState('');
  const recentRunsRequestIdRef = useRef(0);
  const groupedTools = useMemo(() => groupToolsByCategory(tools), []);
  const selectedTool = tools.find((tool) => tool.id === selectedToolId) ?? tools[0];
  const SelectedToolComponent = selectedTool.component;

  const loadRecentRuns = useCallback(async () => {
    const requestId = recentRunsRequestIdRef.current + 1;
    recentRunsRequestIdRef.current = requestId;
    const result = await readRecentRuns(window.easytools.listRecentRuns);
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
    void loadRecentRuns();
  }, [loadRecentRuns]);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand">EasyTools</div>
          <p>本地桌面工具箱</p>
        </div>
        <nav className="tool-nav" aria-label="工具列表">
          {groupedTools.map(([category, categoryTools]) => (
            <section key={category} className="nav-group">
              <h2>{category}</h2>
              <div className="nav-items">
                {categoryTools.map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    className={tool.id === selectedToolId ? 'nav-item active' : 'nav-item'}
                    aria-pressed={tool.id === selectedToolId}
                    onClick={() => {
                      setSelectedToolId(tool.id);
                    }}
                  >
                    {tool.name}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </nav>
      </aside>
      <section className="workspace" aria-label={selectedTool.name}>
        <SelectedToolComponent onRecentRunAdded={() => void loadRecentRuns()} />
      </section>
      <RecentRunsRail recentRuns={recentRuns} status={recentRunsStatus} />
    </main>
  );
}
