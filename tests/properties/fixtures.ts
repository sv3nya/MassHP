// Fixture Policies for property tests. These are deliberately simple and
// self-consistent so properties test the ENGINE, not the live policy values.
// Property tests must never depend on the real /policies numbers.

import type { Policies } from '../../src/rules/types'

export const HEATLINE = '1-800-632-8175'
export const SRC = 'https://example.test/source'
export const VERIFIED = '2026-10-24'

/**
 * A minimal, internally consistent policy set for one household size bucket.
 * Sizes 1..3 share the same simple thresholds so property math stays easy.
 */
export function makeFixturePolicies(
  overrides?: Partial<{ nationalGridStatus: 'published' | 'pending' }>,
): Policies {
  const status = overrides?.nationalGridStatus ?? 'published'

  const smiBySize: Record<string, number> = { '1': 40000, '2': 50000, '3': 60000 }
  const fplBySize: Record<string, Record<string, number>> = {
    '1': { fpl_100: 15000, fpl_125: 18000, fpl_150: 21000, fpl_175: 24000, fpl_200: 27000, smi_60: 40000 },
    '2': { fpl_100: 20000, fpl_125: 24000, fpl_150: 28000, fpl_175: 32000, fpl_200: 36000, smi_60: 50000 },
    '3': { fpl_100: 25000, fpl_125: 30000, fpl_150: 35000, fpl_175: 40000, fpl_200: 45000, smi_60: 60000 },
  }

  return {
    heap: {
      program_id: 'heap',
      name: 'HEAP',
      fiscal_year: 'FY-TEST',
      limit_60_smi_by_household_size: smiBySize,
      apply: { online: SRC, agency_lookup: SRC, heatline: HEATLINE },
      source_url: SRC,
      verified_as_of: VERIFIED,
    },
    fplTiers: {
      program_id: 'fpl_tiers',
      upper_limits_by_household_size: fplBySize as never,
      benefit_levels_by_band: {},
      max_household_size_on_chart: 3,
      source_url: SRC,
      verified_as_of: VERIFIED,
    },
    discountRates: {
      program_id: 'discount_rate',
      tier_to_band: {
        '1': 'fpl_100',
        '2': 'fpl_125',
        '3': 'fpl_150',
        '4': 'fpl_175',
        '5': 'fpl_200',
        '6': 'smi_60',
      },
      utilities: {
        national_grid: {
          status,
          display_name: 'National Grid',
          message_key: status === 'pending' ? 'discount.pending.ask' : undefined,
          services: {
            electric: {
              rate_code_standard: 'R-1',
              rate_code_discount: 'R-2',
              tiers: [
                { tier: 1, discount_pct: 90, effective_from: '2026-11-01', effective_to: null },
              ],
            },
          },
          // provenance (read via a loose cast in the engine)
          ...(status === 'published'
            ? { source_url: SRC, verified_as_of: VERIFIED }
            : {}),
        } as never,
        municipal_light_plant: {
          status: 'varies',
          display_name: 'Municipal light plant',
          message_key: 'discount.mlp.ask_light_plant',
        },
        not_sure: {
          status: 'unknown',
          display_name: 'Not sure',
          message_key: 'discount.unknown.check_bill',
        },
      },
    },
    protections: {
      program_id: 'shutoff_protections',
      protections: [
        {
          id: 'winter_moratorium',
          name: 'Winter Moratorium',
          screener_trigger: 'any household',
          requires_financial_hardship: true,
          requires_action: true,
          what_to_say_key: 'protect.moratorium.script',
          applies_to_municipal_light_plants: true,
          season_ref: {
            file: 'seasons.json',
            keys: { start: 'moratorium_start', end: 'moratorium_end', extended_to: 'moratorium_extended_to' },
          },
        },
        {
          id: 'prior_winter_heap_presumption',
          name: 'Prior-winter HEAP presumption',
          screener_trigger: 'got_heap_last_winter = yes',
          requires_financial_hardship: false,
          requires_action: true,
          what_to_say_key: 'protect.heap_presumption.script',
          applies_to_municipal_light_plants: true,
        },
        {
          id: 'infant',
          name: 'Infant',
          screener_trigger: 'infant_under_12_months = yes',
          requires_financial_hardship: true,
          requires_action: true,
          what_to_say_key: 'protect.infant.script',
          applies_to_municipal_light_plants: true,
        },
        {
          id: 'serious_illness',
          name: 'Serious illness',
          screener_trigger: 'serious_illness = yes',
          requires_financial_hardship: true,
          requires_action: true,
          what_to_say_key: 'protect.illness.script',
          applies_to_municipal_light_plants: true,
        },
        {
          id: 'elderly_with_minor',
          name: 'Elderly with minor',
          screener_trigger: 'all_adults_65_plus = yes AND minor_in_home = yes',
          requires_financial_hardship: true,
          requires_action: true,
          what_to_say_key: 'protect.elderly_minor.script',
          applies_to_municipal_light_plants: true,
        },
        {
          id: 'all_residents_65_plus',
          name: 'All residents 65+',
          screener_trigger: 'all_residents_65_plus = yes',
          requires_financial_hardship: false,
          requires_action: true,
          what_to_say_key: 'protect.all_65.script',
          applies_to_municipal_light_plants: true,
        },
      ],
      contacts: { heatline: HEATLINE },
      source_url: SRC,
      verified_as_of: VERIFIED,
    },
    aboveCliff: {
      program_id: 'above_cliff',
      statewide_contacts: { heatline: HEATLINE, source_url: SRC },
      programs: [
        {
          id: 'good_neighbor',
          name: 'Good Neighbor',
          income_limits_by_household_size: {
            '1': { min: 40001, max: 55000 },
            '2': { min: 50001, max: 70000 },
            '3': { min: 60001, max: 85000 },
          },
          status_if_in_band: 'possible',
          next_step_key: 'abovecliff.good_neighbor.next_step',
          source_url: SRC,
          verified_as_of: VERIFIED,
        },
        {
          id: 'middle_income_oil_relief',
          name: 'Oil relief',
          income_limits_by_household_size: {
            '1': { min: 40001, max_exclusive: 70000 },
            '2': { min: 50001, max_exclusive: 90000 },
            '3': { min: 60001, max_exclusive: 110000 },
          },
          status_if_in_band: 'possible',
          next_step_key: 'abovecliff.oil_relief.next_step',
          source_url: SRC,
          verified_as_of: VERIFIED,
        },
      ],
    },
    seasons: {
      program_id: 'seasons',
      dates: {
        moratorium_start: { date: '2026-11-15' },
        moratorium_end: { date: '2027-03-15' },
        moratorium_extended_to: { date: null },
        heap_presumption_end: { date: '2027-01-01' },
      },
      rules: {
        moratorium_effective_end: 'use moratorium_extended_to if not null, else moratorium_end',
        all_ranges_inclusive: true,
      },
    },
  }
}
