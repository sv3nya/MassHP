import { describe, it, expect } from 'vitest'
import { loadPolicies, PolicyError } from '../src/rules/loadPolicies'

describe('loadPolicies', () => {
  it('loads and validates the real policy files without throwing', () => {
    const policies = loadPolicies()
    expect(policies.heap.program_id).toBe('heap')
    expect(policies.heap.apply.heatline).toBe('1-800-632-8175')
    expect(policies.fplTiers.max_household_size_on_chart).toBe(17)
    expect(policies.discountRates.utilities['national_grid']?.status).toBe(
      'published',
    )
  })

  it('resolves every protection and above-cliff season_ref', () => {
    // If any season_ref pointed at a missing key, loadPolicies would throw.
    const policies = loadPolicies()
    expect(policies.protections.protections.length).toBeGreaterThan(0)
    expect(policies.aboveCliff.programs.length).toBeGreaterThan(0)
  })

  it('exports a typed PolicyError for the fail-loud path', () => {
    expect(PolicyError).toBeTypeOf('function')
  })
})
