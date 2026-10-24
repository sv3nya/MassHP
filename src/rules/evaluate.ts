// The Heat Path rules engine. PURE: no Date.now(), no fetch, no globals, no
// randomness. `today` (ISO date string) and `policies` are parameters.
//
// All numbers, dates, URLs and phone numbers come from `policies`. No literals.

import type {
  Household,
  Policies,
  ChainStep,
  ChainResult,
  StepStatus,
  Benefit,
  FplBand,
  DiscountUtility,
  ProtectionDef,
} from './types'
import { cliffData } from './cliff'

const FPL_BAND_ORDER: FplBand[] = [
  'fpl_100',
  'fpl_125',
  'fpl_150',
  'fpl_175',
  'fpl_200',
  'smi_60',
]

/** Categorical benefits that support (but do not bypass) income eligibility. */
const CATEGORICAL_BENEFITS: Benefit[] = ['snap', 'tafdc', 'eaedc', 'ssi']

function clampSizeKey(size: number, policies: Policies): string {
  const max = policies.fplTiers.max_household_size_on_chart
  return String(Math.min(Math.max(Math.trunc(size), 1), max))
}

/** True when `today` is within [start, end] inclusive. ISO dates compare lexically. */
function withinInclusive(today: string, start: string, end: string): boolean {
  return today >= start && today <= end
}

function seasonDate(policies: Policies, key: string): string | null {
  return policies.seasons.dates[key]?.date ?? null
}

/** The household's FPL band, or null when above the 60% SMI cliff. */
function incomeBand(household: Household, policies: Policies): FplBand | null {
  const sizeKey = clampSizeKey(household.size, policies)
  const limits = policies.fplTiers.upper_limits_by_household_size[sizeKey]
  if (!limits) return null
  for (const band of FPL_BAND_ORDER) {
    if (household.grossAnnualIncome <= limits[band]) return band
  }
  return null
}

function incomeAtOrBelow60Smi(household: Household, policies: Policies): boolean {
  const sizeKey = clampSizeKey(household.size, policies)
  const limit = policies.heap.limit_60_smi_by_household_size[sizeKey]
  return limit !== undefined && household.grossAnnualIncome <= limit
}

function categoricalHeld(household: Household): Benefit[] {
  return household.benefits.filter((b) => CATEGORICAL_BENEFITS.includes(b))
}

// ---------------------------------------------------------------------------
// Chain steps
// ---------------------------------------------------------------------------

function heapStep(household: Household, policies: Policies): ChainStep {
  const eligible = incomeAtOrBelow60Smi(household, policies)
  const supporting = categoricalHeld(household)
  return {
    programId: 'heap',
    status: eligible ? 'likely' : 'not_likely',
    unlockedBy: supporting, // categorical benefits are supporting evidence
    nextStepKey: 'step.heap.next_step',
    estimate: null, // HEAP grant depends on funding/housing; shown elsewhere
    sourceUrl: policies.heap.source_url,
    verifiedAsOf: policies.heap.verified_as_of,
    requiresAction: true,
  }
}

function discountStep(
  household: Household,
  policies: Policies,
  heapLikely: boolean,
): ChainStep {
  const util: DiscountUtility | undefined =
    policies.discountRates.utilities[household.utility]

  // Municipal light plant and not_sure: ask the provider, no concrete claim.
  if (household.utility === 'municipal_light_plant') {
    return askProviderDiscount(policies, util, 'discount.mlp.ask_light_plant')
  }
  if (household.utility === 'not_sure') {
    return askProviderDiscount(policies, util, 'discount.unknown.check_bill')
  }

  // Investor-owned utility (national_grid). A pending tier => ask_provider.
  if (util?.status === 'pending') {
    return askProviderDiscount(policies, util, util.message_key ?? '')
  }

  const inBand = incomeBand(household, policies) !== null
  const supporting = categoricalHeld(household)
  const unlockedBy = heapLikely ? ['heap', ...supporting] : supporting
  return {
    programId: 'discount_rate',
    status: inBand ? 'likely' : 'not_likely',
    unlockedBy,
    nextStepKey: 'step.discount.next_step',
    estimate: null, // discount is a % off; no bill amount is collected
    sourceUrl: utilitySource(util, policies),
    verifiedAsOf: utilityVerified(util, policies),
    requiresAction: true,
  }
}

function askProviderDiscount(
  policies: Policies,
  util: DiscountUtility | undefined,
  messageKey: string,
): ChainStep {
  return {
    programId: 'discount_rate',
    status: 'ask_provider',
    unlockedBy: [],
    nextStepKey: messageKey,
    estimate: null,
    sourceUrl: utilitySource(util, policies),
    verifiedAsOf: utilityVerified(util, policies),
    requiresAction: true,
  }
}

function utilitySource(
  util: DiscountUtility | undefined,
  policies: Policies,
): string {
  const withProv = util as unknown as { source_url?: string } | undefined
  return withProv?.source_url ?? policies.heap.source_url
}

function utilityVerified(
  util: DiscountUtility | undefined,
  policies: Policies,
): string {
  const withProv = util as unknown as { verified_as_of?: string } | undefined
  return withProv?.verified_as_of ?? policies.heap.verified_as_of
}

/** AMP: derived step (no dedicated policy file). Borrows discount provenance. */
function ampStep(household: Household, discount: ChainStep): ChainStep {
  let status: StepStatus
  if (discount.status === 'ask_provider') {
    status = 'ask_provider'
  } else if (
    household.behindOnBills &&
    (discount.status === 'likely' || discount.status === 'possible')
  ) {
    status = 'possible'
  } else {
    status = 'not_likely'
  }
  return {
    programId: 'amp',
    status,
    unlockedBy: ['discount_rate'],
    nextStepKey: 'step.amp.next_step',
    estimate: null, // debt forgiveness depends on the account balance
    sourceUrl: discount.sourceUrl,
    verifiedAsOf: discount.verifiedAsOf,
    requiresAction: true,
  }
}

/** Mass Save income-eligible: derived step. Gated like HEAP (60% SMI). */
function massSaveStep(
  household: Household,
  policies: Policies,
  heapLikely: boolean,
): ChainStep {
  let status: StepStatus
  if (
    household.utility === 'municipal_light_plant' ||
    household.utility === 'not_sure'
  ) {
    status = 'ask_provider'
  } else {
    status = incomeAtOrBelow60Smi(household, policies) ? 'likely' : 'not_likely'
  }
  return {
    programId: 'mass_save',
    status,
    unlockedBy: heapLikely ? ['heap'] : [],
    nextStepKey: 'step.mass_save.next_step',
    estimate: null,
    sourceUrl: policies.heap.source_url,
    verifiedAsOf: policies.heap.verified_as_of,
    requiresAction: true,
  }
}

// ---------------------------------------------------------------------------
// Protections
// ---------------------------------------------------------------------------

/** Does the household trigger this protection? */
function protectionTriggered(
  def: ProtectionDef,
  household: Household,
  policies: Policies,
  today: string,
): boolean {
  switch (def.id) {
    case 'winter_moratorium': {
      const start = seasonDate(policies, def.season_ref?.keys['start'] ?? '')
      const endKey =
        seasonDate(policies, def.season_ref?.keys['extended_to'] ?? '') ??
        seasonDate(policies, def.season_ref?.keys['end'] ?? '')
      if (!start || !endKey) return false
      return withinInclusive(today, start, endKey)
    }
    case 'prior_winter_heap_presumption':
      return household.heapLastWinter === 'yes'
    case 'infant':
      return household.infantUnder12mo === true
    case 'serious_illness':
      return household.seriousIllness === true
    case 'elderly_with_minor':
      return household.allAdults65Plus === true && household.anyoneUnder18 === true
    case 'all_residents_65_plus':
      return household.allAdults65Plus === true && household.anyoneUnder18 === false
    default:
      return false
  }
}

function buildProtections(
  household: Household,
  policies: Policies,
  today: string,
): ChainStep[] {
  const steps: ChainStep[] = []
  for (const def of policies.protections.protections) {
    if (!protectionTriggered(def, household, policies, today)) continue
    steps.push({
      programId: def.id,
      status: 'possible', // a screener never asserts a protection is granted
      unlockedBy: [],
      nextStepKey: def.what_to_say_key,
      estimate: null,
      sourceUrl: policies.protections.source_url,
      verifiedAsOf: policies.protections.verified_as_of,
      requiresAction: true, // never "no action needed"
    })
  }
  return steps
}

// ---------------------------------------------------------------------------
// Above-cliff programs
// ---------------------------------------------------------------------------

function buildAboveCliff(household: Household, policies: Policies): ChainStep[] {
  const sizeKey = clampSizeKey(household.size, policies)
  const smiLimit = policies.heap.limit_60_smi_by_household_size[sizeKey]
  // Only surface above-cliff help when the household is above the cliff.
  if (smiLimit === undefined || household.grossAnnualIncome <= smiLimit) {
    return []
  }

  const steps: ChainStep[] = []
  for (const program of policies.aboveCliff.programs) {
    const band = program.income_limits_by_household_size[sizeKey]

    // Oil relief only applies to oil heat.
    if (program.id === 'middle_income_oil_relief' && household.heatingFuel !== 'oil') {
      continue
    }

    let status: StepStatus
    if (!band) {
      // Size not listed for this program (e.g. oil relief sizes 7+).
      status = 'ask_provider'
    } else {
      const max = band.max ?? band.max_exclusive ?? null
      const inBand =
        household.grossAnnualIncome >= band.min &&
        (max === null || household.grossAnnualIncome <= max)
      status = inBand ? 'possible' : 'not_likely'
    }

    if (status === 'not_likely') continue

    steps.push({
      programId: program.id,
      status,
      unlockedBy: [],
      nextStepKey: program.next_step_key,
      estimate: null,
      sourceUrl: program.source_url,
      verifiedAsOf: program.verified_as_of,
      requiresAction: true,
    })
  }
  return steps
}

// ---------------------------------------------------------------------------
// Bill check
// ---------------------------------------------------------------------------

function buildBillCheckFlag(
  household: Household,
  policies: Policies,
  discount: ChainStep,
): ChainResult['billCheckFlag'] {
  if (!household.rateCode) return undefined
  if (household.utility !== 'national_grid') return undefined

  const util = policies.discountRates.utilities['national_grid']
  const services = util?.services
  if (!services) return undefined

  const standardCodes = Object.values(services).map((s) => s.rate_code_standard)
  const onStandard = standardCodes.includes(household.rateCode)
  const likelyEligible =
    discount.status === 'likely' || discount.status === 'possible'

  if (onStandard && likelyEligible) {
    return { onStandardRate: true, messageKey: 'billcheck.on_standard_rate' }
  }
  return undefined
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function evaluate(
  household: Household,
  today: string,
  policies: Policies,
): ChainResult {
  const heap = heapStep(household, policies)
  const heapLikely = heap.status === 'likely'

  const discount = discountStep(household, policies, heapLikely)
  const amp = ampStep(household, discount)
  const massSave = massSaveStep(household, policies, heapLikely)

  // Municipal light plant: suppress IOU discount/AMP/Mass Save as concrete
  // claims — they are surfaced as ask_provider by their own builders above.
  const steps: ChainStep[] = [heap, discount, amp, massSave]

  const protections = buildProtections(household, policies, today)
  const aboveCliff = buildAboveCliff(household, policies)

  const cliff = cliffData(household, policies)
  const billCheckFlag = buildBillCheckFlag(household, policies, discount)

  return {
    steps,
    protections,
    aboveCliff,
    cliff: {
      limit60Smi: cliff.limit60Smi,
      householdIncome: cliff.householdIncome,
    },
    heatline: policies.heap.apply.heatline,
    ...(billCheckFlag ? { billCheckFlag } : {}),
  }
}
