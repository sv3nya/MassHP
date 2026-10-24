import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { BehindOnBillsStep } from './BehindOnBillsStep'
import { BenefitsStep } from './BenefitsStep'
import { FuelStep } from './FuelStep'
import { HouseholdSizeStep } from './HouseholdSizeStep'
import { IncomeStep } from './IncomeStep'
import { LastWinterStep } from './LastWinterStep'
import { PeopleStep } from './PeopleStep'
import { RateCodeStep } from './RateCodeStep'
import { UtilityStep } from './UtilityStep'

/**
 * Render guard: every screener step is the first thing the primary user sees,
 * and all of its copy comes from i18n. If a component references a key missing
 * from en.json, `t()` returns the raw dotted key and it renders literally.
 * This test mounts each step and fails if any unresolved key leaks to the DOM.
 */

afterEach(cleanup)

// A whole text node that IS an unresolved i18n key: a dotted identifier chain
// under a known namespace, matching the entire trimmed node text. Checking the
// whole node (not a substring of concatenated text) avoids false positives
// where real copy ends in a word like "discount." next to the next element.
const RAW_KEY =
  /^(screening|app|language|result|program|unlock|cliff|heatline|billcheck|protect|step|discount|abovecliff)(\.[a-zA-Z0-9_]+)+$/

/** Collect the trimmed text of every text node under an element. */
function textNodes(root: Node): string[] {
  const out: string[] = []
  const walk = (n: Node) => {
    if (n.nodeType === Node.TEXT_NODE) {
      const t = n.textContent?.trim()
      if (t) out.push(t)
    }
    n.childNodes.forEach(walk)
  }
  walk(root)
  return out
}

const STEPS = [
  ['HouseholdSizeStep', <HouseholdSizeStep key="s" />],
  ['IncomeStep', <IncomeStep key="i" />],
  ['UtilityStep', <UtilityStep key="u" />],
  ['FuelStep', <FuelStep key="f" />],
  ['BenefitsStep', <BenefitsStep key="b" step={5} totalSteps={9} />],
  ['BehindOnBillsStep', <BehindOnBillsStep key="bo" step={6} totalSteps={9} />],
  ['PeopleStep', <PeopleStep key="p" />],
  ['RateCodeStep', <RateCodeStep key="r" step={8} totalSteps={9} />],
  ['LastWinterStep', <LastWinterStep key="l" />],
] as const

describe('screener steps render real copy, not raw i18n keys', () => {
  for (const [name, element] of STEPS) {
    it(`${name} shows no unresolved i18n key`, () => {
      const { container } = render(element)
      const leaked = textNodes(container).filter((t) => RAW_KEY.test(t))
      expect(leaked, `unresolved keys in ${name}: ${leaked.join(', ')}`).toEqual(
        [],
      )
    })
  }
})
