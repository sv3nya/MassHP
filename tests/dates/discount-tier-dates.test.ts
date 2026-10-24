import { describe, it, expect } from 'vitest'
import { loadPolicies } from '../../src/rules/loadPolicies'
import type { DiscountTier } from '../../src/rules/types'

// README note 4: discount tier 6 steps down on 2027-05-01. These tests pin the
// date boundary at the DATA level against the real policy file.
//
// NOTE: evaluate() does not yet consume effective_from/effective_to (the
// discount step reports eligibility status with estimate: null and no
// percentage). When a future task surfaces the active discount_pct, it should
// use the helper logic asserted here. Until then this test guards the data and
// documents the boundary from README note 4.

const policies = loadPolicies()

/** The tier row whose [effective_from, effective_to] window contains `today`. */
function activeTier(tiers: DiscountTier[], tierNo: number, today: string): DiscountTier | undefined {
  return tiers.find(
    (t) =>
      t.tier === tierNo &&
      today >= t.effective_from &&
      (t.effective_to === null || today <= t.effective_to),
  )
}

describe('National Grid electric tier 6 date boundary (real policy data)', () => {
  const electric = policies.discountRates.utilities['national_grid']?.services?.['electric']

  it('fixture sanity: electric service and tier 6 rows exist', () => {
    expect(electric).toBeDefined()
    const tier6 = electric!.tiers.filter((t) => t.tier === 6)
    expect(tier6.length).toBeGreaterThanOrEqual(2)
  })

  it('on 2027-04-30 tier 6 is the pre-step-down rate (32%)', () => {
    const t = activeTier(electric!.tiers, 6, '2027-04-30')
    expect(t?.discount_pct).toBe(32)
  })

  it('on 2027-05-01 tier 6 steps down (29%)', () => {
    const t = activeTier(electric!.tiers, 6, '2027-05-01')
    expect(t?.discount_pct).toBe(29)
  })
})
