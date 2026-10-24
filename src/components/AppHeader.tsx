import { setLocale, t } from '../i18n'
import { useLocale } from '../i18n/useLocale'
import { Icon } from './Icon'

type AppHeaderProps = {
  /** Return to the start and begin a fresh form. */
  onHome?: () => void
}

/**
 * Top bar: Heat Path wordmark with home-chip logo, plus a working language
 * toggle (English ⇄ Spanish, English default). Tapping the logo/name starts a
 * new form. The toggle switches the in-memory locale only — no persistence —
 * and re-renders the current screen in place (Requirement 8.7, 8.8, 8.10).
 */
export function AppHeader({ onHome }: AppHeaderProps) {
  const locale = useLocale()
  const nextLocale = locale === 'en' ? 'es' : 'en'

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
        onClick={() => setLocale(nextLocale)}
        className="flex min-h-11 items-center gap-1.5 rounded-xl border border-hairline bg-card px-3 py-2 text-sm font-semibold text-ink"
        aria-label={t('language.switcherLabel')}
      >
        <Icon name="globe" className="h-4 w-4" />
        {t('language.current')}
        <Icon name="chevron-down" className="h-4 w-4" />
      </button>
    </header>
  )
}
