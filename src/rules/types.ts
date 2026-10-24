// Core contract for the Heat Path rules engine.
// This is the data shape the UI renders and the engine produces. It is the
// frozen handoff between the engine track and the UI track (Task 1).

// ---------------------------------------------------------------------------
// Household input (from the screener)
// ---------------------------------------------------------------------------

export type Utility = 'national_grid' | 'municipal_light_plant' | 'not_sure'

export type HeatingFuel = 'gas' | 'electric' | 'oil' | 'propane' | 'other'

export type Benefit =
  | 'snap'
  | 'masshealth'
  | 'tafdc'
  | 'eaedc'
  | 'ssi'
  | 'public_housing'
  | 'heap'

export interface Household {
  size: number
  grossAnnualIncome: number
  utility: Utility
  heatingFuel: HeatingFuel
  benefits: Benefit[]
  behindOnBills: boolean
  heapLastWinter: 'yes' | 'no' | 'not_sure'
  // Required. Whether a person under 18 lives in the home. Distinguishes the
  // two age-65+ protections (elderly_with_minor vs all_residents_65_plus).
  anyoneUnder18: boolean
  // Optional protection questions (skippable in the screener).
  infantUnder12mo?: boolean
  allAdults65Plus?: boolean
  seriousIllness?: boolean
  rateCode?: string
}

// ---------------------------------------------------------------------------
// Engine output
// ---------------------------------------------------------------------------

export type StepStatus = 'likely' | 'possible' | 'not_likely' | 'ask_provider'

export interface ChainStep {
  programId: string
  status: StepStatus
  unlockedBy: string[] // programIds or benefit ids
  nextStepKey: string // i18n key
  estimate: { low: number; high: number } | null
  sourceUrl: string
  verifiedAsOf: string
  requiresAction: boolean
}

export interface ChainResult {
  steps: ChainStep[] // dependency order
  protections: ChainStep[]
  aboveCliff: ChainStep[]
  cliff: { limit60Smi: number; householdIncome: number }
  heatline: string // from policies
  billCheckFlag?: { onStandardRate: boolean; messageKey: string }
}

// ---------------------------------------------------------------------------
// Policy file shapes (validated by loadPolicies).
// These mirror the hand-authored JSON in /policies. They are READ-ONLY data;
// the engine reads only through the validated `Policies` object.
// ---------------------------------------------------------------------------

/** Fields every policy file must expose for provenance. */
export interface Provenance {
  source_url: string
  verified_as_of: string
}

export interface HeapPolicy extends Provenance {
  program_id: string
  name: string
  fiscal_year: string
  limit_60_smi_by_household_size: Record<string, number>
  apply: { online: string; agency_lookup: string; heatline: string }
}

export type FplBand =
  | 'fpl_100'
  | 'fpl_125'
  | 'fpl_150'
  | 'fpl_175'
  | 'fpl_200'
  | 'smi_60'

export interface FplTiersPolicy extends Provenance {
  program_id: string
  upper_limits_by_household_size: Record<string, Record<FplBand, number>>
  benefit_levels_by_band: Record<
    string,
    Record<string, Record<FplBand, number>>
  >
  max_household_size_on_chart: number
}

export type UtilityStatus = 'published' | 'pending' | 'varies' | 'unknown'

export interface DiscountTier {
  tier: number
  discount_pct: number
  effective_from: string
  effective_to: string | null
}

export interface DiscountService {
  rate_code_standard: string
  rate_code_discount: string
  tiers: DiscountTier[]
}

export interface DiscountUtility {
  status: UtilityStatus
  display_name: string
  services?: Record<string, DiscountService>
  message_key?: string
  tiers?: DiscountTier[]
}

export interface DiscountRatesPolicy {
  program_id: string
  tier_to_band: Record<string, FplBand>
  utilities: Record<string, DiscountUtility>
}

export interface SeasonDate {
  date: string | null
  month?: string
}

export interface SeasonsPolicy {
  program_id: string
  dates: Record<string, SeasonDate>
  rules: { moratorium_effective_end: string; all_ranges_inclusive: boolean }
}

export interface ProtectionDef {
  id: string
  name: string
  screener_trigger: string
  requires_financial_hardship: boolean
  requires_action: boolean
  what_to_say_key: string
  applies_to_municipal_light_plants: boolean
  season_ref?: { file: string; keys: Record<string, string> }
}

export interface ProtectionsPolicy extends Provenance {
  program_id: string
  protections: ProtectionDef[]
  contacts: { heatline: string }
}

export interface AboveCliffProgram extends Provenance {
  id: string
  name: string
  income_limits_by_household_size: Record<
    string,
    { min: number; max?: number; max_exclusive?: number }
  >
  status_if_in_band: string
  next_step_key: string
}

export interface AboveCliffPolicy {
  program_id: string
  statewide_contacts: { heatline: string; source_url: string }
  programs: AboveCliffProgram[]
}

/** The validated, in-memory shape of all six policy files. */
export interface Policies {
  heap: HeapPolicy
  fplTiers: FplTiersPolicy
  discountRates: DiscountRatesPolicy
  protections: ProtectionsPolicy
  aboveCliff: AboveCliffPolicy
  seasons: SeasonsPolicy
}
