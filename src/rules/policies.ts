import aboveCliff from '../../policies/above-cliff.json'
import discountRates from '../../policies/discount-rates.json'
import fplTiers from '../../policies/fpl-tiers.json'
import heap from '../../policies/heap-fy2027.json'
import protections from '../../policies/protections.json'
import seasons from '../../policies/seasons.json'
import type { Policies } from './types'

/**
 * Loads the policy JSON from /policies into the shape the rules engine
 * expects. All policy numbers live in the JSON files; this module only
 * assembles them. The engine itself takes `policies` as an argument so it
 * stays pure and testable with fixture data.
 */
export const policies: Policies = {
  heap: heap as unknown as Policies['heap'],
  fplTiers: fplTiers as unknown as Policies['fplTiers'],
  discountRates: discountRates as unknown as Policies['discountRates'],
  aboveCliff: aboveCliff as unknown as Policies['aboveCliff'],
  protections: protections as unknown as Policies['protections'],
  seasons: seasons as unknown as Policies['seasons'],
}
