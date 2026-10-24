import { t } from '../i18n'
import type { ChainStep, StepStatus } from '../rules/types'
import { Icon } from './Icon'

type StepCardProps = {
  step: ChainStep
  /** When true, render the next-step text as a "what to say" script. */
  asScript?: boolean
}

const STATUS_STYLE: Record<StepStatus, string> = {
  likely: 'bg-success-tint text-success',
  possible: 'bg-chip text-brand',
  ask_provider: 'bg-surface-warm text-muted-2',
  not_likely: 'bg-hairline text-muted-2',
}

/**
 * Renders a single ChainStep (a chain program, a protection, or an
 * above-cliff program) with its status, what opened it up, the next step /
 * script, an estimate range labeled "estimate", and the source + verified
 * date. All text comes from i18n keys the engine emitted; dollar figures are
 * always a labeled range (R3.2, R7.4).
 */
export function StepCard({ step, asScript = false }: StepCardProps) {
  return (
    <article className="rounded-2xl border border-hairline bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-heading text-lg font-bold text-ink">
          {t(`program.${step.programId}`)}
        </h3>
        <span
          className={[
            'shrink-0 rounded-full px-3 py-1 text-xs font-semibold',
            STATUS_STYLE[step.status],
          ].join(' ')}
        >
          {t(`result.status.${step.status}`)}
        </span>
      </div>

      {step.unlockedBy.length > 0 && (
        <p className="mt-2 text-sm text-muted-2">
          {t('result.unlockedByLabel')}:{' '}
          {step.unlockedBy.map((id) => t(`unlock.${id}`)).join(', ')}
        </p>
      )}

      {step.estimate && (
        <p className="mt-3 text-base font-semibold text-ink">
          {t('result.estimateRange', {
            low: step.estimate.low.toLocaleString('en-US'),
            high: step.estimate.high.toLocaleString('en-US'),
          })}{' '}
          <span className="text-sm font-normal text-muted-2">
            ({t('result.estimateLabel')})
          </span>
        </p>
      )}

      <div className="mt-3 flex items-start gap-2">
        <Icon
          name={asScript ? 'phone' : 'arrow-right'}
          className="mt-0.5 h-4 w-4 shrink-0 text-brand"
        />
        <p className="text-base leading-snug text-muted">
          <span className="font-semibold text-ink">
            {t('result.nextStepLabel')}:{' '}
          </span>
          {t(step.nextStepKey)}
        </p>
      </div>

      {step.sourceUrl && (
        <p className="mt-3 border-t border-hairline pt-3 text-xs text-muted-2">
          <a
            href={step.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-brand underline-offset-2 hover:underline"
          >
            {t('result.sourceLink')}
          </a>
          {step.verifiedAsOf && (
            <>
              {' · '}
              {t('result.verifiedAsOf', { date: step.verifiedAsOf })}
            </>
          )}
        </p>
      )}
    </article>
  )
}
