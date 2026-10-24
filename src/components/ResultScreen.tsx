import { t } from '../i18n'
import type { ChainResult, Household, Policies } from '../rules/types'
import { BillCheckNotice } from './BillCheckNotice'
import { CliffChart } from './CliffChart'
import { Protections } from './Protections'
import { ResultLayout } from './ResultLayout'
import { StepCard } from './StepCard'
import { UnlockMap } from './UnlockMap'

type ResultScreenProps = {
  result: ChainResult
  household: Household
  policies: Policies
  onHome?: () => void
}

/**
 * The full result screen: the program chain, the cliff view, protections,
 * above-cliff programs, and the hedged bill-check notice — all inside the
 * compliance frame (disclaimer + Heatline) from ResultLayout.
 */
export function ResultScreen({
  result,
  household,
  policies,
  onHome,
}: ResultScreenProps) {
  return (
    <ResultLayout onHome={onHome}>
      <UnlockMap steps={result.steps} />

      <CliffChart household={household} policies={policies} />

      <BillCheckNotice flag={result.billCheckFlag} />

      <Protections protections={result.protections} />

      {result.aboveCliff.length > 0 && (
        <section>
          <h2 className="font-heading text-xl font-extrabold text-ink">
            {t('result.aboveCliffHeading')}
          </h2>
          <div className="mt-4 flex flex-col gap-4">
            {result.aboveCliff.map((p) => (
              <StepCard key={p.programId} step={p} />
            ))}
          </div>
        </section>
      )}
    </ResultLayout>
  )
}
