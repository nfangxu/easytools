import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function readStyles(): string {
  return readFileSync(join(process.cwd(), 'src/renderer/styles.css'), 'utf8');
}

describe('Phosphor Instrument design tokens', () => {
  it('declares the graphite + screen + signal-green palette on :root', () => {
    const styles = readStyles();

    expect(styles).toMatch(/:root\s*{[^}]*--shell-base:\s*#1a1e22/s);
    expect(styles).toMatch(/:root\s*{[^}]*--shell-rise:\s*#22272d/s);
    expect(styles).toMatch(/:root\s*{[^}]*--shell-edge:\s*#363d45/s);
    expect(styles).toMatch(/:root\s*{[^}]*--screen:\s*#0d1012/s);
    expect(styles).toMatch(/:root\s*{[^}]*--screen-ink:\s*#d6deda/s);
    expect(styles).toMatch(/:root\s*{[^}]*--signal:\s*#00e676/s);
    expect(styles).toMatch(/body\s*{[^}]*background:\s*var\(--shell-base\)/s);
  });

  it('exposes the three named typefaces — Big Shoulders Stencil, IBM Plex Sans, IBM Plex Mono', () => {
    const styles = readStyles();

    expect(styles).toMatch(/--font-display:\s*"Big Shoulders Stencil Display"/);
    expect(styles).toMatch(/--font-body:\s*"IBM Plex Sans"/);
    expect(styles).toMatch(/--font-mono:\s*"IBM Plex Mono"/);
  });

  it('does not regress to the previous DevFlow tokens or JetBrains Mono pair', () => {
    const styles = readStyles();

    expect(styles).not.toMatch(/--surface:\s*#051424/);
    expect(styles).not.toMatch(/--secondary:\s*#4edea3/);
    expect(styles).not.toMatch(/JetBrains Mono/);
    expect(styles).not.toMatch(/Hanken Grotesk/);
  });
});

describe('Sidebar — graphite housing with signal-green active rail', () => {
  it('uses fixed width and the rising graphite tone', () => {
    const styles = readStyles();

    expect(styles).toMatch(/body\s*{[^}]*overflow:\s*hidden/s);
    expect(styles).toMatch(/\.sidebar\s*{[^}]*width:\s*var\(--sidebar-width\)/s);
    expect(styles).toMatch(/\.sidebar\s*{[^}]*background:\s*var\(--shell-rise\)/s);
  });

  it('marks the active nav item with an inset signal rail', () => {
    const styles = readStyles();

    expect(styles).toMatch(/\.sidebar-nav-item-active\s*{[^}]*box-shadow:\s*inset 3px 0 0 var\(--signal\)/s);
  });

  it('renders the brand name in the stencil display face', () => {
    const styles = readStyles();

    expect(styles).toMatch(/\.sidebar-logo-name\s*{[^}]*font-family:\s*var\(--font-display\)/s);
    expect(styles).toMatch(/\.sidebar-logo-icon\s*{[^}]*background:\s*var\(--signal\)/s);
  });
});

describe('Top nav — quiet stamp + search', () => {
  it('uses the configured top-nav height and a hairline divider', () => {
    const styles = readStyles();

    expect(styles).toMatch(/\.top-nav\s*{[^}]*height:\s*var\(--top-nav-height\)/s);
    expect(styles).toMatch(/\.top-nav\s*{[^}]*border-bottom:\s*1px solid var\(--shell-edge-soft\)/s);
  });

  it('renders the small two-part stamp instead of a breadcrumb', () => {
    const styles = readStyles();

    expect(styles).toMatch(/\.top-nav-stamp\s*{[^}]*font-family:\s*var\(--font-mono\)/s);
    expect(styles).toMatch(/\.top-nav-stamp-current\s*{[^}]*color:\s*var\(--on-shell\)/s);
    expect(styles).not.toMatch(/\.top-nav-breadcrumb\s*{/);
  });

  it('keeps the search input on the rising graphite tone', () => {
    const styles = readStyles();

    expect(styles).toMatch(/\.search-box\s*{[^}]*background:\s*var\(--shell-rise\)/s);
    expect(styles).toMatch(/\.search-box\s*{[^}]*border:\s*1px solid var\(--shell-edge-soft\)/s);
  });
});

describe('Tool surface — plate header & screen wells', () => {
  it('keeps the tool content scrollable with workbench padding', () => {
    const styles = readStyles();

    expect(styles).toMatch(/\.tool-content\s*{[^}]*flex:\s*1/s);
    expect(styles).toMatch(/\.tool-content\s*{[^}]*overflow-y:\s*auto/s);
    expect(styles).toMatch(/\.tool-content\s*{[^}]*background:\s*var\(--shell-base\)/s);
  });

  it('renders the Tool Plate as a stamped bezel with a stencil headline', () => {
    const styles = readStyles();

    expect(styles).toMatch(/\.tool-plate\s*{[^}]*display:\s*grid/s);
    expect(styles).toMatch(/\.tool-plate\s*{[^}]*background:\s*var\(--shell-rise\)/s);
    expect(styles).toMatch(/\.tool-plate-name\s*{[^}]*font-family:\s*var\(--font-display\)/s);
    expect(styles).toMatch(/\.tool-plate-meta-no\s*{[^}]*color:\s*var\(--signal\)/s);
  });

  it('paints active operation-switch chips in signal green', () => {
    const styles = readStyles();

    expect(styles).toMatch(/\.tool-plate-switch button\.active\s*{[^}]*background:\s*var\(--signal\)/s);
  });

  it('lays out the textarea pair on a 2-column screen-well grid', () => {
    const styles = readStyles();

    expect(styles).toMatch(/\.textarea-pair\s*{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) minmax\(0, 1fr\)/s);
    expect(styles).toMatch(/\.field-block\s*{[^}]*background:\s*var\(--screen\)/s);
    expect(styles).toMatch(/\.field-header\s*{[^}]*background:\s*var\(--shell-rise\)/s);
    expect(styles).toMatch(/\.field-title\s*{[^}]*font-family:\s*var\(--font-mono\)/s);
    expect(styles).toMatch(/\.field-title\s*{[^}]*text-transform:\s*uppercase/s);
  });

  it('paints textareas as sunken screens with phosphor ink', () => {
    const styles = readStyles();

    expect(styles).toMatch(/textarea[\s,a-z]*{[^}]*background:\s*var\(--screen\)/s);
    expect(styles).toMatch(/textarea[\s,a-z]*{[^}]*color:\s*var\(--screen-ink\)/s);
  });
});

describe('Tool Gauge — the signature instrument bar', () => {
  it('renders as a horizontal panel with the configured gauge height', () => {
    const styles = readStyles();

    expect(styles).toMatch(/\.tool-gauge\s*{[^}]*display:\s*flex/s);
    expect(styles).toMatch(/\.tool-gauge\s*{[^}]*height:\s*var\(--gauge-height\)/s);
    expect(styles).toMatch(/\.tool-gauge\s*{[^}]*font-family:\s*var\(--font-mono\)/s);
  });

  it('lights the armed lamp and meter fill in signal green', () => {
    const styles = readStyles();

    expect(styles).toMatch(/\.tool-gauge-led-armed\s*{[^}]*background:\s*var\(--signal\)/s);
    expect(styles).toMatch(/\.tool-gauge-segment-meter-fill\s*{[^}]*background:\s*var\(--signal\)/s);
  });

  it('runs a sweep across the gauge when an operation fires', () => {
    const styles = readStyles();

    expect(styles).toMatch(/@keyframes\s+gauge-sweep/s);
    expect(styles).toMatch(/\.tool-gauge-active::before\s*{[^}]*animation:\s*gauge-sweep/s);
  });

  it('replaces the old four-card status bar — no .tool-status-bar or .status-card rules remain', () => {
    const styles = readStyles();

    expect(styles).not.toMatch(/\.tool-status-bar\s*{/);
    expect(styles).not.toMatch(/\.status-card\s*{/);
    expect(styles).not.toMatch(/\.status-label\s*{/);
  });
});

describe('Animations & reduced-motion', () => {
  it('declares page, popover and backdrop enter animations', () => {
    const styles = readStyles();

    expect(styles).toMatch(/@keyframes\s+page-enter/s);
    expect(styles).toMatch(/@keyframes\s+popover-enter/s);
    expect(styles).toMatch(/@keyframes\s+backdrop-enter/s);
    expect(styles).toMatch(/\.tool-panel-slot:not\(\[hidden\]\)\s*{[^}]*animation:\s*page-enter/s);
    expect(styles).toMatch(/\.recent-popover\s*{[^}]*animation:\s*popover-enter/s);
    expect(styles).toMatch(/\.recent-popover-backdrop\s*{[^}]*animation:\s*backdrop-enter/s);
  });

  it('respects prefers-reduced-motion', () => {
    const styles = readStyles();

    expect(styles).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/s);
  });
});
