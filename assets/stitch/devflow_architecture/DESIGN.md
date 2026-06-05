---
name: DevFlow Architecture
colors:
  surface: '#051424'
  surface-dim: '#051424'
  surface-bright: '#2c3a4c'
  surface-container-lowest: '#010f1f'
  surface-container-low: '#0d1c2d'
  surface-container: '#122131'
  surface-container-high: '#1c2b3c'
  surface-container-highest: '#273647'
  on-surface: '#d4e4fa'
  on-surface-variant: '#c6c6cd'
  inverse-surface: '#d4e4fa'
  inverse-on-surface: '#233143'
  outline: '#909097'
  outline-variant: '#45464d'
  surface-tint: '#bec6e0'
  primary: '#bec6e0'
  on-primary: '#283044'
  primary-container: '#0f172a'
  on-primary-container: '#798098'
  inverse-primary: '#565e74'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#7bd0ff'
  on-tertiary: '#00354a'
  tertiary-container: '#001a27'
  on-tertiary-container: '#008abb'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#c4e7ff'
  tertiary-fixed-dim: '#7bd0ff'
  on-tertiary-fixed: '#001e2c'
  on-tertiary-fixed-variant: '#004c69'
  background: '#051424'
  on-background: '#d4e4fa'
  surface-variant: '#273647'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-sm:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  code-block:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  sidebar-width: 240px
  gutter: 16px
  padding-tight: 8px
  padding-standard: 16px
  container-gap: 24px
---

## Brand & Style
The design system is engineered for developers who value precision, speed, and deep focus. The brand personality is **utilitarian, sophisticated, and technically rigorous**. It avoids decorative fluff in favor of high information density and structural clarity.

The aesthetic follows a **Modern Corporate/Technical** style with a nod to **Minimalism**. It leverages a "Dark Mode First" philosophy to reduce eye strain during long sessions. The emotional response should be one of "calm control"—where the UI recedes into the background, allowing the user's code and data to take center stage.

## Colors
The palette is rooted in a deep slate "Midnight" ecosystem to provide a low-glare environment.

*   **Primary (Midnight Slate):** Used for main application backgrounds and persistent sidebar elements.
*   **Secondary (Terminal Green):** Reserved for success states, "Run" actions, and terminal-style outputs.
*   **Tertiary (Action Blue):** The primary interactive color for buttons, links, and focus states.
*   **Neutral (Cool Gray):** Used for borders, secondary text, and inactive iconography.

Functional layers are created using varying shades of slate (from `#0F172A` for backgrounds to `#1F2937` for elevated cards) to maintain a cohesive, monochromatic depth.

## Typography
This design system employs a dual-font strategy. **Hanken Grotesk** provides a sharp, contemporary sans-serif feel for all UI navigation, labels, and headings. **JetBrains Mono** is utilized for technical data, code blocks, and terminal inputs to ensure character distinction (e.g., `0` vs `O`).

Hierarchy is established through weight rather than dramatic size shifts to maintain density. All technical labels and metadata should use the `label-caps` style in the monospaced font to distinguish them from interactive UI elements.

## Layout & Spacing
The layout uses a **fixed-fluid hybrid model** optimized for desktop utility. 
*   **Sidebar:** A fixed 240px navigation bar on the left.
*   **Main Content:** A fluid area that expands to fill the remaining width, using a standard 24px margin.
*   **Grid:** A 12-column internal grid for card-based tools within the main area.

The spacing rhythm is based on a **4px baseline grid**. Tight spacing (`8px` or `12px`) is preferred for internal component layout to maximize visible information, while larger gaps (`24px`) are used to separate major functional modules.

## Elevation & Depth
Depth is communicated through **Tonal Layering** rather than traditional shadows.
*   **Level 0 (Base):** Deep Slate (`#0F172A`)—Main application shell.
*   **Level 1 (Surface):** Lighter Slate (`#1E293B`)—Cards, panels, and secondary sections.
*   **Level 2 (Interaction):** Subtle `1px` inner borders (ghost outlines) in a low-opacity white (`rgba(255,255,255,0.05)`) provide definition.

Shadows are used sparingly and only for floating elements (modals, dropdowns). When used, they are "Ambient Shadows": extremely diffused, large radius (24px), and 40% opacity of the background color to feel integrated rather than stuck on.

## Shapes
The shape language is **Soft (4px)**. This provides a professional, "tooled" feel that is more approachable than sharp 90-degree corners but avoids the "bubbly" look of consumer social apps. 

*   **Standard UI (Buttons, Inputs, Cards):** 4px radius.
*   **System Overlays (Modals):** 8px (Large) radius for distinct separation.
*   **Tags/Indicators:** 2px (Small) radius to maintain a technical, compact appearance.

## Components
*   **Buttons:** Primary buttons use a solid Action Blue fill with white text. Secondary buttons use a ghost style (1px border) with neutral text.
*   **Sidebar Navigation:** Active states use a "Terminal Green" left-border accent (2px width) and a subtle background highlight.
*   **Input Fields:** Darker than the surface color (`#0F172A`) with a 1px border. Focus state triggers a 1px Action Blue glow.
*   **Cards:** Use for tool grouping. No shadows; defined by a `1px` border in `#334155`. Headers within cards use `label-caps` typography.
*   **Code Blocks:** Always use a recessed background (`#020617`) with JetBrains Mono. Syntax highlighting should follow the "Nord" or "One Dark" color schemes for consistency.
*   **Tooltips:** Dark, high-contrast overlays with 0px roundedness for a "terminal-style" popover feel.