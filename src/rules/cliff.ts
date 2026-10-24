import type { FplTiersPolicy, Household, IncomeBand, Policies } from './types'

/**
 * Pure producer of cliff-chart data (design.md § cliff.ts, Requirement 5).
 *
 * For a given household size, it produces the series the chart renders:
 * estimated yearly energy-assistance value versus income, plus the 60% SMI
 * reference line. Above the 60% SMI line the linked chain largely drops away,
 * so the estimated value falls to zero — this is the "cliff" the chart makes
 * visible.
 *
 * Pure and fully policy-driven: every threshold and dollar amount is read
 * from `policies`; there are no numeric literals here. The function takes
 * `policies` as an argument (never imports the JSON) so it stays testable
 * with fixture data.
 */

export interface CliffDatum {
  /** Annual income at this sample point, in whole dollars. */
  income: number
  /**
   * Estimated yearly energy-assistance value (the chain's worth) at this
   * income, in whole dollars. Drops to 0 once income is above the cliff.
   */
  estimatedValue: number
  /** True once income is above the 60% SMI cliff line. */
  aboveCliff: boolean
}

export interface CliffChartData {
  /** The 60% SMI cliff line (annual dollars) for this household size. */
  limit60Smi: number
  /** The household's own income, so the chart can mark their position. */
  householdIncome: number
  /** Sampled series across the income range, ascending by income. */
  data: CliffDatum[]
}

export interface CliffOptions {
  /** Number of sample points (default 48). */
  samples?: number
  /** Upper bound as a multiple of the cliff income (default 1.4). */
  maxMultiple?: number
  /**
   * Housing/benefit category used to read benefit amounts. Defaults to the
   * homeowner/non-subsidized deliverable-fuel column, the headline estimate.
   */
  housingCategory?: string
  benefitType?: string
}

const FPL_BAND_ORDER: Exclude<IncomeBand, 'above_cliff'>[] = [
  'fpl_100',
  'fpl_125',
  'fpl_150',
  'fpl_175',
  'fpl_200',
  'smi_60',
]

/**
 * Build cliff-chart data for a household. Varies income across the range and,
 * at each point, looks up the estimated chain value (HEAP benefit for the
 * income's FPL band) from policies — zero above the cliff. Places exact
 * samples on each side of the cliff so the drop renders as a true step.
 */
export function cliffData(
  household: Household,
  policies: Policies,
  options: CliffOptions = {},
): CliffChartData {
  const {
    samples = 48,
    maxMultiple = 1.4,
    housingCategory = 'homeowners_and_non_subsidized_tenants',
    benefitType = 'deliverable_fuel',
  } = options

  const fplTiers = policies.fplTiers
  const sizeKey = clampSizeKey(household.size, fplTiers)
  const limits = fplTiers.upper_limits_by_household_size[sizeKey]
  const limit60Smi = limits['smi_60']

  const benefitByBand =
    fplTiers.benefit_levels_by_band[housingCategory]?.[benefitType] ?? {}

  const maxIncome = Math.round(limit60Smi * maxMultiple)
  const incomes = new Set<number>()
  for (let i = 0; i < samples; i++) {
    incomes.add(Math.round((maxIncome * i) / (samples - 1)))
  }
  // Exact points straddling the cliff so the step is sharp.
  incomes.add(limit60Smi)
  incomes.add(limit60Smi + 1)

  const data: CliffDatum[] = [...incomes]
    .sort((a, b) => a - b)
    .map((income) => {
      const aboveCliff = income > limit60Smi
      const band = bandFor(income, limits)
      const estimatedValue =
        aboveCliff || band === 'above_cliff'
          ? 0
          : (benefitByBand[band] ?? 0)
      return { income, estimatedValue, aboveCliff }
    })

  return { limit60Smi, householdIncome: household.grossAnnualIncome, data }
}

function bandFor(income: number, limits: Record<string, number>): IncomeBand {
  for (const band of FPL_BAND_ORDER) {
    const upper = limits[band]
    if (typeof upper === 'number' && income <= upper) return band
  }
  return 'above_cliff'
}

/** Clamp a household size to the largest published row in the FPL table. */
function clampSizeKey(size: number, fplTiers: FplTiersPolicy): string {
  const table = fplTiers.upper_limits_by_household_size
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
