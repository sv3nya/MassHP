import type { ReactNode } from 'react'
import { t } from '../i18n'
import { AppHeader } from './AppHeader'
import { HeatlineBar } from './HeatlineBar'
import { Icon } from './Icon'
import { ProgressBar } from './ProgressBar'

type StepLayoutProps = {
  step: number
  totalSteps: number
  title: string
  description?: string
  children: ReactNode
  /** Disable the Next button (e.g. a required answer is missing). */
  nextDisabled?: boolean
  /** i18n key for the Next button label (defaults to "Next"). */
  nextLabelKey?: string
  onBack?: () => void
  onNext?: () => void
  /** Tapping the header logo restarts the form. */
  onHome?: () => void
}

/**
 * Shared shell for every screening step: header, progress, a white content
 * card, the privacy note, Back/Next controls, and the Heatline bar. Keeps
 * all steps visually consistent and small. The Back button only renders
 * when an onBack handler is provided (i.e. not on step 1).
 */
export function StepLayout({
  step,
  totalSteps,
  title,
  description,
  children,
  nextDisabled = false,
  nextLabelKey = 'screening.next',
  onBack,
  onNext,
  onHome,
}: StepLayoutProps) {
  return (
    <div className="flex min-h-svh flex-col bg-surface font-sans text-muted">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pt-6">
        <AppHeader onHome={onHome} />

        <div className="mt-6">
          <ProgressBar current={step} total={totalSteps} />
        </div>

        <main className="mt-6">
          <section className="rounded-2xl border border-hairline bg-card p-6 shadow-sm">
            <h1 className="font-heading text-xl font-extrabold text-ink">
              {title}
            </h1>
            {description && (
              <p className="mt-3 text-lg leading-snug text-muted">
                {description}
              </p>
            )}
            {children}
          </section>
        </main>

        <div className="mt-auto pt-8">
          <p className="flex items-start gap-2 text-muted-2">
            <Icon
              name="shield"
              className="mt-0.5 h-5 w-5 shrink-0 text-success"
            />
            <span>{t('screening.privacyNote')}</span>
          </p>

          <div className="mt-4 flex gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center justify-center gap-2 rounded-xl border border-ink/30 px-6 py-4 text-lg font-semibold text-ink"
              >
                <Icon name="arrow-left" className="h-5 w-5" />
                {t('screening.back')}
              </button>
            )}
            <button
              type="button"
              disabled={nextDisabled}
              onClick={onNext}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-6 py-4 text-lg font-semibold text-card disabled:opacity-50"
            >
              {t(nextLabelKey)}
              <Icon name="arrow-right" className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 border-t border-hairline">
        <div className="mx-auto w-full max-w-md">
          <HeatlineBar />
        </div>
      </div>
    </div>
  )
}
