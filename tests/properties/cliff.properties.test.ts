import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { cliffData } from '../../src/rules/cliff'
import { policies } from '../../src/rules/policies'
import type { Household } from '../../src/rules/types'

/**
 * Property-based tests for the pure cliff-data producer. These restore the
 * cliff coverage that was dropped when the remote `evaluate.test.ts` (which
 * asserted a now-rejected `.data`/`estimatedValue` series) was removed during
 * the merge. They assert the LOCAL cliff contract: ascending FPL-band markers,
 * a correct 60% SMI line, and the aboveCliff boundary.
 *
 * Per project rules: a failing property means the code (or a requirement) is
 * wrong — never weaken the property to make it pass.
 */

function household(patch: Partial<Household> = {}): Household {
  return {
    size: 4,
    grossAnnualIncome: 20_000,
    utility: 'national_grid',
    heatingFuel: 'gas',
    benefits: [],
    behindOnBills: false,
    heapLastWinter: 'no',
    anyoneUnder18: false,
    ...patch,
  }
}

describe('cliffData — markers', () => {
  it('FPL band markers are non-decreasing (thresholds rise with the band)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 17 }), (size) => {
        const { markers } = cliffData(household({ size }), policies)
        for (let i = 1; i < markers.length; i++) {
          expect(markers[i].value).toBeGreaterThanOrEqual(markers[i - 1].value)
        }
      }),
    )
  })

  it('the top marker is the 60% SMI band', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 17 }), (size) => {
        const { markers } = cliffData(household({ size }), policies)
        if (markers.length > 0) {
          expect(markers[markers.length - 1].id).toBe('smi_60')
        }
      }),
    )
  })
})

describe('cliffData — cliff boundary', () => {
  it('aboveCliff is true exactly when income exceeds the 60% SMI line', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 17 }),
        fc.integer({ min: 0, max: 400_000 }),
        (size, income) => {
          const r = cliffData(
            household({ size, grossAnnualIncome: income }),
            policies,
          )
          expect(r.aboveCliff).toBe(income > r.limit60Smi)
        },
      ),
    )
  })

  it('householdIncome round-trips unchanged', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 400_000 }), (income) => {
        const r = cliffData(household({ grossAnnualIncome: income }), policies)
        expect(r.householdIncome).toBe(income)
      }),
    )
  })

  it('is pure/deterministic for the same input', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 17 }),
        fc.integer({ min: 0, max: 400_000 }),
        (size, income) => {
          const h = household({ size, grossAnnualIncome: income })
          expect(JSON.stringify(cliffData(h, policies))).toBe(
            JSON.stringify(cliffData(h, policies)),
          )
        },
      ),
    )
  })
})
