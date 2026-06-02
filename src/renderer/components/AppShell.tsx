import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';

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

interface RecentRunsRailProps {
  recentRuns: RecentRun[];
}

function RecentRunsRail({ recentRuns }: RecentRunsRailProps): ReactElement {
  return (
    <aside className="recent-rail">
      <div className="rail-header">
        <h2>最近运行</h2>
      </div>
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
  const groupedTools = useMemo(() => groupToolsByCategory(tools), []);
  const selectedTool = tools.find((tool) => tool.id === selectedToolId) ?? tools[0];
  const SelectedToolComponent = selectedTool.component;

  const loadRecentRuns = useCallback(async () => {
    const runs = await window.easytools.listRecentRuns();
    setRecentRuns(runs);
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
      <RecentRunsRail recentRuns={recentRuns} />
    </main>
  );
}
