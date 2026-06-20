import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

import {
  DEFAULT_LANGUAGE,
  LANGUAGE_SETTING_NAMESPACE,
  htmlLangFor,
  isLanguage,
  type Language,
} from './types';
import { interpolate, translations, type TranslationKey } from './translations';

export type Translator = (
  key: TranslationKey,
  vars?: Record<string, string | number>,
) => string;

interface I18nContextValue {
  language: Language;
  setLanguage: (next: Language) => void;
  t: Translator;
}

const I18nContext = createContext<I18nContextValue | null>(null);

interface I18nProviderProps {
  children: ReactNode;
  /**
   * Override the initial language synchronously — used by tests and any
   * caller that wants a deterministic value without going through the
   * settings DB.
   */
  initialLanguage?: Language;
}

export function I18nProvider({ children, initialLanguage }: I18nProviderProps): ReactElement {
  const [language, setLanguageState] = useState<Language>(initialLanguage ?? DEFAULT_LANGUAGE);

  // Hydrate from the settings DB on mount. We default to English while the
  // async load is in flight; the change in is a no-op if the user has never
  // touched the preference.
  useEffect(() => {
    if (initialLanguage) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const stored = await window.easytools?.getSetting(LANGUAGE_SETTING_NAMESPACE);
        if (!cancelled && isLanguage(stored)) {
          setLanguageState(stored);
        }
      } catch {
        // Settings DB unavailable in some test/headless contexts — keep default.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialLanguage]);

  // Mirror the active language onto <html lang="…"> so screen readers and
  // browser fallback fonts behave correctly.
  useEffect(() => {
    document.documentElement.lang = htmlLangFor(language);
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    void window.easytools?.setSetting(LANGUAGE_SETTING_NAMESPACE, next).catch(() => {
      // Ignore persistence errors — the in-memory state is already updated.
    });
  }, []);

  const t = useCallback<Translator>(
    (key, vars) => {
      const dict = translations[language];
      const template = dict[key] ?? translations[DEFAULT_LANGUAGE][key] ?? key;
      return interpolate(template, vars);
    },
    [language],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error('useI18n() must be used inside <I18nProvider>.');
  }
  return value;
}
