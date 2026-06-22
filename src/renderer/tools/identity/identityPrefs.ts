/**
 * Persisted preferences for the Identity generator. Lives in the same
 * settings DB the rest of the app uses (via the `preferences.*` namespace
 * convention); the tool hydrates from it on mount and debounces writes
 * back so a flurry of keystrokes does not thrash the DB.
 *
 * Results (the generated rows) are intentionally NOT persisted: the user
 * re-runs the generator to refresh the table, so restoring stale rows on
 * re-mount would be confusing.
 */

import type { Gender } from './identityUtils';

export const IDENTITY_PREFS_NAMESPACE = 'preferences.identity';

export interface IdentityPrefs {
  provinceId: string;
  cityId: string;
  countyId: string;
  birthFrom: string;
  birthTo: string;
  gender: 'random' | Gender;
  count: string;
}

export const DEFAULT_IDENTITY_PREFS: IdentityPrefs = {
  provinceId: '',
  cityId: '',
  countyId: '',
  birthFrom: '',
  birthTo: '',
  gender: 'random',
  count: '10',
};

/** Subset of `SettingValue` we accept on the wire; keep narrow on purpose. */
function isGenderFilter(value: unknown): value is IdentityPrefs['gender'] {
  return value === 'random' || value === 'male' || value === 'female';
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isValidShape(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Read a stored prefs blob and merge it over the defaults, dropping any
 * field that doesn't match the expected type. Returns the default object
 * on a missing API, an exception, or a malformed payload — the tool must
 * always have a usable prefs object to render its form.
 */
export function parseIdentityPrefs(
  value: unknown,
): IdentityPrefs {
  if (!isValidShape(value)) {
    return { ...DEFAULT_IDENTITY_PREFS };
  }

  return {
    provinceId: isNonEmptyString(value.provinceId) ? value.provinceId : '',
    cityId: isNonEmptyString(value.cityId) ? value.cityId : '',
    countyId: isNonEmptyString(value.countyId) ? value.countyId : '',
    birthFrom: isNonEmptyString(value.birthFrom) ? value.birthFrom : '',
    birthTo: isNonEmptyString(value.birthTo) ? value.birthTo : '',
    gender: isGenderFilter(value.gender) ? value.gender : 'random',
    count: isNonEmptyString(value.count) ? value.count : '10',
  };
}

/**
 * Strip out anything that is not a primitive string. Defensive — the
 * settings DB returns SettingValue (a recursive union), and we promised
 * the namespace a flat record of strings.
 */
export function serializeIdentityPrefs(prefs: IdentityPrefs): Record<string, string> {
  return {
    provinceId: prefs.provinceId,
    cityId: prefs.cityId,
    countyId: prefs.countyId,
    birthFrom: prefs.birthFrom,
    birthTo: prefs.birthTo,
    gender: prefs.gender,
    count: prefs.count,
  };
}

/**
 * Wrap a setSetting call so the failing-path is a silent no-op rather than
 * a thrown promise rejection. Mirrors the pattern used in I18nProvider —
 * the user's preferences are nice-to-have, not load-bearing.
 */
export async function loadIdentityPrefs(
  getSetting: ((namespace: string) => Promise<unknown>) | undefined,
): Promise<IdentityPrefs> {
  if (!getSetting) {
    return { ...DEFAULT_IDENTITY_PREFS };
  }
  try {
    const raw = await getSetting(IDENTITY_PREFS_NAMESPACE);
    return parseIdentityPrefs(raw);
  } catch {
    return { ...DEFAULT_IDENTITY_PREFS };
  }
}

export async function saveIdentityPrefs(
  setSetting: ((namespace: string, value: unknown) => Promise<void>) | undefined,
  prefs: IdentityPrefs,
): Promise<void> {
  if (!setSetting) {
    return;
  }
  try {
    await setSetting(IDENTITY_PREFS_NAMESPACE, serializeIdentityPrefs(prefs));
  } catch {
    // ignore — see loadIdentityPrefs for rationale.
  }
}
