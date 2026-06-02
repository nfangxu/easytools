# EasyTools Electron Desktop App Design

## Goal

Build a local desktop toolbox for daily utilities, starting with JSON formatting, Base64 encode/decode, and timestamp conversion. The app should be easy to extend with new tools and should store local structured data with SQLite.

## Confirmed Technical Direction

- Runtime: Electron desktop app.
- Frontend: React, TypeScript, and Vite.
- Storage: SQLite for structured local data.
- Scope: first release includes three built-in tools, local settings, recent usage records, and an extensible tool registry.

## Architecture

The app uses a standard Electron split:

- Main process owns the application window, SQLite database lifecycle, and privileged filesystem/runtime access.
- Preload exposes a small, typed API surface to the renderer through `contextBridge`.
- Renderer process owns the React UI and tool interaction state.

The renderer must not directly use Node APIs. Data access goes through IPC methods exposed by preload. This keeps the desktop app safer and makes the UI easier to test independently.

## Tool Extension Model

Tools are registered through a central registry. Each tool module owns its UI and local transformation logic.

Each registered tool should provide:

- `id`: stable identifier, such as `json`, `base64`, or `timestamp`.
- `name`: display name.
- `category`: grouping label for navigation.
- `component`: React component for the tool panel.

The initial registry includes:

- JSON formatter: validate, format, compact, and copy output.
- Base64: encode, decode, swap input/output, and copy output.
- Timestamp converter: convert Unix seconds/milliseconds to local date-time and convert date-time back to timestamp.

New tools should be added by creating a focused tool module and registering it. The first release will not implement runtime plugin loading, plugin marketplace, or remote installation.

## Data Storage

SQLite stores local app data in the Electron user data directory.

Initial tables:

- `settings`: stores app and per-tool preferences as JSON values keyed by namespace.
- `recent_runs`: stores recent usage metadata for tools.

Recent runs should store concise summaries, tool ids, operation names, timestamps, and optional output previews. The app should not save large raw inputs by default, because daily utility inputs may contain private data and large content can grow the database quickly.

## User Interface

The first screen is the usable toolbox, not a landing page.

Layout:

- Left sidebar: tool navigation grouped by category.
- Main workspace: selected tool panel.
- Secondary region: recent runs or status information, placed as a right rail or lower section depending on available space.

Design direction:

- Quiet desktop utility style.
- Medium density with clear input/output areas.
- Prominent copy, clear, swap, and run controls where relevant.
- Responsive enough for smaller desktop windows.

## Error Handling

Tool errors should be shown near the relevant input/output area.

Examples:

- Invalid JSON shows a parse error without replacing the user's input.
- Invalid Base64 decode shows a decode error and preserves input.
- Ambiguous timestamp input reports the expected supported formats.
- SQLite initialization failures are surfaced in the app shell with a concise message.

## Testing And Verification

Initial verification should cover:

- JSON format, compact, and invalid input behavior.
- Base64 encode/decode behavior.
- Timestamp seconds/milliseconds conversion behavior.
- SQLite initialization and basic settings/recent-runs persistence.
- Type checking and production build.
- Dev server launch for manual UI review.

Browser or Electron preview should verify that:

- Sidebar navigation switches tools.
- Each tool accepts input and produces expected output.
- Copy and clear controls update UI state correctly.
- Recent-run records are created without saving large raw input by default.

## Explicitly Out Of Scope For First Release

- Cloud sync.
- User accounts.
- Plugin marketplace.
- Remote plugin loading.
- Complex settings center.
- Full text search across saved snippets.
- Packaging/signing installers for every OS.

## Open Decisions Resolved

- SQLite is preferred over plain file storage for the first release.
- React and TypeScript are used for maintainable UI and tool modules.
- The first version includes JSON, Base64, and timestamp tools only.
- Storage starts with settings and recent runs, not a larger personal knowledge base.
