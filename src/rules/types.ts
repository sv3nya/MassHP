/**
 * Shared types for the Heat Path rules engine.
 *
 * These mirror the canonical contract in `.kiro/specs/heat-path/design.md`
 * (§ Types) and requirements.md (R1, R2). The engine is a pure function
 * `evaluate(household, today, policies) -> ChainResult` with no clock access,
 * no I/O, and no randomness; `today` is an injected ISO date string.
 *
 * The result shape carries structured data (ids, statuses, next-step keys,
 * source refs) rather than display strings, so advocate mode can reuse the
 * engine unchanged.
 */

// ---------------------------------------------------------------------------
// Household (screening answers) — requirements.md R1.1
// ---------------------------------------------------------------------------

/** Utility options offered by the screener (R1.2). */
export type Utility = 'national_grid' | 'municipal_light_plant' | 'not_sure'

export type HeatingFuel = 'gas' | 'electric' | 'oil' | 'propane' | 'other'

/** Categorical benefits that can unlock later programs in the chain. */
export type Benefit =
  | 'snap'
  | 'masshealth'
  | 'tafdc'
  | 'eaedc'
  | 'ssi'
  | 'public_housing'
  | 'heap'

export type TriState = 'yes' | 'no' | 'not_sure'

export interface Household {
  size: number
  grossAnnualIncome: number
  utility: Utility
  heatingFuel: HeatingFuel
  benefits: Benefit[]
  behindOnBills: boolean
  heapLastWinter: TriState
  /** "Does anyone under 18 live with you?" — distinguishes the two 65+ rules. */
  anyoneUnder18: boolean
  // Optional protection questions (skippable; R1.3).
  infantUnder12mo?: boolean
  allAdults65Plus?: boolean
  seriousIllness?: boolean
  /** Optional bill-check input (R6). */
  rateCode?: string
}

// ---------------------------------------------------------------------------
// Chain steps and result — design.md § Types
// ---------------------------------------------------------------------------

export type StepStatus = 'likely' | 'possible' | 'not_likely' | 'ask_provider'

export interface ChainStep {
  programId: string
  status: StepStatus
  /** programIds or benefit ids that enabled this step. */
  unlockedBy: string[]
  /** i18n key for the next concrete step. */
  nextStepKey: string
  /** Estimate range in whole dollars, or null to omit the figure (R3.2). */
  estimate: { low: number; high: number } | null
  /** Official source + verified-as-of, copied from the owning policy (R2.7). */
  sourceUrl: string
  verifiedAsOf: string
  /** Every protection requires action; no "no action needed" (R4.4). */
  requiresAction: boolean
}

export interface CliffInfo {
  limit60Smi: number
  householdIncome: number
}

export interface BillCheckFlag {
  onStandardRate: boolean
  messageKey: string
}

export interface ChainResult {
  /** The linked chain in dependency order: HEAP -> discount -> AMP -> Mass Save. */
  steps: ChainStep[]
  protections: ChainStep[]
  aboveCliff: ChainStep[]
  cliff: CliffInfo
  /** Heatline number, sourced from policies (R7.1). */
  heatline: string
  billCheckFlag?: BillCheckFlag
}

/** FPL band identifiers, mirroring policies/fpl-tiers.json band names. */
export type IncomeBand =
  | 'fpl_100'
  | 'fpl_125'
  | 'fpl_150'
  | 'fpl_175'
  | 'fpl_200'
  | 'smi_60'
  | 'above_cliff'

// ---------------------------------------------------------------------------
// Policies — loosely typed JSON shapes the engine reads
// ---------------------------------------------------------------------------

export interface Policies {
  heap: HeapPolicy
  fplTiers: FplTiersPolicy
  discountRates: DiscountRatesPolicy
  aboveCliff: AboveCliffPolicy
  protections: ProtectionsPolicy
  seasons: SeasonsPolicy
}

export interface HeapPolicy {
  limit_60_smi_by_household_size: Record<string, number>
  apply: { heatline: string } & Record<string, unknown>
  source_url: string
  verified_as_of: string
}

export interface FplTiersPolicy {
  upper_limits_by_household_size: Record<string, Record<string, number>>
  benefit_levels_by_band: Record<
    string,
    Record<string, Record<string, number>>
  >
  source_url: string
  verified_as_of: string
}

export interface DiscountRatesPolicy {
  tier_to_band: Record<string, string>
  utilities: Record<
    string,
    {
      status: string
      display_name: string
      message_key?: string
      services?: Record<string, unknown>
      source_url?: string
      verified_as_of?: string
    }
  >
}

export interface AboveCliffPolicy {
  statewide_contacts: { heatline: string } & Record<string, unknown>
  programs: Array<{
    id: string
    income_limits_by_household_size?: Record<
      string,
      { min: number; max?: number; max_exclusive?: number }
    >
    eligible_fuels?: string | string[]
    excludes_if?: string[]
    benefit_max?: number | null
    next_step_key?: string
    source_url: string
    verified_as_of: string
  }>
}

export interface ProtectionsPolicy {
  protections: Array<{
    id: string
    screener_trigger: string
    requires_financial_hardship?: boolean
    what_to_say_key: string
    citation: string
  }>
  contacts: { heatline: string } & Record<string, unknown>
  source_url: string
  verified_as_of: string
}

export interface SeasonsPolicy {
  dates: Record<
    string,
    { date: string | null; month?: string; source_ref?: string }
  >
}
