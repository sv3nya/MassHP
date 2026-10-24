import type { ReactNode } from 'react'
import { t } from '../i18n'
import { AppHeader } from './AppHeader'
import { HeatlineBar } from './HeatlineBar'
import { Icon } from './Icon'

type ResultLayoutProps = {
  children: ReactNode
}

/**
 * Shared frame for every result screen (design.md § ResultLayout, R7.1/R7.2).
 * Renders the screener disclaimer and the Heatline footer by construction, so
 * any result content placed inside automatically satisfies the compliance
 * footer requirements.
 */
export function ResultLayout({ children }: ResultLayoutProps) {
  return (
    <div className="flex min-h-svh flex-col bg-surface font-sans text-muted">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pt-6">
        <AppHeader />

        <div className="mt-6">
          <h1 className="font-heading text-2xl font-extrabold text-ink">
            {t('result.title')}
          </h1>
          <p className="mt-2 text-base leading-snug text-muted">
            {t('result.subtitle')}
          </p>
        </div>

        {/* Screener disclaimer — present on every result screen (R7.2). */}
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-surface-warm p-3 text-sm text-muted-2">
          <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <span>{t('result.disclaimer')}</span>
        </p>

        <main className="mt-6 flex flex-col gap-6 pb-8">{children}</main>
      </div>

      <div className="border-t border-hairline">
        <div className="mx-auto w-full max-w-md">
          <HeatlineBar />
        </div>
      </div>
    </div>
  )
}
