import { useState } from 'react'
import { t } from '../i18n'
import { ChoiceList, type Choice } from './ChoiceList'
import { StepLayout } from './StepLayout'

type BehindOnBillsStepProps = {
  step: number
  totalSteps: number
  initialValue?: boolean | null
  onNext?: (behindOnBills: boolean) => void
  onBack?: () => void
  onHome?: () => void
}

/**
 * Screening step — is the household behind on an energy bill? Maps to
 * Household.behindOnBills.
 */
export function BehindOnBillsStep({
  step,
  totalSteps,
  initialValue = null,
  onNext,
  onBack,
  onHome,
}: BehindOnBillsStepProps) {
  const [value, setValue] = useState<boolean | null>(initialValue)

  const choices: Choice[] = [
    { value: 'yes', label: t('screening.behindOnBills.options.yes') },
    { value: 'no', label: t('screening.behindOnBills.options.no') },
  ]

  return (
    <StepLayout
      step={step}
      totalSteps={totalSteps}
      title={t('screening.behindOnBills.title')}
      description={t('screening.behindOnBills.description')}
      nextDisabled={value === null}
      onBack={onBack}
      onHome={onHome}
      onNext={() => value !== null && onNext?.(value)}
    >
      <ChoiceList
        choices={choices}
        selected={value === null ? '' : value ? 'yes' : 'no'}
        onChange={(v) => setValue(v === 'yes')}
        ariaLabel={t('screening.behindOnBills.ariaLabel')}
      />
    </StepLayout>
  )
}
