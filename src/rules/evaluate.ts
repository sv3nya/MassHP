import type {
  AboveCliffPolicy,
  Benefit,
  ChainResult,
  ChainStep,
  DiscountRatesPolicy,
  Household,
  Policies,
  StepStatus,
} from './types'

/**
 * Heat Path rules engine (design.md § evaluate.ts).
 *
 *   evaluate(household, today, policies) -> ChainResult
 *
 * PURE: no Date.now(), no fetch, no globals, no randomness. `today` is an
 * injected ISO date string. Every number, limit, percentage and date is read
 * from `policies`; nothing about eligibility is hardcoded. Reusable unchanged
 * by advocate mode.
 */
export function evaluate(
  household: Household,
  today: string,
  policies: Policies,
): ChainResult {
  // 1. Cliff inputs + 2. income banding (FPL bands separate from the SMI line).
  const sizeKey = clampSizeKey(
    household.size,
    policies.heap.limit_60_smi_by_household_size,
  )
  const limit60Smi = policies.heap.limit_60_smi_by_household_size[sizeKey]
  const belowCliff = household.grossAnnualIncome <= limit60Smi

  // 3-4. Build the chain in dependency order, applying utility rules.
  const steps = buildChain(household, belowCliff, policies)

  // 5. Protections.
  const protections = buildProtections(household, belowCliff, today, policies)

  // 6. Above-cliff programs (only when income is above the 60% SMI line).
  const aboveCliff = belowCliff
    ? []
    : buildAboveCliff(household, policies.aboveCliff)

  // 7. Bill check (optional).
  const billCheckFlag = buildBillCheck(household, steps)

  return {
    steps,
    protections,
    aboveCliff,
    cliff: { limit60Smi, householdIncome: household.grossAnnualIncome },
    heatline: policies.heap.apply.heatline,
    ...(billCheckFlag ? { billCheckFlag } : {}),
  }
}

// ---------------------------------------------------------------------------
// The chain: HEAP -> discount -> AMP -> Mass Save (dependency order).
// ---------------------------------------------------------------------------

/** Categorical benefits that help unlock the income-eligible discount. */
const DISCOUNT_UNLOCKING_BENEFITS: Benefit[] = [
  'snap',
  'masshealth',
  'tafdc',
  'eaedc',
  'ssi',
  'public_housing',
  'heap',
]

function buildChain(
  household: Household,
  belowCliff: boolean,
  policies: Policies,
): ChainStep[] {
  const heapSource = {
    sourceUrl: policies.heap.source_url,
    verifiedAsOf: policies.heap.verified_as_of,
  }

  // HEAP — income-gated at the 60% SMI line.
  const heapStatus: StepStatus = belowCliff ? 'likely' : 'not_likely'
  const heap: ChainStep = {
    programId: 'heap',
    status: heapStatus,
    unlockedBy: belowCliff ? ['income_at_or_below_60_smi'] : [],
    nextStepKey:
      heapStatus === 'likely' ? 'chain.heap.next_step' : 'chain.heap.above_cliff',
    estimate: null,
    ...heapSource,
    requiresAction: true,
  }

  const isMlp = household.utility === 'municipal_light_plant'
  const isNotSure = household.utility === 'not_sure'

  const discount = buildDiscountStep(
    household,
    belowCliff,
    heap,
    isMlp,
    isNotSure,
    policies.discountRates,
  )

  // AMP and Mass Save are downstream of the discount and depend on the same
  // income gating; they're suppressed for municipal light plants.
  const amp = buildDownstreamStep(
    'amp',
    'chain.amp.next_step',
    'chain.amp.mlp',
    household,
    belowCliff,
    discount,
    isMlp,
    isNotSure,
    policies.heap,
  )

  const massSave = buildDownstreamStep(
    'mass_save',
    'chain.mass_save.next_step',
    'chain.mass_save.mlp',
    household,
    belowCliff,
    discount,
    isMlp,
    isNotSure,
    policies.heap,
  )

  return [heap, discount, amp, massSave]
}

function buildDiscountStep(
  household: Household,
  belowCliff: boolean,
  heap: ChainStep,
  isMlp: boolean,
  isNotSure: boolean,
  discounts: DiscountRatesPolicy,
): ChainStep {
  const base = {
    programId: 'discount',
    estimate: null,
    requiresAction: true,
  }

  // Municipal light plant: IOU discount does not apply — ask the light plant.
  if (isMlp) {
    return {
      ...base,
      status: 'ask_provider',
      unlockedBy: [],
      nextStepKey: 'discount.mlp.ask_light_plant',
      sourceUrl: '',
      verifiedAsOf: '',
    }
  }

  const util = discounts.utilities['national_grid']

  // Pending tiers -> ask_provider, never a concrete discount.
  if (util && util.status === 'pending') {
    return {
      ...base,
      status: 'ask_provider',
      unlockedBy: [],
      nextStepKey: 'discount.pending.ask_utility',
      sourceUrl: util.source_url ?? '',
      verifiedAsOf: util.verified_as_of ?? '',
    }
  }

  const source = {
    sourceUrl: util?.source_url ?? '',
    verifiedAsOf: util?.verified_as_of ?? '',
  }

  if (!belowCliff) {
    return {
      ...base,
      ...source,
      status: 'not_likely',
      unlockedBy: [],
      nextStepKey: 'discount.lost',
    }
  }

  // Below the cliff: the discount is unlocked by HEAP eligibility or a
  // categorical benefit the household already holds.
  const unlockedBy: string[] = []
  if (heap.status === 'likely') unlockedBy.push('heap')
  for (const b of household.benefits) {
    if (DISCOUNT_UNLOCKING_BENEFITS.includes(b)) unlockedBy.push(b)
  }

  // Not sure which utility -> hedge to possible rather than a hard claim.
  if (isNotSure) {
    return {
      ...base,
      ...source,
      status: 'possible',
      unlockedBy,
      nextStepKey: 'discount.unknown.check_bill',
    }
  }

  const status: StepStatus = unlockedBy.length > 0 ? 'likely' : 'possible'
  return {
    ...base,
    ...source,
    status,
    unlockedBy,
    nextStepKey: 'discount.enroll',
  }
}

function buildDownstreamStep(
  programId: string,
  nextStepKey: string,
  mlpKey: string,
  _household: Household,
  belowCliff: boolean,
  discount: ChainStep,
  isMlp: boolean,
  isNotSure: boolean,
  heapPolicy: Policies['heap'],
): ChainStep {
  const source = {
    sourceUrl: heapPolicy.source_url,
    verifiedAsOf: heapPolicy.verified_as_of,
  }

  if (isMlp) {
    return {
      programId,
      status: 'ask_provider',
      unlockedBy: [],
      nextStepKey: mlpKey,
      estimate: null,
      ...source,
      requiresAction: true,
    }
  }

  if (!belowCliff) {
    return {
      programId,
      status: 'not_likely',
      unlockedBy: [],
      nextStepKey,
      estimate: null,
      ...source,
      requiresAction: true,
    }
  }

  // Unlocked by the discount upstream; hedged when the utility is unknown.
  const unlockedBy = discount.status === 'likely' ? ['discount'] : []
  const status: StepStatus =
    isNotSure || discount.status !== 'likely' ? 'possible' : 'likely'

  return {
    programId,
    status,
    unlockedBy,
    nextStepKey,
    estimate: null,
    ...source,
    requiresAction: true,
  }
}

// ---------------------------------------------------------------------------
// Protections. Every protection requires action — never "no action needed".
// Winter Moratorium always evaluated, including for municipal light plants.
// ---------------------------------------------------------------------------

function buildProtections(
  household: Household,
  belowCliff: boolean,
  today: string,
  policies: Policies,
): ChainStep[] {
  const source = {
    sourceUrl: policies.protections.source_url,
    verifiedAsOf: policies.protections.verified_as_of,
  }
  const results: ChainStep[] = []

  const moratoriumActive = isWithinMoratorium(today, policies)

  for (const p of policies.protections.protections) {
    const status = protectionStatus(
      p,
      household,
      belowCliff,
      moratoriumActive,
    )
    if (!status) continue
    results.push({
      programId: p.id,
      status,
      unlockedBy: [],
      nextStepKey: p.what_to_say_key,
      estimate: null,
      ...source,
      requiresAction: true,
    })
  }

  return results
}

function protectionStatus(
  p: Policies['protections']['protections'][number],
  household: Household,
  belowCliff: boolean,
  moratoriumActive: boolean,
): StepStatus | null {
  const hardshipOk = p.requires_financial_hardship ? belowCliff : true

  switch (p.id) {
    case 'winter_moratorium':
      // Evaluated for any household (incl. MLP) when the window is active.
      return moratoriumActive && hardshipOk ? 'possible' : null
    case 'prior_winter_heap_presumption':
      return household.heapLastWinter === 'yes' ? 'possible' : null
    case 'infant':
      return household.infantUnder12mo && hardshipOk ? 'possible' : null
    case 'serious_illness':
      return household.seriousIllness && hardshipOk ? 'possible' : null
    case 'elderly_with_minor':
      return household.allAdults65Plus && household.anyoneUnder18 && hardshipOk
        ? 'possible'
        : null
    case 'all_residents_65_plus':
      // All adults 65+ AND no minor present (R4.2).
      return household.allAdults65Plus && household.anyoneUnder18 === false
        ? 'possible'
        : null
    default:
      return null
  }
}

/** True if `today` falls within the Winter Moratorium window from seasons. */
function isWithinMoratorium(today: string, policies: Policies): boolean {
  const dates = policies.seasons.dates
  const start = dates['moratorium_start']?.date
  const end =
    dates['moratorium_extended_to']?.date ?? dates['moratorium_end']?.date
  if (!start || !end) return false
  return today >= start && today <= end
}

// ---------------------------------------------------------------------------
// Above-cliff programs.
// ---------------------------------------------------------------------------

function buildAboveCliff(
  household: Household,
  aboveCliff: AboveCliffPolicy,
): ChainStep[] {
  const results: ChainStep[] = []

  for (const program of aboveCliff.programs) {
    const source = {
      sourceUrl: program.source_url,
      verifiedAsOf: program.verified_as_of,
    }
    const limits = program.income_limits_by_household_size
    const sizeKey = String(household.size)
    const bandLimits = limits?.[sizeKey]

    if (!limits || !bandLimits) {
      results.push({
        programId: program.id,
        status: 'ask_provider',
        unlockedBy: [],
        nextStepKey: program.next_step_key ?? 'abovecliff.ask',
        estimate: null,
        ...source,
        requiresAction: true,
      })
      continue
    }

    const withinMax =
      bandLimits.max_exclusive !== undefined
        ? household.grossAnnualIncome < bandLimits.max_exclusive
        : bandLimits.max !== undefined
          ? household.grossAnnualIncome <= bandLimits.max
          : true
    const inBand = household.grossAnnualIncome >= bandLimits.min && withinMax

    results.push({
      programId: program.id,
      status: inBand ? 'possible' : 'not_likely',
      unlockedBy: [],
      nextStepKey: program.next_step_key ?? 'abovecliff.ask',
      estimate:
        inBand && typeof program.benefit_max === 'number'
          ? { low: 0, high: program.benefit_max }
          : null,
      ...source,
      requiresAction: true,
    })
  }

  return results
}

// ---------------------------------------------------------------------------
// Bill check. Hedged; never states an amount.
// ---------------------------------------------------------------------------

function buildBillCheck(
  household: Household,
  steps: ChainStep[],
): ChainResult['billCheckFlag'] {
  if (!household.rateCode) return undefined
  // Standard-rate codes are "R-1"/"R-3" per discount-rates.json rate_code_standard.
  const standardCodes = ['R-1', 'R-3']
  const onStandardRate = standardCodes.includes(
    household.rateCode.trim().toUpperCase(),
  )
  const discount = steps.find((s) => s.programId === 'discount')
  const likelyEligible =
    discount?.status === 'likely' || discount?.status === 'possible'

  if (onStandardRate && likelyEligible) {
    return { onStandardRate: true, messageKey: 'billcheck.retroactive' }
  }
  return undefined
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Clamp a household size to the largest published row in a by-size table. */
function clampSizeKey(size: number, table: Record<string, number>): string {
  if (Object.prototype.hasOwnProperty.call(table, String(size))) {
    return String(size)
  }
  const keys = Object.keys(table)
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b)
  const max = keys[keys.length - 1]
  const min = keys[0]
  if (size > max) return String(max)
  if (size < min) return String(min)
  return String(size)
}
