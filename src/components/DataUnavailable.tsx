import { t } from '../i18n'
import { HeatlineBar } from './HeatlineBar'
import { Icon } from './Icon'

/**
 * Neutral "data unavailable" screen shown when policy data fails to load
 * (loadPolicies throws). A soft error (Requirement 2.8): it never blames the
 * user, stays compliant, and surfaces the Heatline so the user still has a way
 * forward. All copy comes from i18n (error.data_unavailable).
 */
export function DataUnavailable() {
  return (
    <div className="flex min-h-svh flex-col bg-surface font-sans text-muted">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6">
        <section className="rounded-2xl border border-hairline bg-card p-6 shadow-sm">
          <Icon name="shield" className="h-6 w-6 text-success" />
          <p className="mt-3 text-lg leading-snug text-ink">
            {t('error.data_unavailable')}
          </p>
        </section>
      </div>

      <div className="border-t border-hairline">
        <div className="mx-auto w-full max-w-md">
          <HeatlineBar />
        </div>
      </div>
    </div>
  )
}
