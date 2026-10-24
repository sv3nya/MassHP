import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { cliffData } from '../../src/rules/cliff'
import { policies } from '../../src/rules/policies'
import type { Household } from '../../src/rules/types'

/**
 * Property-based tests for the pure cliff-data producer (Requirement 5.1).
 * The cliff series is "estimated yearly energy help vs income" for the
 * household's size: the HEAP grant for each income's FPL band, stepping to
 * zero above the 60% SMI cliff.
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

describe('cliffData — series shape', () => {
  it('samples are ascending by income', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 17 }), (size) => {
        const { data } = cliffData(household({ size }), policies)
        for (let i = 1; i < data.length; i++) {
          expect(data[i].income).toBeGreaterThanOrEqual(data[i - 1].income)
        }
      }),
    )
  })

  it('estimated value is non-increasing as income rises (the cliff)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 17 }), (size) => {
        const { data } = cliffData(household({ size }), policies)
        for (let i = 1; i < data.length; i++) {
          expect(data[i].estimatedValue).toBeLessThanOrEqual(
            data[i - 1].estimatedValue,
          )
        }
      }),
    )
  })

  it('every point above the cliff has zero estimated value', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 17 }), (size) => {
        const { data } = cliffData(household({ size }), policies)
        for (const d of data) {
          if (d.aboveCliff) expect(d.estimatedValue).toBe(0)
        }
      }),
    )
  })

  it('aboveCliff flag matches the 60% SMI line at every sample', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 17 }), (size) => {
        const r = cliffData(household({ size }), policies)
        for (const d of r.data) {
          expect(d.aboveCliff).toBe(d.income > r.limit60Smi)
        }
      }),
    )
  })
})

describe('cliffData — household position', () => {
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
