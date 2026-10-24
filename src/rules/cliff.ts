// Pure producer of cliff-chart data. No Date.now(), no fetch, no globals, no
// randomness. All numbers come from policies.
//
// Design decision (confirmed): there is no "estimated yearly energy cost"
// figure in any policy file, and inventing one would violate the no-literals
// rule. So the cliff data charts the household's income against the real
// policy thresholds: the 60% SMI cliff line, the FPL band upper limits, and
// the above-cliff program income band(s). No fabricated cost curve.

import type { Household, Policies, FplBand } from './types'

export interface CliffMarker {
  /** Stable id for the reference line (e.g. "smi_60", "fpl_100"). */
  id: string
  /** Human-facing label is resolved in the UI via i18n; this is the raw key. */
  labelKey: string
  /** Dollar value of the threshold for this household size. */
  value: number
}

export interface CliffData {
  householdIncome: number
  /** The 60% SMI cliff line for this household size. */
  limit60Smi: number
  /** Whether the household sits above the 60% SMI cliff. */
  aboveCliff: boolean
  /** FPL band threshold markers (fpl_100 .. smi_60) for this size, ascending. */
  markers: CliffMarker[]
  /** Above-cliff program income bands for this size (if any apply). */
  aboveCliffBands: Array<{ programId: string; min: number; max: number | null }>
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

export function cliffData(household: Household, policies: Policies): CliffData {
  const sizeKey = chartSize(household.size, policies)
  const income = household.grossAnnualIncome

  const limits = policies.fplTiers.upper_limits_by_household_size[sizeKey]
  const limit60Smi = policies.heap.limit_60_smi_by_household_size[sizeKey]

  const markers: CliffMarker[] = limits
    ? FPL_BAND_ORDER.map((band) => ({
        id: band,
        labelKey: `cliff.band.${band}`,
        value: limits[band],
      }))
    : []

  const aboveCliff = income > limit60Smi

  const aboveCliffBands: CliffData['aboveCliffBands'] = []
  for (const program of policies.aboveCliff.programs) {
    const band = program.income_limits_by_household_size[sizeKey]
    if (!band) continue
    const max = band.max ?? band.max_exclusive ?? null
    aboveCliffBands.push({ programId: program.id, min: band.min, max })
  }

  return {
    householdIncome: income,
    limit60Smi,
    aboveCliff,
    markers,
    aboveCliffBands,
  }
}
