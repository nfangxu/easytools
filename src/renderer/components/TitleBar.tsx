import type { ReactElement } from 'react';
import logoUrl from '../../../assets/icons/pngs/easytools-256.png';

interface TitleBarProps {
  title: string;
}

export function TitleBar({ title }: TitleBarProps): ReactElement {
  return (
    <header className="title-bar">
      <div className="title-bar-brand">
        <img src={logoUrl} alt="" aria-hidden="true" />
        <div className="title-bar-title">{title}</div>
      </div>
      <div className="window-controls" aria-label="窗口控制">
        <button
          type="button"
          className="window-control"
          aria-label="最小化"
          onClick={() => void window.easytools?.window.minimize()}
        >
          —
        </button>
        <button
          type="button"
          className="window-control"
          aria-label="最大化或还原"
          onClick={() => void window.easytools?.window.toggleMaximize()}
        >
          □
        </button>
        <button
          type="button"
          className="window-control close"
          aria-label="关闭"
          onClick={() => void window.easytools?.window.close()}
        >
          ×
        </button>
      </div>
    </header>
  );
}
