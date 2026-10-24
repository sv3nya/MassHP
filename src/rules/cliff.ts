// Pure producer of cliff-chart data. No Date.now(), no fetch, no globals, no
// randomness. All numbers come from policies.
//
// Per Requirement 5.1 / design.md § cliff.ts, this charts the estimated yearly
// energy-assistance value versus income for the household's size, with the
// 60% SMI reference line. The value is the maximum HEAP grant for the income's
// FPL band, read from fpl-tiers.json `benefit_levels_by_band` — real policy
// numbers, no literals. Above the 60% SMI line the linked chain largely drops
// away, so the value falls to zero: that step IS the cliff the chart shows.

import type { Household, Policies, FplBand } from './types'

/** One sampled point on the cliff series. */
export interface CliffDatum {
  /** Annual income at this sample point, in whole dollars. */
  income: number
  /**
   * Estimated yearly energy-assistance value (the HEAP grant for this income's
   * FPL band) in whole dollars. Drops to 0 once income is above the cliff.
   * Always an estimate; the UI labels it as such and never as a guarantee.
   */
  estimatedValue: number
  /** True once income is above the 60% SMI cliff line. */
  aboveCliff: boolean
}

export interface CliffData {
  /** The 60% SMI cliff line (annual dollars) for this household size. */
  limit60Smi: number
  /** The household's own income, so the chart can mark their position. */
  householdIncome: number
  /** Whether the household sits above the 60% SMI cliff. */
  aboveCliff: boolean
  /** Sampled series across the income range, ascending by income. */
  data: CliffDatum[]
}

export interface CliffOptions {
  /** Number of evenly spaced sample points (default 48). */
  samples?: number
  /** Upper income bound as a multiple of the cliff income (default 1.4). */
  maxMultiple?: number
  /**
   * Housing/benefit category used to read benefit amounts from
   * `benefit_levels_by_band`. Defaults to the homeowner / non-subsidized
   * deliverable-fuel column — the headline estimate.
   */
  housingCategory?: string
  benefitType?: string
}

const FPL_BAND_ORDER: FplBand[] = [
  'fpl_100',
  'fpl_125',
  'fpl_150',
  'fpl_175',
  'fpl_200',
  'smi_60',
]

/** Clamp the household size to the chart's supported range (1..max). */
function chartSize(size: number, policies: Policies): string {
  const max = policies.fplTiers.max_household_size_on_chart
  const clamped = Math.min(Math.max(Math.trunc(size), 1), max)
  return String(clamped)
}

/**
 * The FPL band an income falls into for this size, or null when above the top
 * (60% SMI) band — i.e. above the cliff.
 */
function bandFor(
  income: number,
  limits: Record<FplBand, number>,
): FplBand | null {
  for (const band of FPL_BAND_ORDER) {
    if (income <= limits[band]) return band
  }
  return null
}

export function cliffData(
  household: Household,
  policies: Policies,
  options: CliffOptions = {},
): CliffData {
  const {
    samples = 48,
    maxMultiple = 1.4,
    housingCategory = 'homeowners_and_non_subsidized_tenants',
    benefitType = 'deliverable_fuel',
  } = options

  const sizeKey = chartSize(household.size, policies)
  const limits = policies.fplTiers.upper_limits_by_household_size[sizeKey]
  const limit60Smi = policies.heap.limit_60_smi_by_household_size[sizeKey]

  // Benefit amount per band for the chosen housing/fuel category. All values
  // come from policy JSON; an unknown category yields an empty map (value 0).
  const benefitByBand =
    policies.fplTiers.benefit_levels_by_band[housingCategory]?.[benefitType] ??
    ({} as Record<FplBand, number>)

  const maxIncome = Math.round(limit60Smi * maxMultiple)

  // Evenly spaced samples, plus two exact points straddling the cliff so the
  // drop renders as a true step rather than a slanted line.
  const incomes = new Set<number>()
  for (let i = 0; i < samples; i++) {
    incomes.add(Math.round((maxIncome * i) / (samples - 1)))
  }
  incomes.add(limit60Smi)
  incomes.add(limit60Smi + 1)

  const data: CliffDatum[] = [...incomes]
    .sort((a, b) => a - b)
    .map((income) => {
      const aboveCliff = income > limit60Smi
      const band = limits ? bandFor(income, limits) : null
      const estimatedValue =
        aboveCliff || band === null ? 0 : (benefitByBand[band] ?? 0)
      return { income, estimatedValue, aboveCliff }
    })

  return {
    limit60Smi,
    householdIncome: household.grossAnnualIncome,
    aboveCliff: household.grossAnnualIncome > limit60Smi,
    data,
  }
}
