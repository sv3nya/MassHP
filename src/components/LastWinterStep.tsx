import { useState } from 'react'
import { t } from '../i18n'
import type { TriState } from '../rules/types'
import { ChoiceList, type Choice } from './ChoiceList'
import { StepLayout } from './StepLayout'

type LastWinterStepProps = {
  step?: number
  totalSteps?: number
  initialValue?: TriState | null
  /** Maps directly to Household.heapLastWinter. */
  onNext?: (heapLastWinter: TriState) => void
  onBack?: () => void
}

/**
 * Screening flow — Step 6 (final): did the household get HEAP last winter?
 * Drives the prior-winter HEAP presumption protection. Maps to the spec's
 * TriState ("yes" | "no" | "not_sure").
 */
export function LastWinterStep({
  step = 6,
  totalSteps = 6,
  initialValue = null,
  onNext,
  onBack,
}: LastWinterStepProps) {
  const [value, setValue] = useState<TriState | null>(initialValue)

  const choices: Choice[] = [
    { value: 'yes', label: t('screening.lastWinter.options.yes') },
    { value: 'no', label: t('screening.lastWinter.options.no') },
    { value: 'not_sure', label: t('screening.lastWinter.options.not_sure') },
  ]

  return (
    <StepLayout
      step={step}
      totalSteps={totalSteps}
      title={t('screening.lastWinter.title')}
      description={t('screening.lastWinter.description')}
      nextDisabled={value === null}
      onBack={onBack}
      onNext={() => value !== null && onNext?.(value)}
      nextLabelKey="screening.seeResults"
    >
      <ChoiceList
        choices={choices}
        selected={value ?? ''}
        onChange={(v) => setValue(v as TriState)}
        ariaLabel={t('screening.lastWinter.ariaLabel')}
      />
    </StepLayout>
  )
}
