import { useState } from 'react'
import { t } from '../i18n'
import { Icon } from './Icon'
import { StepLayout } from './StepLayout'

/** Largest discrete size offered; rendered as "8+" to include bigger households. */
const MAX_HOUSEHOLD_SIZE = 8
const HOUSEHOLD_SIZE_OPTIONS = Array.from(
  { length: MAX_HOUSEHOLD_SIZE },
  (_, i) => i + 1,
)

type HouseholdSizeStepProps = {
  step?: number
  totalSteps?: number
  initialSize?: number
  onNext?: (size: number) => void
}

/**
 * Screening flow — Step 1: household size. Mobile-first; all copy from i18n;
 * answers stay in local state only.
 */
export function HouseholdSizeStep({
  step = 1,
  totalSteps = 6,
  initialSize = 1,
  onNext,
}: HouseholdSizeStepProps) {
  const [size, setSize] = useState(initialSize)

  return (
    <StepLayout
      step={step}
      totalSteps={totalSteps}
      title={t('screening.householdSize.title')}
      description={t('screening.householdSize.description')}
      onNext={() => onNext?.(size)}
    >
      <label
        htmlFor="household-size"
        className="mt-6 block text-base font-semibold text-ink"
      >
        {t('screening.householdSize.fieldLabel')}
      </label>
      <div className="relative mt-2 flex items-center gap-3 rounded-xl border border-ink/60 px-4 py-3">
        <Icon name="person" className="h-6 w-6 shrink-0 text-ink" />
        <select
          id="household-size"
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          aria-label={t('screening.householdSize.inputAriaLabel')}
          className="w-full cursor-pointer appearance-none bg-transparent pr-8 text-xl font-semibold text-ink outline-none"
        >
          {HOUSEHOLD_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n === MAX_HOUSEHOLD_SIZE
                ? t('screening.householdSize.optionPlus', { count: n })
                : n}
            </option>
          ))}
        </select>
        <Icon
          name="chevron-down"
          className="pointer-events-none absolute right-4 h-5 w-5 text-ink"
        />
      </div>
    </StepLayout>
  )
}
