import { t } from '../i18n'
import type { ChainStep } from '../rules/types'
import { StepCard } from './StepCard'

type UnlockMapProps = {
  steps: ChainStep[]
}

/**
 * Renders the program chain in dependency order (HEAP -> discount -> AMP ->
 * Mass Save). Each step is a StepCard; the engine guarantees the order.
 */
export function UnlockMap({ steps }: UnlockMapProps) {
  return (
    <section>
      <h2 className="font-heading text-xl font-extrabold text-ink">
        {t('result.chainHeading')}
      </h2>
      <p className="mt-1 text-sm text-muted-2">{t('result.chainIntro')}</p>
      {/* Connected chain: a vertical rail links the numbered steps in order. */}
      <ol className="relative mt-4 flex flex-col gap-4">
        <span
          className="absolute left-4 top-4 bottom-4 w-px bg-hairline"
          aria-hidden="true"
        />
        {steps.map((step, i) => (
          <li key={step.programId} className="relative flex gap-3">
            <span className="z-10 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-card">
              {i + 1}
            </span>
            <div className="flex-1">
              <StepCard step={step} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
