import { useState } from 'react'
import { t } from '../i18n'
import type { Utility } from '../rules/types'
import { ChoiceList, type Choice } from './ChoiceList'
import { StepLayout } from './StepLayout'

type UtilityStepProps = {
  step?: number
  totalSteps?: number
  initialValue?: Utility | null
  onNext?: (utility: Utility) => void
  onBack?: () => void
  onHome?: () => void
}

/**
 * Screening flow — Step 3: your utility. Per requirements.md R1.2 the only
 * options are National Grid, municipal light plant, and not sure.
 */
export function UtilityStep({
  step = 3,
  totalSteps = 6,
  initialValue = null,
  onNext,
  onBack,
  onHome,
}: UtilityStepProps) {
  const [value, setValue] = useState<Utility | null>(initialValue)

  const choices: Choice[] = [
    {
      value: 'national_grid',
      label: t('screening.utility.options.national_grid'),
    },
    {
      value: 'municipal_light_plant',
      label: t('screening.utility.options.municipal_light_plant'),
      hint: t('screening.utility.options.municipal_light_plant_hint'),
    },
    { value: 'not_sure', label: t('screening.utility.options.not_sure') },
  ]

  return (
    <StepLayout
      step={step}
      totalSteps={totalSteps}
      title={t('screening.utility.title')}
      description={t('screening.utility.description')}
      nextDisabled={value === null}
      onBack={onBack}
      onHome={onHome}
      onNext={() => value !== null && onNext?.(value)}
    >
      <ChoiceList
        choices={choices}
        selected={value ?? ''}
        onChange={(v) => setValue(v as Utility)}
        ariaLabel={t('screening.utility.ariaLabel')}
      />
    </StepLayout>
  )
}
