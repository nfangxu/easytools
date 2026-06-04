import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('tool page layout styles', () => {
  it('keeps the tool action toolbar fixed while tool content scrolls internally', () => {
    const styles = readFileSync(join(process.cwd(), 'src/renderer/styles.css'), 'utf8');

    expect(styles).toMatch(/body\s*{[^}]*overflow:\s*hidden/s);
    expect(styles).toMatch(/\.tool-page\s*{[^}]*height:\s*calc\(100vh - 38px\)/s);
    expect(styles).toMatch(/\.workspace\s*{[^}]*overflow:\s*auto/s);
    expect(styles).toMatch(/\.workspace\s*{[^}]*scrollbar-width:\s*none/s);
    expect(styles).toMatch(/\.workspace::-webkit-scrollbar\s*{[^}]*display:\s*none/s);
    expect(styles).toMatch(/\.toolbar\s*{[^}]*position:\s*sticky/s);
    expect(styles).toMatch(/\.toolbar\s*{[^}]*top:\s*0/s);
  });

  it('uses focused tool-page chrome with auxiliary panels hidden behind popovers', () => {
    const styles = readFileSync(join(process.cwd(), 'src/renderer/styles.css'), 'utf8');

    expect(styles).toMatch(/\.tool-page-header\s*{[^}]*min-height:\s*58px/s);
    expect(styles).toMatch(/\.tool-page-actions\s*{[^}]*display:\s*flex/s);
    expect(styles).toMatch(/\.tool-switcher-popover\s*{[^}]*position:\s*absolute/s);
    expect(styles).toMatch(/\.tool-switcher-list\s*{[^}]*grid-template-columns:\s*1fr/s);
    expect(styles).toMatch(/\.tool-switcher-item-active\s*{[^}]*background:\s*#1f2a30/s);
    expect(styles).toMatch(/\.tool-page-content\s*{[^}]*padding:\s*12px clamp\(18px, 4vw, 42px\) 24px/s);
  });

  it('animates page switches and recent-run popovers with reduced-motion support', () => {
    const styles = readFileSync(join(process.cwd(), 'src/renderer/styles.css'), 'utf8');

    expect(styles).toMatch(/@keyframes\s+page-enter/s);
    expect(styles).toMatch(/@keyframes\s+popover-enter/s);
    expect(styles).toMatch(/@keyframes\s+backdrop-enter/s);
    expect(styles).toMatch(/\.page-transition\s*{[^}]*animation:\s*page-enter/s);
    expect(styles).toMatch(/\.tool-panel-slot:not\(\[hidden\]\)\s*{[^}]*animation:\s*page-enter/s);
    expect(styles).toMatch(/\.recent-popover\s*{[^}]*animation:\s*popover-enter/s);
    expect(styles).toMatch(/\.tool-switcher-popover\s*{[^}]*animation:\s*popover-enter/s);
    expect(styles).toMatch(/\.recent-popover-backdrop\s*{[^}]*animation:\s*backdrop-enter/s);
    expect(styles).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/s);
  });
});
