import { useState } from 'react'
import { BehindOnBillsStep } from './components/BehindOnBillsStep'
import { BenefitsStep } from './components/BenefitsStep'
import { FuelStep } from './components/FuelStep'
import { HouseholdSizeStep } from './components/HouseholdSizeStep'
import { IncomeStep } from './components/IncomeStep'
import { LastWinterStep } from './components/LastWinterStep'
import { PeopleStep, type ProtectionFlags } from './components/PeopleStep'
import { RateCodeStep } from './components/RateCodeStep'
import { ResultScreen } from './components/ResultScreen'
import { UtilityStep } from './components/UtilityStep'
import { evaluate } from './rules/evaluate'
import { policies } from './rules/policies'
import type { ChainResult, Household } from './rules/types'

/**
 * Ordered screening steps. The progress indicator derives its total from this
 * list, so adding or removing a step keeps "Step x of y" correct.
 */
const STEPS = [
  'size',
  'income',
  'utility',
  'fuel',
  'benefits',
  'behind',
  'people',
  'rateCode',
  'lastWinter',
] as const

const TOTAL = STEPS.length

/** Blank screening answers. Nothing is persisted or sent. */
const EMPTY: Partial<Household> = {
  size: 4,
  benefits: [],
  anyoneUnder18: false,
}

function App() {
  // 1-indexed position within STEPS.
  const [index, setIndex] = useState(1)
  const [answers, setAnswers] = useState<Partial<Household>>(EMPTY)
  const [result, setResult] = useState<ChainResult | null>(null)

  const next = (patch: Partial<Household>) => {
    setAnswers((prev) => ({ ...prev, ...patch }))
    setIndex((i) => i + 1)
  }
  const back = () => setIndex((i) => i - 1)

  // Home: a true browser reload, which clears all in-memory answers and
  // starts a fresh form. Nothing is persisted, so a reload resets everything.
  const restart = () => window.location.reload()

  const finish = (patch: Partial<Household>) => {
    const household = { ...EMPTY, ...answers, ...patch } as Household
    setAnswers(household)
    // The UI supplies the real date once; the engine stays pure.
    const today = new Date().toISOString().slice(0, 10)
    setResult(evaluate(household, today, policies))
  }

  // Full result screen: chain, cliff, protections, above-cliff, bill check,
  // inside the compliance frame (disclaimer + Heatline).
  if (result) {
    return (
      <ResultScreen
        result={result}
        household={answers as Household}
        policies={policies}
        onHome={restart}
      />
    )
  }

  const common = {
    totalSteps: TOTAL,
    onBack: index > 1 ? back : undefined,
    onHome: restart,
  }

  switch (STEPS[index - 1]) {
    case 'size':
      return (
        <HouseholdSizeStep
          step={index}
          totalSteps={TOTAL}
          initialSize={answers.size ?? 4}
          onHome={restart}
          onNext={(size) => next({ size })}
        />
      )
    case 'income':
      return (
        <IncomeStep
          step={index}
          {...common}
          initialIncome={answers.grossAnnualIncome ?? null}
          onNext={(income) => next({ grossAnnualIncome: income })}
        />
      )
    case 'utility':
      return (
        <UtilityStep
          step={index}
          {...common}
          initialValue={answers.utility ?? null}
          onNext={(utility) => next({ utility })}
        />
      )
    case 'fuel':
      return (
        <FuelStep
          step={index}
          {...common}
          initialValue={answers.heatingFuel ?? null}
          onNext={(heatingFuel) => next({ heatingFuel })}
        />
      )
    case 'benefits':
      return (
        <BenefitsStep
          step={index}
          {...common}
          initialValue={answers.benefits ?? []}
          onNext={(benefits) => next({ benefits })}
        />
      )
    case 'behind':
      return (
        <BehindOnBillsStep
          step={index}
          {...common}
          initialValue={answers.behindOnBills ?? null}
          onNext={(behindOnBills) => next({ behindOnBills })}
        />
      )
    case 'people':
      return (
        <PeopleStep
          step={index}
          {...common}
          initialValue={flagsToSelected(answers)}
          onNext={(flags) => next(flags)}
        />
      )
    case 'rateCode':
      return (
        <RateCodeStep
          step={index}
          {...common}
          initialValue={answers.rateCode ?? ''}
          onNext={(rateCode) => next({ rateCode: rateCode || undefined })}
        />
      )
    case 'lastWinter':
      return (
        <LastWinterStep
          step={index}
          {...common}
          initialValue={answers.heapLastWinter ?? null}
          onNext={(heapLastWinter) => finish({ heapLastWinter })}
        />
      )
    default:
      return null
  }
}

/** Rebuild the multi-select state from stored flags when navigating back. */
function flagsToSelected(answers: Partial<Household>): string[] {
  const keys: (keyof ProtectionFlags)[] = [
    'infantUnder12mo',
    'seriousIllness',
    'anyoneUnder18',
    'allAdults65Plus',
  ]
  return keys.filter((k) => answers[k])
}

export default App
