import { useState } from 'react'
import { t } from '../i18n'
import type { HeatingFuel } from '../rules/types'
import { ChoiceList, type Choice } from './ChoiceList'
import { StepLayout } from './StepLayout'

type FuelStepProps = {
  step?: number
  totalSteps?: number
  initialValue?: HeatingFuel | null
  onNext?: (fuel: HeatingFuel) => void
  onBack?: () => void
}

/**
 * Screening flow — Step 4: how you heat. Drives fuel-specific programs (e.g.
 * oil relief) in the rules engine.
 */
export function FuelStep({
  step = 4,
  totalSteps = 6,
  initialValue = null,
  onNext,
  onBack,
}: FuelStepProps) {
  const [value, setValue] = useState<HeatingFuel | null>(initialValue)

  const choices: Choice[] = [
    { value: 'gas', label: t('screening.fuel.options.gas') },
    { value: 'electric', label: t('screening.fuel.options.electric') },
    { value: 'oil', label: t('screening.fuel.options.oil') },
    { value: 'propane', label: t('screening.fuel.options.propane') },
    { value: 'other', label: t('screening.fuel.options.other') },
  ]

  return (
    <StepLayout
      step={step}
      totalSteps={totalSteps}
      title={t('screening.fuel.title')}
      description={t('screening.fuel.description')}
      nextDisabled={value === null}
      onBack={onBack}
      onNext={() => value !== null && onNext?.(value)}
    >
      <ChoiceList
        choices={choices}
        selected={value ?? ''}
        onChange={(v) => setValue(v as HeatingFuel)}
        ariaLabel={t('screening.fuel.ariaLabel')}
      />
    </StepLayout>
  )
}
