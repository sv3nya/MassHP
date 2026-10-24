import { t } from '../i18n'
import type { ChainStep } from '../rules/types'
import { StepCard } from './StepCard'

type ProtectionsProps = {
  protections: ChainStep[]
}

/**
 * Renders shutoff protections that may apply, each with its "what to say"
 * script (rendered via StepCard with asScript). Only shown when there is at
 * least one protection. No protection is ever "no action needed" — the engine
 * sets requiresAction on all of them, and the scripts tell the user to call.
 */
export function Protections({ protections }: ProtectionsProps) {
  if (protections.length === 0) return null

  return (
    <section>
      <h2 className="font-heading text-xl font-extrabold text-ink">
        {t('result.protectionsHeading')}
      </h2>
      <p className="mt-1 text-sm text-muted-2">
        {t('result.protectionsIntro')}
      </p>
      <div className="mt-4 flex flex-col gap-4">
        {protections.map((p) => (
          <StepCard key={p.programId} step={p} asScript />
        ))}
      </div>
    </section>
  )
}
