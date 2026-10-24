import { useState } from 'react'
import { t } from '../i18n'
import { StepLayout } from './StepLayout'

type RateCodeStepProps = {
  step: number
  totalSteps: number
  initialValue?: string
  /** Empty string clears the optional rate code. */
  onNext?: (rateCode: string) => void
  onBack?: () => void
  onHome?: () => void
}

/**
 * Screening step — optional rate code for the bill check (R6). Skippable per
 * R1.3: Next is always enabled, and leaving it blank means no rate code.
 */
export function RateCodeStep({
  step,
  totalSteps,
  initialValue = '',
  onNext,
  onBack,
  onHome,
}: RateCodeStepProps) {
  const [value, setValue] = useState(initialValue)

  return (
    <StepLayout
      step={step}
      totalSteps={totalSteps}
      title={t('screening.rateCode.title')}
      description={t('screening.rateCode.description')}
      onBack={onBack}
      onHome={onHome}
      onNext={() => onNext?.(value.trim())}
    >
      <label
        htmlFor="rate-code"
        className="mt-6 block text-base font-semibold text-ink"
      >
        {t('screening.rateCode.fieldLabel')}
      </label>
      <input
        id="rate-code"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t('screening.rateCode.placeholder')}
        aria-label={t('screening.rateCode.inputAriaLabel')}
        className="mt-2 w-full rounded-xl border border-ink/60 px-4 py-3 text-xl font-semibold text-ink outline-none placeholder:font-normal placeholder:text-muted-2"
      />
    </StepLayout>
  )
}
