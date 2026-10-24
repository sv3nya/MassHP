import { t } from '../i18n'
import { Icon } from './Icon'

/**
 * Top bar: Heat Path wordmark with home-chip logo, plus a language switcher.
 * The switcher is presentational for now (EN only); wiring additional
 * locales is a later task.
 */
export function AppHeader() {
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-chip text-brand"
          aria-label={t('app.homeIconLabel')}
        >
          <Icon name="home" className="h-5 w-5" />
        </span>
        <span className="text-lg font-bold text-ink">{t('app.name')}</span>
      </div>

      <button
        type="button"
        className="flex items-center gap-1.5 rounded-xl border border-hairline bg-card px-3 py-2 text-sm font-semibold text-ink"
        aria-label={t('language.switcherLabel')}
      >
        <Icon name="globe" className="h-4 w-4" />
        {t('language.current')}
        <Icon name="chevron-down" className="h-4 w-4" />
      </button>
    </header>
  )
}
