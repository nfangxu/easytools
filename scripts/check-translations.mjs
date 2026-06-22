// Check that translations.ts is internally consistent.
//
// The file is the single source of truth for UI strings, with English as
// the canonical table and a `Record<keyof typeof en, string>` shape for
// Chinese. TypeScript enforces "every zh key exists in en" at compile time,
// but the symmetric "every zh key was *meant* to be in en" is purely a
// runtime check: if someone adds a new Chinese key without typing it into
// the English table, the value silently drifts to the `en[key]` fallback
// (see the Provider's `dict[key] ?? translations[DEFAULT_LANGUAGE][key]`).
//
// This script reads the source, parses the two `Record` objects, and
// fails the build if any key is unique to one side.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = readFileSync(join(root, 'src/renderer/i18n/translations.ts'), 'utf8');

const block = (label) => {
  // Find the declaration regardless of the type annotation form.
  // Examples we accept:
  //   const en = { ... };
  //   const zh: Record<keyof typeof en, string> = { ... };
  const declRe = new RegExp(`const\\s+${label}\\b[^=]*=\\s*`);
  const match = declRe.exec(source);
  if (!match) {
    throw new Error(`Could not find '${label}' translation table in translations.ts`);
  }
  const braceStart = source.indexOf('{', match.index + match[0].length - 1);
  if (braceStart === -1) {
    throw new Error(`'${label}' translation table is missing its opening brace`);
  }
  let depth = 0;
  for (let i = braceStart; i < source.length; i += 1) {
    const char = source[i];
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(braceStart + 1, i);
      }
    }
  }
  throw new Error(`'${label}' translation table is missing its closing brace`);
};

const extractKeys = (body) => {
  const keys = new Set();
  // Match 'key.name': or "key.name":  Hyphens are allowed so future key
  // names like 'common.copy-to-clipboard' still get caught.
  const re = /['"]([\w.-]+)['"]\s*:/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    keys.add(m[1]);
  }
  return keys;
};

const enKeys = extractKeys(block('en'));
const zhKeys = extractKeys(block('zh'));

// Compile-time check (satisfies) already covers zh ⊆ en; this script
// fails if en has a key zh doesn't, OR — and this is the part TypeScript
// cannot catch — if zh has a key that doesn't exist in en.
const onlyInEn = [...enKeys].filter((key) => !zhKeys.has(key)).sort();
const onlyInZh = [...zhKeys].filter((key) => !enKeys.has(key)).sort();

const problems = [];
if (onlyInEn.length > 0) {
  problems.push(`Chinese translation is missing keys: ${onlyInEn.join(', ')}`);
}
if (onlyInZh.length > 0) {
  problems.push(`Chinese translation has extra keys not present in English: ${onlyInZh.join(', ')}`);
}

if (problems.length > 0) {
  for (const line of problems) {
    process.stderr.write(`✖ ${line}\n`);
  }
  process.exit(1);
}

process.stdout.write(`✓ translations.ts — ${enKeys.size} keys, both tables in sync\n`);
