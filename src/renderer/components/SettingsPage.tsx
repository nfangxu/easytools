import { type ReactElement } from 'react';

import { useI18n } from '../i18n/I18nProvider';
import { SUPPORTED_LANGUAGES, type Language } from '../i18n/types';
import { ToolPlate } from './ToolPlate';

const LANGUAGE_LABEL_KEYS = {
  en: 'settings.language.en',
  zh: 'settings.language.zh',
} as const;

export function SettingsPage(): ReactElement {
  const { t, language, setLanguage } = useI18n();

  return (
    <div className="tool-panel">
      <ToolPlate
        seriesNumber="--"
        category="System"
        name={t('settings.name')}
        subtitle={t('settings.subtitle')}
        description={t('settings.description')}
      />
      <div className="tool-body">
        <section className="settings-section" aria-label={t('settings.section.language')}>
          <header className="settings-section-header">
            <span className="settings-section-title">{t('settings.section.language')}</span>
            <span className="settings-section-help">{t('settings.section.language.help')}</span>
          </header>
          <div className="settings-section-control">
            <div className="tool-plate-switch" role="radiogroup" aria-label={t('settings.section.language')}>
              {SUPPORTED_LANGUAGES.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={option === language}
                  className={option === language ? 'active' : ''}
                  onClick={() => setLanguage(option as Language)}
                >
                  {t(LANGUAGE_LABEL_KEYS[option])}
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
