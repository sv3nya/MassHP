import { t } from '../i18n'
import { Icon } from './Icon'

type AppHeaderProps = {
  /** Return to the start and begin a fresh form. */
  onHome?: () => void
}

/**
 * Top bar: Heat Path wordmark with home-chip logo, plus a language switcher.
 * Tapping the logo/name starts a new form. The switcher is presentational
 * for now (EN only); wiring additional locales is a later task.
 */
export function AppHeader({ onHome }: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between">
      <button
        type="button"
        onClick={onHome}
        aria-label={t('app.homeIconLabel')}
        className="flex items-center gap-3"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-chip text-brand">
          <Icon name="home" className="h-5 w-5" />
        </span>
        <span className="text-lg font-bold text-ink">{t('app.name')}</span>
      </button>

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
