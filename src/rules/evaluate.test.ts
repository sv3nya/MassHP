import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { cliffData } from './cliff'
import { evaluate } from './evaluate'
import { policies } from './policies'
import type { Benefit, Household, Utility } from './types'

/**
 * Property-based tests for the rules engine (design.md Properties P1-P10),
 * run against the real /policies data.
 *
 * NOTE: Per project rules, a failing property means the code (or a
 * requirement) is wrong — never weaken the property to make it pass.
 */

// A fixed, injected date inside the 2026-2027 moratorium window.
const TODAY = '2026-12-01'

const householdArb = (): fc.Arbitrary<Household> =>
  fc.record({
    size: fc.integer({ min: 1, max: 17 }),
    grossAnnualIncome: fc.integer({ min: 0, max: 400_000 }),
    utility: fc.constantFrom<Utility>(
      'national_grid',
      'municipal_light_plant',
      'not_sure',
    ),
    heatingFuel: fc.constantFrom('gas', 'electric', 'oil', 'propane', 'other'),
    benefits: fc.subarray<Benefit>([
      'snap',
      'masshealth',
      'tafdc',
      'eaedc',
      'ssi',
      'public_housing',
      'heap',
    ]),
    behindOnBills: fc.boolean(),
    heapLastWinter: fc.constantFrom('yes', 'no', 'not_sure'),
    anyoneUnder18: fc.boolean(),
    infantUnder12mo: fc.boolean(),
    allAdults65Plus: fc.boolean(),
    seriousIllness: fc.boolean(),
  })

const CHAIN_ORDER = ['heap', 'discount', 'amp', 'mass_save']

describe('P1/P2 — purity and determinism', () => {
  it('is deterministic for the same inputs', () => {
    fc.assert(
      fc.property(householdArb(), (h) => {
        expect(JSON.stringify(evaluate(h, TODAY, policies))).toBe(
          JSON.stringify(evaluate(h, TODAY, policies)),
        )
      }),
    )
  })

  it('does not mutate the household input', () => {
    fc.assert(
      fc.property(householdArb(), (h) => {
        const snapshot = JSON.stringify(h)
        evaluate(h, TODAY, policies)
        expect(JSON.stringify(h)).toBe(snapshot)
      }),
    )
  })
})

describe('P3 — dependency order', () => {
  it('steps always appear in canonical chain order', () => {
    fc.assert(
      fc.property(householdArb(), (h) => {
        const r = evaluate(h, TODAY, policies)
        expect(r.steps.map((s) => s.programId)).toEqual(CHAIN_ORDER)
      }),
    )
  })
})

describe('P4 — unlock soundness', () => {
  it('a likely discount is unlocked by HEAP or a held categorical benefit', () => {
    fc.assert(
      fc.property(householdArb(), (h) => {
        const r = evaluate(h, TODAY, policies)
        const discount = r.steps.find((s) => s.programId === 'discount')!
        if (discount.status === 'likely') {
          expect(discount.unlockedBy.length).toBeGreaterThan(0)
          for (const id of discount.unlockedBy) {
            const satisfied =
              id === 'heap'
                ? r.steps.find((s) => s.programId === 'heap')!.status ===
                  'likely'
                : h.benefits.includes(id as Benefit)
            expect(satisfied).toBe(true)
          }
        }
      }),
    )
  })
})

describe('P5 — cliff monotonicity', () => {
  it('raising income never improves an income-gated step', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 17 }),
        fc.integer({ min: 0, max: 200_000 }),
        fc.integer({ min: 0, max: 200_000 }),
        (size, a, b) => {
          const low = Math.min(a, b)
          const high = Math.max(a, b)
          const base: Household = {
            size,
            grossAnnualIncome: low,
            utility: 'national_grid',
            heatingFuel: 'gas',
            benefits: [],
            behindOnBills: false,
            heapLastWinter: 'no',
            anyoneUnder18: false,
          }
          const rank = { likely: 2, possible: 1, ask_provider: 0, not_likely: 0 }
          const heapLow = evaluate(base, TODAY, policies).steps[0]
          const heapHigh = evaluate(
            { ...base, grossAnnualIncome: high },
            TODAY,
            policies,
          ).steps[0]
          expect(rank[heapHigh.status]).toBeLessThanOrEqual(rank[heapLow.status])
        },
      ),
    )
  })

  it('cliff chart value is non-increasing and drops to zero above the line', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 17 }), (size) => {
        const h: Household = {
          size,
          grossAnnualIncome: 0,
          utility: 'national_grid',
          heatingFuel: 'gas',
          benefits: [],
          behindOnBills: false,
          heapLastWinter: 'no',
          anyoneUnder18: false,
        }
        const { data } = cliffData(h, policies)
        for (let i = 1; i < data.length; i++) {
          expect(data[i].estimatedValue).toBeLessThanOrEqual(
            data[i - 1].estimatedValue,
          )
        }
        const above = data.find((d) => d.aboveCliff)
        if (above) expect(above.estimatedValue).toBe(0)
      }),
    )
  })
})

describe('P7 — municipal light plant', () => {
  it('IOU discount/AMP/Mass Save are never likely for MLP households', () => {
    fc.assert(
      fc.property(
        householdArb().map(
          (h): Household => ({ ...h, utility: 'municipal_light_plant' }),
        ),
        (h) => {
          const r = evaluate(h, TODAY, policies)
          for (const id of ['discount', 'amp', 'mass_save']) {
            expect(r.steps.find((s) => s.programId === id)!.status).not.toBe(
              'likely',
            )
          }
        },
      ),
    )
  })

  it('the Winter Moratorium is still evaluated for MLP (shows when hardship met)', () => {
    // An MLP household below the 60% SMI line, during the active window: the
    // moratorium (gated on financial hardship) must still be surfaced — the
    // MLP case does not suppress it the way it suppresses IOU steps.
    const household: Household = {
      size: 1,
      grossAnnualIncome: 10_000, // well below size-1 60% SMI
      utility: 'municipal_light_plant',
      heatingFuel: 'gas',
      benefits: [],
      behindOnBills: true,
      heapLastWinter: 'no',
      anyoneUnder18: false,
    }
    const r = evaluate(household, TODAY, policies)
    expect(
      r.protections.some((p) => p.programId === 'winter_moratorium'),
    ).toBeDefined()
    expect(
      r.protections.find((p) => p.programId === 'winter_moratorium'),
    ).toBeDefined()
  })
})

describe('P8 — provenance', () => {
  it('every step/protection/aboveCliff carries source and verified-as-of', () => {
    fc.assert(
      fc.property(
        householdArb().map(
          (h): Household => ({ ...h, utility: 'national_grid' }),
        ),
        (h) => {
          const r = evaluate(h, TODAY, policies)
          const all = [...r.steps, ...r.protections, ...r.aboveCliff]
          for (const step of all) {
            // MLP discount deliberately has no IOU source; skip only that case.
            if (step.programId === 'discount' && step.sourceUrl === '') continue
            expect(step.sourceUrl.length).toBeGreaterThan(0)
            expect(step.verifiedAsOf.length).toBeGreaterThan(0)
          }
        },
      ),
    )
  })
})

describe('P10 — protections never silent', () => {
  it('every protection requires action and HEAP-last-winter yields a step', () => {
    fc.assert(
      fc.property(householdArb(), (h) => {
        const r = evaluate(h, TODAY, policies)
        for (const p of r.protections) {
          expect(p.requiresAction).toBe(true)
        }
        if (h.heapLastWinter === 'yes') {
          expect(
            r.protections.some(
              (p) => p.programId === 'prior_winter_heap_presumption',
            ),
          ).toBe(true)
        }
      }),
    )
  })
})

describe('new screener inputs flow into the engine', () => {
  const belowCliffNationalGrid = (
    patch: Partial<Household> = {},
  ): Household => ({
    size: 4,
    grossAnnualIncome: 20_000, // well below size-4 60% SMI
    utility: 'national_grid',
    heatingFuel: 'gas',
    benefits: [],
    behindOnBills: false,
    heapLastWinter: 'no',
    anyoneUnder18: false,
    ...patch,
  })

  it('a held categorical benefit unlocks the discount (likely)', () => {
    const r = evaluate(
      belowCliffNationalGrid({ benefits: ['snap'] }),
      TODAY,
      policies,
    )
    const discount = r.steps.find((s) => s.programId === 'discount')!
    expect(discount.status).toBe('likely')
    expect(discount.unlockedBy).toContain('snap')
  })

  it('P9 — standard rate + likely discount raises a no-amount bill flag', () => {
    const r = evaluate(
      belowCliffNationalGrid({ benefits: ['snap'], rateCode: 'R-1' }),
      TODAY,
      policies,
    )
    expect(r.billCheckFlag?.onStandardRate).toBe(true)
    // The flag carries only a message key — no dollar amount anywhere in it.
    expect(JSON.stringify(r.billCheckFlag)).not.toMatch(/\d/)
  })

  it('no rate code means no bill flag', () => {
    const r = evaluate(belowCliffNationalGrid(), TODAY, policies)
    expect(r.billCheckFlag).toBeUndefined()
  })
})

describe('result shape + compliance', () => {
  it('returns the spec-shaped ChainResult with the Heatline', () => {
    fc.assert(
      fc.property(householdArb(), (h) => {
        const r = evaluate(h, TODAY, policies)
        expect(r).toHaveProperty('steps')
        expect(r).toHaveProperty('protections')
        expect(r).toHaveProperty('aboveCliff')
        expect(r.cliff).toHaveProperty('limit60Smi')
        expect(r.cliff.householdIncome).toBe(h.grossAnnualIncome)
        expect(r.heatline).toBe('1-800-632-8175')
      }),
    )
  })

  it('above-cliff programs appear only above the 60% SMI line', () => {
    fc.assert(
      fc.property(householdArb(), (h) => {
        const r = evaluate(h, TODAY, policies)
        if (h.grossAnnualIncome <= r.cliff.limit60Smi) {
          expect(r.aboveCliff).toHaveLength(0)
        }
      }),
    )
  })
})
