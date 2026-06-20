/**
 * The two languages EasyTools ships with.
 *
 * Stored in the settings DB under the namespace
 * `preferences.language` and applied to <html lang="…"> at runtime.
 */
export type Language = 'en' | 'zh';

export const SUPPORTED_LANGUAGES: readonly Language[] = ['en', 'zh'] as const;
export const DEFAULT_LANGUAGE: Language = 'en';
export const LANGUAGE_SETTING_NAMESPACE = 'preferences.language';

export function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'zh';
}

/**
 * The HTML `lang` attribute that pairs with each app language. Browsers and
 * screen readers use this for font selection and pronunciation; we keep it
 * specific (`zh-CN`) for Chinese while exposing a coarse `'zh'` to our own
 * code so the rest of the app does not have to think about regions.
 */
export function htmlLangFor(language: Language): string {
  return language === 'zh' ? 'zh-CN' : 'en';
}
