import { describe, it, expect } from 'vitest'
import { evaluate } from '../../src/rules/evaluate'
import type { Household } from '../../src/rules/types'
import { makeFixturePolicies, VERIFIED } from '../properties/fixtures'

const policies = makeFixturePolicies()

// A household that triggers the Winter Moratorium only via the season window
// (any household in-window; here we keep protections otherwise untriggered).
function baseHousehold(): Household {
  return {
    size: 1,
    grossAnnualIncome: 10000,
    utility: 'national_grid',
    heatingFuel: 'gas',
    benefits: [],
    behindOnBills: true,
    heapLastWinter: 'no',
    anyoneUnder18: false,
  }
}

function hasMoratorium(today: string): boolean {
  return evaluate(baseHousehold(), today, policies).protections.some(
    (p) => p.programId === 'winter_moratorium',
  )
}

describe('Winter Moratorium season window (fixed dates)', () => {
  // Fixture window: 2026-11-15 .. 2027-03-15 inclusive.
  it('is active on the start boundary (2026-11-15)', () => {
    expect(hasMoratorium('2026-11-15')).toBe(true)
  })

  it('is active on the end boundary (2027-03-15)', () => {
    expect(hasMoratorium('2027-03-15')).toBe(true)
  })

  it('is active mid-window (2027-01-01)', () => {
    expect(hasMoratorium('2027-01-01')).toBe(true)
  })

  it('is inactive the day before the window (2026-11-14)', () => {
    expect(hasMoratorium('2026-11-14')).toBe(false)
  })

  it('is inactive the day after the window (2027-03-16)', () => {
    expect(hasMoratorium('2027-03-16')).toBe(false)
  })
})

describe('Provenance surfaces unchanged from fixtures', () => {
  it('protection steps carry the fixture verified_as_of', () => {
    const r = evaluate(baseHousehold(), '2027-01-01', policies)
    const moratorium = r.protections.find((p) => p.programId === 'winter_moratorium')
    expect(moratorium?.verifiedAsOf).toBe(VERIFIED)
  })
})
