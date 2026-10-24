import { t } from '../i18n'

type ProgressBarProps = {
  current: number
  total: number
}

/**
 * Step progress indicator for the screening flow. The label text comes from
 * i18n; the fill width is derived from current/total.
 */
export function ProgressBar({ current, total }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, (current / total) * 100))

  return (
    <div>
      <p className="text-base font-semibold text-ink">
        {t('screening.progress.label', { current, total })}
      </p>
      <div
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-track"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={t('screening.progress.label', { current, total })}
      >
        <div
          className="h-full rounded-full bg-brand transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
