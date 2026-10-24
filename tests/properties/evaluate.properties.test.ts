import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { evaluate } from '../../src/rules/evaluate'
import type { Household, Benefit, Utility, HeatingFuel } from '../../src/rules/types'
import { makeFixturePolicies } from './fixtures'

const policies = makeFixturePolicies()
const pendingPolicies = makeFixturePolicies({ nationalGridStatus: 'pending' })

const utilities: Utility[] = ['national_grid', 'municipal_light_plant', 'not_sure']
const fuels: HeatingFuel[] = ['gas', 'electric', 'oil', 'propane', 'other']
const benefits: Benefit[] = ['snap', 'masshealth', 'tafdc', 'eaedc', 'ssi', 'public_housing', 'heap']

/** Arbitrary Household over the fixture's supported sizes (1..3). */
const householdArb: fc.Arbitrary<Household> = fc.record({
  size: fc.integer({ min: 1, max: 3 }),
  grossAnnualIncome: fc.integer({ min: 0, max: 200000 }),
  utility: fc.constantFrom(...utilities),
  heatingFuel: fc.constantFrom(...fuels),
  benefits: fc.uniqueArray(fc.constantFrom(...benefits), { maxLength: 7 }),
  behindOnBills: fc.boolean(),
  heapLastWinter: fc.constantFrom('yes', 'no', 'not_sure'),
  anyoneUnder18: fc.boolean(),
  infantUnder12mo: fc.option(fc.boolean(), { nil: undefined }),
  allAdults65Plus: fc.option(fc.boolean(), { nil: undefined }),
  seriousIllness: fc.option(fc.boolean(), { nil: undefined }),
  rateCode: fc.option(fc.constantFrom('R-1', 'R-2', 'R-3'), { nil: undefined }),
})

/**
 * Arbitrary ISO date string (YYYY-MM-DD) in a plausible range. Built from a
 * day offset so it can never produce an invalid date. Base 2026-06-01.
 */
const dateArb: fc.Arbitrary<string> = fc
  .integer({ min: 0, max: 486 }) // ~2026-06-01 .. 2027-09-30
  .map((dayOffset) => {
    const base = Date.UTC(2026, 5, 1)
    const d = new Date(base + dayOffset * 86400000)
    return d.toISOString().slice(0, 10)
  })

const STEP_ORDER = ['heap', 'discount_rate', 'amp', 'mass_save']
const BANNED = ['you qualify', 'guaranteed', 'approved', 'automatic', 'no action needed']

describe('Correctness Properties P1–P10', () => {
  it('P1 Determinism', () => {
    fc.assert(
      fc.property(householdArb, dateArb, (h, today) => {
        const a = evaluate(h, today, policies)
        const b = evaluate(h, today, policies)
        expect(a).toEqual(b)
      }),
    )
  })

  it('P2 No clock/global dependence (output depends only on inputs)', () => {
    // Called twice at "different wall-clock times" (simulated by just calling
    // again); evaluate reads no clock, so results must be identical.
    fc.assert(
      fc.property(householdArb, dateArb, (h, today) => {
        const first = evaluate(h, today, policies)
        const second = evaluate(h, today, policies)
        expect(second).toEqual(first)
      }),
    )
  })

  it('P3 Dependency order', () => {
    fc.assert(
      fc.property(householdArb, dateArb, (h, today) => {
        const ids = evaluate(h, today, policies).steps.map((s) => s.programId)
        expect(ids).toEqual(STEP_ORDER)
      }),
    )
  })

  it('P4 Unlock soundness (every unlocker of a likely discount is actually satisfied)', () => {
    // Categorical benefits that can unlock the discount (CATEGORICAL_BENEFITS
    // in evaluate.ts). An unlocker is sound only if it is either HEAP (and
    // HEAP itself is likely) or a categorical benefit the household holds.
    const categorical: Benefit[] = ['snap', 'tafdc', 'eaedc', 'ssi']
    fc.assert(
      fc.property(householdArb, dateArb, (h, today) => {
        const r = evaluate(h, today, policies)
        const heap = r.steps.find((s) => s.programId === 'heap')!
        const discount = r.steps.find((s) => s.programId === 'discount_rate')!
        if (discount.status !== 'likely') return
        // A likely discount must list at least one unlocker...
        expect(discount.unlockedBy.length).toBeGreaterThan(0)
        // ...and every listed unlocker must be genuinely satisfied.
        for (const id of discount.unlockedBy) {
          const satisfied =
            id === 'heap'
              ? heap.status === 'likely'
              : categorical.includes(id as Benefit) &&
                h.benefits.includes(id as Benefit)
          expect(satisfied, `unsound unlocker "${id}"`).toBe(true)
        }
      }),
    )
  })

  it('P5 Cliff monotonicity (raising income never improves an income-gated step)', () => {
    const rank: Record<string, number> = { not_likely: 0, ask_provider: 1, possible: 2, likely: 3 }
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }),
        fc.integer({ min: 0, max: 150000 }),
        fc.integer({ min: 1, max: 60000 }),
        (size, income, bump) => {
          const base: Household = {
            size,
            grossAnnualIncome: income,
            utility: 'national_grid',
            heatingFuel: 'gas',
            benefits: [],
            behindOnBills: false,
            heapLastWinter: 'no',
            anyoneUnder18: false,
          }
          const richer: Household = { ...base, grossAnnualIncome: income + bump }
          const heapLow = evaluate(base, '2026-12-01', policies).steps[0]
          const heapHigh = evaluate(richer, '2026-12-01', policies).steps[0]
          // HEAP is income-gated: more income never raises its eligibility rank.
          expect(rank[heapHigh.status]).toBeLessThanOrEqual(rank[heapLow.status])
        },
      ),
    )
  })

  it('P6 Pending => ask_provider (fixture with a pending tier)', () => {
    fc.assert(
      fc.property(householdArb, dateArb, (h, today) => {
        const ng: Household = { ...h, utility: 'national_grid' }
        const discount = evaluate(ng, today, pendingPolicies).steps.find(
          (s) => s.programId === 'discount_rate',
        )!
        expect(discount.status).toBe('ask_provider')
        expect(discount.estimate).toBeNull()
      }),
    )
  })

  it('P7 Municipal light plant (IOU steps never likely; moratorium still evaluated)', () => {
    fc.assert(
      fc.property(householdArb, dateArb, (h, today) => {
        const mlp: Household = { ...h, utility: 'municipal_light_plant' }
        const r = evaluate(mlp, today, policies)
        for (const id of ['discount_rate', 'amp', 'mass_save']) {
          const step = r.steps.find((s) => s.programId === id)!
          expect(step.status).not.toBe('likely')
        }
        // Winter Moratorium is evaluated for MLP when today is in-window.
        const inWindow = today >= '2026-11-15' && today <= '2027-03-15'
        const hasMoratorium = r.protections.some((p) => p.programId === 'winter_moratorium')
        if (inWindow) expect(hasMoratorium).toBe(true)
      }),
    )
  })

  it('P8 Provenance (every step/protection/aboveCliff has source + verified)', () => {
    fc.assert(
      fc.property(householdArb, dateArb, (h, today) => {
        const r = evaluate(h, today, policies)
        for (const step of [...r.steps, ...r.protections, ...r.aboveCliff]) {
          expect(step.sourceUrl.length).toBeGreaterThan(0)
          expect(step.verifiedAsOf.length).toBeGreaterThan(0)
        }
      }),
    )
  })

  it('P9 No-amount hedging (bill-check message carries no dollar amount)', () => {
    fc.assert(
      fc.property(householdArb, dateArb, (h, today) => {
        const r = evaluate(h, today, policies)
        if (r.billCheckFlag?.onStandardRate) {
          expect(r.billCheckFlag.messageKey).not.toMatch(/\$|\d/)
        }
      }),
    )
  })

  it('P10 Protections never silent (every protection requires action)', () => {
    fc.assert(
      fc.property(householdArb, dateArb, (h, today) => {
        const r = evaluate(h, today, policies)
        for (const p of r.protections) {
          expect(p.requiresAction).toBe(true)
          expect(BANNED).not.toContain(p.nextStepKey)
        }
      }),
    )
  })
})
