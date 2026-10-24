import { useState } from 'react'
import { t } from '../i18n'
import type { Benefit } from '../rules/types'
import { ChoiceList, type Choice } from './ChoiceList'
import { StepLayout } from './StepLayout'

type BenefitsStepProps = {
  step: number
  totalSteps: number
  initialValue?: Benefit[]
  onNext?: (benefits: Benefit[]) => void
  onBack?: () => void
  onHome?: () => void
}

const BENEFIT_KEYS: Benefit[] = [
  'snap',
  'masshealth',
  'tafdc',
  'eaedc',
  'ssi',
  'public_housing',
  'heap',
]

const NONE = '__none__'

/**
 * Screening step — categorical benefits the household receives. Maps to
 * Household.benefits, which the engine uses to unlock the utility discount.
 * "None of these" is mutually exclusive with the other options.
 */
export function BenefitsStep({
  step,
  totalSteps,
  initialValue = [],
  onNext,
  onBack,
  onHome,
}: BenefitsStepProps) {
  const [selected, setSelected] = useState<string[]>(initialValue)

  const choices: Choice[] = [
    ...BENEFIT_KEYS.map((key) => ({
      value: key,
      label: t(`screening.benefits.options.${key}`),
    })),
    { value: NONE, label: t('screening.benefits.none') },
  ]

  const toggle = (value: string) => {
    setSelected((prev) => {
      if (value === NONE) return prev.includes(NONE) ? [] : [NONE]
      const withoutNone = prev.filter((v) => v !== NONE)
      return withoutNone.includes(value)
        ? withoutNone.filter((v) => v !== value)
        : [...withoutNone, value]
    })
  }

  return (
    <StepLayout
      step={step}
      totalSteps={totalSteps}
      title={t('screening.benefits.title')}
      description={t('screening.benefits.description')}
      onBack={onBack}
      onHome={onHome}
      onNext={() =>
        onNext?.(BENEFIT_KEYS.filter((k) => selected.includes(k)))
      }
    >
      <ChoiceList
        choices={choices}
        selected={selected}
        multi
        onChange={toggle}
        ariaLabel={t('screening.benefits.ariaLabel')}
      />
    </StepLayout>
  )
}
