// Imports and validates the six policy JSON files into a typed `Policies`
// object. Fails loudly (throws PolicyError naming file + field) on any missing
// value or missing provenance. No defaults, no placeholders.
//
// The policy JSON is READ-ONLY. This module only reads it.

import heapJson from '../../policies/heap-fy2027.json'
import fplTiersJson from '../../policies/fpl-tiers.json'
import discountRatesJson from '../../policies/discount-rates.json'
import protectionsJson from '../../policies/protections.json'
import aboveCliffJson from '../../policies/above-cliff.json'
import seasonsJson from '../../policies/seasons.json'

import type {
  Policies,
  ProtectionDef,
  AboveCliffProgram,
} from './types'

/** Thrown when a policy file is missing a required value or provenance. */
export class PolicyError extends Error {
  readonly file: string
  readonly field: string

  constructor(file: string, field: string, detail?: string) {
    super(
      `${file}: missing or invalid "${field}"${detail ? ` (${detail})` : ''}`,
    )
    this.name = 'PolicyError'
    this.file = file
    this.field = field
  }
}

type Json = Record<string, unknown>

function requireField(
  file: string,
  obj: Json,
  field: string,
  displayPath?: string,
): unknown {
  const value = obj[field]
  if (value === undefined || value === null || value === '') {
    throw new PolicyError(file, displayPath ?? field)
  }
  return value
}

/** Every policy file must carry source_url and verified_as_of. */
function requireProvenance(file: string, obj: Json): void {
  requireField(file, obj, 'source_url')
  requireField(file, obj, 'verified_as_of')
}

/**
 * Resolve a `season_ref` against the seasons file: every referenced key must
 * exist in seasons.dates. Throws naming the referencing file and the missing
 * season key. (A null date is allowed — the key existing is what we check.)
 */
function resolveSeasonRef(
  referencingFile: string,
  seasonRef: { file: string; keys: Record<string, string> } | undefined,
  seasonDates: Json,
): void {
  if (!seasonRef) return
  for (const seasonKey of Object.values(seasonRef.keys)) {
    if (!(seasonKey in seasonDates)) {
      throw new PolicyError(
        referencingFile,
        `season_ref -> ${seasonKey}`,
        `not found in seasons.json dates`,
      )
    }
  }
}

export function loadPolicies(): Policies {
  const heap = heapJson as Json
  const fplTiers = fplTiersJson as Json
  const discountRates = discountRatesJson as Json
  const protections = protectionsJson as Json
  const aboveCliff = aboveCliffJson as Json
  const seasons = seasonsJson as Json

  // --- Provenance on every file that must carry it ---------------------------
  requireProvenance('heap-fy2027.json', heap)
  requireProvenance('fpl-tiers.json', fplTiers)
  requireProvenance('protections.json', protections)
  // discount-rates.json carries provenance per-utility; above-cliff per-program.

  // --- HEAP ------------------------------------------------------------------
  const smiLimits = requireField(
    'heap-fy2027.json',
    heap,
    'limit_60_smi_by_household_size',
  ) as Record<string, number>
  const heapApply = requireField('heap-fy2027.json', heap, 'apply') as Json
  requireField('heap-fy2027.json', heapApply, 'heatline')

  // --- FPL tiers -------------------------------------------------------------
  requireField('fpl-tiers.json', fplTiers, 'upper_limits_by_household_size')
  requireField('fpl-tiers.json', fplTiers, 'benefit_levels_by_band')
  requireField('fpl-tiers.json', fplTiers, 'max_household_size_on_chart')

  // --- Discount rates --------------------------------------------------------
  requireField('discount-rates.json', discountRates, 'tier_to_band')
  const utilities = requireField(
    'discount-rates.json',
    discountRates,
    'utilities',
  ) as Record<string, Json>
  // A published utility must carry provenance; pending/varies/unknown must
  // carry a message_key so the UI can show the "ask your utility" path.
  for (const [id, util] of Object.entries(utilities)) {
    const status = requireField(
      'discount-rates.json',
      util,
      'status',
      `utilities.${id}.status`,
    )
    if (status === 'published') {
      requireField(
        'discount-rates.json',
        util,
        'source_url',
        `utilities.${id}.source_url`,
      )
      requireField(
        'discount-rates.json',
        util,
        'verified_as_of',
        `utilities.${id}.verified_as_of`,
      )
      requireField(
        'discount-rates.json',
        util,
        'services',
        `utilities.${id}.services`,
      )
    } else if (util['message_key'] === undefined) {
      throw new PolicyError(
        'discount-rates.json',
        `utilities.${id}.message_key`,
        `a non-published utility (status "${String(status)}") must carry a message_key`,
      )
    }
  }

  // --- Seasons ---------------------------------------------------------------
  const seasonDates = requireField('seasons.json', seasons, 'dates') as Json

  // --- Protections (validate + resolve every season_ref) ---------------------
  const protectionList = requireField(
    'protections.json',
    protections,
    'protections',
  ) as ProtectionDef[]
  const protectionContacts = requireField(
    'protections.json',
    protections,
    'contacts',
  ) as Json
  requireField('protections.json', protectionContacts, 'heatline')
  for (const p of protectionList) {
    requireField('protections.json', p as unknown as Json, 'id')
    requireField('protections.json', p as unknown as Json, 'what_to_say_key')
    resolveSeasonRef('protections.json', p.season_ref, seasonDates)
  }

  // --- Above-cliff (per-program provenance + season_ref) ---------------------
  const programs = requireField(
    'above-cliff.json',
    aboveCliff,
    'programs',
  ) as AboveCliffProgram[]
  for (const prog of programs) {
    const p = prog as unknown as Json
    requireField('above-cliff.json', p, 'id')
    requireProvenance('above-cliff.json', p)
    requireField('above-cliff.json', p, 'next_step_key')
    resolveSeasonRef(
      'above-cliff.json',
      p['season_ref'] as
        | { file: string; keys: Record<string, string> }
        | undefined,
      seasonDates,
    )
  }

  // Touch the SMI limits so an empty object is caught early.
  if (Object.keys(smiLimits).length === 0) {
    throw new PolicyError(
      'heap-fy2027.json',
      'limit_60_smi_by_household_size',
      'no household sizes defined',
    )
  }

  return {
    heap: heapJson,
    fplTiers: fplTiersJson,
    discountRates: discountRatesJson,
    protections: protectionsJson,
    aboveCliff: aboveCliffJson,
    seasons: seasonsJson,
  } as unknown as Policies
}
