import { useState } from 'react'
import { t } from '../i18n'
import { Icon } from './Icon'
import { StepLayout } from './StepLayout'

type IncomeStepProps = {
  step?: number
  totalSteps?: number
  initialIncome?: number | null
  onNext?: (annualIncome: number) => void
  onBack?: () => void
  onHome?: () => void
}

/** Keep only digits, parse to a whole-dollar number (or null if empty). */
function parseIncome(raw: string): number | null {
  const digits = raw.replace(/[^0-9]/g, '')
  if (digits === '') return null
  return Number(digits)
}

/** Group digits with thousands separators for display. */
function formatIncome(value: number | null): string {
  if (value === null) return ''
  return value.toLocaleString('en-US')
}

/**
 * Screening flow — Step 2: household income. Collects estimated annual gross
 * income (a screener input only; the rules engine scores eligibility from
 * /policies). Answers stay in local state only.
 */
export function IncomeStep({
  step = 2,
  totalSteps = 6,
  initialIncome = null,
  onNext,
  onBack,
  onHome,
}: IncomeStepProps) {
  const [income, setIncome] = useState<number | null>(initialIncome)

  return (
    <StepLayout
      step={step}
      totalSteps={totalSteps}
      title={t('screening.income.title')}
      description={t('screening.income.description')}
      nextDisabled={income === null}
      onBack={onBack}
      onHome={onHome}
      onNext={() => income !== null && onNext?.(income)}
    >
      <label
        htmlFor="household-income"
        className="mt-6 block text-base font-semibold text-ink"
      >
        {t('screening.income.fieldLabel')}
      </label>
      <div className="mt-2 flex items-center gap-2 rounded-xl border border-ink/60 px-4 py-3">
        <span className="text-xl font-semibold text-ink">
          {t('screening.income.currencySymbol')}
        </span>
        <input
          id="household-income"
          type="text"
          inputMode="numeric"
          value={formatIncome(income)}
          onChange={(e) => setIncome(parseIncome(e.target.value))}
          aria-label={t('screening.income.inputAriaLabel')}
          className="w-full bg-transparent text-xl font-semibold text-ink outline-none"
        />
      </div>
      <p className="mt-3 flex items-start gap-2 text-sm text-muted-2">
        <Icon name="dollar" className="mt-0.5 h-4 w-4 shrink-0 text-muted-2" />
        <span>{t('screening.income.helper')}</span>
      </p>
    </StepLayout>
  )
}
