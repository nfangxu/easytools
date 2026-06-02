import type { ReactElement } from 'react';

export function App(): ReactElement {
  return (
    <main className="app">
      <aside className="sidebar">
        <div className="brand">EasyTools</div>
      </aside>
      <section className="workspace">
        <h1>EasyTools</h1>
        <p>选择左侧工具开始。</p>
      </section>
    </main>
  );
}
