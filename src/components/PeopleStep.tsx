import { useState } from 'react'
import { t } from '../i18n'
import type { Household } from '../rules/types'
import { ChoiceList, type Choice } from './ChoiceList'
import { StepLayout } from './StepLayout'

type PeopleStepProps = {
  step?: number
  totalSteps?: number
  initialValue?: string[]
  onNext?: (flags: ProtectionFlags) => void
  onBack?: () => void
  onHome?: () => void
}

/** The subset of Household fields this step collects. */
export type ProtectionFlags = Pick<
  Household,
  'infantUnder12mo' | 'seriousIllness' | 'anyoneUnder18' | 'allAdults65Plus'
>

const FLAG_KEYS: (keyof ProtectionFlags)[] = [
  'infantUnder12mo',
  'seriousIllness',
  'anyoneUnder18',
  'allAdults65Plus',
]

const NONE = '__none__'

/**
 * Screening flow — Step 5: who lives in the home. A multi-select that maps to
 * the protection flags the rules engine reads. "None of these" is mutually
 * exclusive with the other options. This step is optional to answer (Next is
 * always enabled); no selection simply means no extra protections apply.
 */
export function PeopleStep({
  step = 5,
  totalSteps = 6,
  initialValue = [],
  onNext,
  onBack,
  onHome,
}: PeopleStepProps) {
  const [selected, setSelected] = useState<string[]>(initialValue)

  const choices: Choice[] = [
    ...FLAG_KEYS.map((key) => ({
      value: key,
      label: t(`screening.people.options.${key}`),
    })),
    { value: NONE, label: t('screening.people.none') },
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

  const handleNext = () => {
    const flags: ProtectionFlags = {
      anyoneUnder18: selected.includes('anyoneUnder18'),
      infantUnder12mo: selected.includes('infantUnder12mo'),
      seriousIllness: selected.includes('seriousIllness'),
      allAdults65Plus: selected.includes('allAdults65Plus'),
    }
    onNext?.(flags)
  }

  return (
    <StepLayout
      step={step}
      totalSteps={totalSteps}
      title={t('screening.people.title')}
      description={t('screening.people.description')}
      onBack={onBack}
      onHome={onHome}
      onNext={handleNext}
    >
      <ChoiceList
        choices={choices}
        selected={selected}
        multi
        onChange={toggle}
        ariaLabel={t('screening.people.ariaLabel')}
      />
    </StepLayout>
  )
}
