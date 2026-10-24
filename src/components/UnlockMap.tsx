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
      <div className="mt-4 flex flex-col gap-4">
        {steps.map((step) => (
          <StepCard key={step.programId} step={step} />
        ))}
      </div>
    </section>
  )
}
