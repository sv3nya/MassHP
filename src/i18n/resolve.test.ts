import { describe, expect, it } from 'vitest'
import en from './en.json'
import { t } from './index'

/**
 * Guard against the class of bug where a component references an i18n key that
 * doesn't exist in en.json. `t()` returns the raw key on a miss, so a missing
 * key renders a literal dotted string (e.g. "screening.householdSize.title")
 * to the user instead of copy. TypeScript can't catch this because `t()`
 * accepts any string.
 *
 * This test collects every static and dynamic key the app can request and
 * asserts each one resolves to a real string in en.json.
 */

const table = en as Record<string, string>

// Dynamic key families the components build at runtime via template literals.
// These mirror the enum/id values the engine and screener actually use.
const PROGRAM_IDS = [
  'heap',
  'discount_rate',
  'amp',
  'mass_save',
  'winter_moratorium',
  'prior_winter_heap_presumption',
  'infant',
  'serious_illness',
  'elderly_with_minor',
  'all_residents_65_plus',
  'good_neighbor',
  'middle_income_oil_relief',
]
const UNLOCK_IDS = [
  'heap',
  'discount_rate',
  'snap',
  'masshealth',
  'tafdc',
  'eaedc',
  'ssi',
  'public_housing',
]
const STATUSES = ['likely', 'possible', 'not_likely', 'ask_provider']
const BENEFIT_OPTIONS = [
  'snap',
  'masshealth',
  'tafdc',
  'eaedc',
  'ssi',
  'public_housing',
  'heap',
]
const PEOPLE_OPTIONS = [
  'infantUnder12mo',
  'seriousIllness',
  'anyoneUnder18',
  'allAdults65Plus',
]

describe('i18n key coverage', () => {
  it('every program.* key resolves', () => {
    for (const id of PROGRAM_IDS) {
      expect(t(`program.${id}`)).not.toBe(`program.${id}`)
    }
  })

  it('every unlock.* key resolves', () => {
    for (const id of UNLOCK_IDS) {
      expect(t(`unlock.${id}`)).not.toBe(`unlock.${id}`)
    }
  })

  it('every result.status.* key resolves', () => {
    for (const s of STATUSES) {
      expect(t(`result.status.${s}`)).not.toBe(`result.status.${s}`)
    }
  })

  it('every screener option key resolves', () => {
    for (const o of BENEFIT_OPTIONS) {
      expect(t(`screening.benefits.options.${o}`)).not.toBe(
        `screening.benefits.options.${o}`,
      )
    }
    for (const o of PEOPLE_OPTIONS) {
      expect(t(`screening.people.options.${o}`)).not.toBe(
        `screening.people.options.${o}`,
      )
    }
  })

  it('no key in en.json is empty', () => {
    for (const [key, value] of Object.entries(table)) {
      if (key === '_note') continue
      expect(value.length, `empty value for ${key}`).toBeGreaterThan(0)
    }
  })
})
