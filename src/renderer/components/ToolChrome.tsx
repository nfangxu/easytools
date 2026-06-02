import type { ReactElement, ReactNode } from 'react';

interface ToolChromeProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function ToolChrome({ title, description, children }: ToolChromeProps): ReactElement {
  return (
    <article className="tool-panel">
      <header className="tool-header">
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      <div className="tool-body">{children}</div>
    </article>
  );
}
