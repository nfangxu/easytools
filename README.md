# EasyTools

EasyTools is a local Electron toolbox for everyday developer utilities.

## Features

- JSON formatting and compaction
- Base64 encoding and decoding
- Timestamp conversion
- LLM API key validation
- Recent run history stored locally
- Custom frameless desktop window

## Development

Install dependencies:

```bash
npm install
```

Start the Electron development app:

```bash
npm run dev
```

Run type checks:

```bash
npm run typecheck
```

Run tests:

```bash
npm test
```

Build the app:

```bash
npm run build
```

## Packaging

Package for the current platform:

```bash
npm run dist
```

Package Windows installers:

```bash
npm run dist:win
```

Package macOS DMG:

```bash
npm run dist:mac
```

Windows release builds produce an NSIS installer and a ZIP package. macOS release builds produce a DMG package.

## GitHub Releases

Pushing a version tag triggers the release workflow:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The workflow builds Windows and macOS packages and uploads them to the GitHub Release for that tag.

Code signing and macOS notarization are not configured, so operating systems may show security warnings when installing release packages.
