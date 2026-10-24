import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { evaluate } from '../rules/evaluate'
import { policies } from '../rules/policies'
import type { Household } from '../rules/types'
import { ResultScreen } from './ResultScreen'

/**
 * UI tests for the result screen (design.md Testing Strategy):
 * ResultLayout always renders the disclaimer + Heatline, and no result
 * content renders a banned compliance phrase.
 */

const TODAY = '2026-12-01'

function renderResult(patch: Partial<Household> = {}) {
  const household: Household = {
    size: 4,
    grossAnnualIncome: 20_000,
    utility: 'national_grid',
    heatingFuel: 'gas',
    benefits: ['snap'],
    behindOnBills: true,
    heapLastWinter: 'yes',
    anyoneUnder18: true,
    infantUnder12mo: true,
    rateCode: 'R-1',
    ...patch,
  }
  const result = evaluate(household, TODAY, policies)
  render(
    <ResultScreen result={result} household={household} policies={policies} />,
  )
  return result
}

const BANNED = [
  'you qualify',
  'guaranteed',
  'approved',
  'automatic',
  'no action needed',
]

describe('ResultScreen — compliance frame', () => {
  it('shows the screener disclaimer', () => {
    renderResult()
    expect(screen.getByText(/screener, not legal advice/i)).toBeDefined()
  })

  it('shows the Heatline number', () => {
    renderResult()
    expect(screen.getAllByText(/1-800-632-8175/).length).toBeGreaterThan(0)
  })

  it('renders no banned compliance phrases', () => {
    renderResult()
    const text = document.body.textContent?.toLowerCase() ?? ''
    for (const phrase of BANNED) {
      expect(text).not.toContain(phrase)
    }
  })

  it('renders the program chain in dependency order', () => {
    renderResult()
    // Target the program headings (h3) specifically, not label mentions.
    const headings = screen.getAllByRole('heading', { level: 3 })
    const text = headings.map((h) => h.textContent ?? '')
    const heapIdx = text.findIndex((s) => /HEAP fuel assistance/i.test(s))
    const massSaveIdx = text.findIndex((s) => /Mass Save/i.test(s))
    expect(heapIdx).toBeGreaterThanOrEqual(0)
    expect(massSaveIdx).toBeGreaterThan(heapIdx)
  })

  it('labels dollar estimates as a range with "estimate"', () => {
    const result = renderResult({
      grossAnnualIncome: 120_000, // above cliff -> above-cliff programs with estimates
      heatingFuel: 'oil',
    })
    const withEstimate = [...result.aboveCliff, ...result.steps].find(
      (s) => s.estimate,
    )
    if (withEstimate) {
      expect(screen.getAllByText(/estimate/i).length).toBeGreaterThan(0)
    }
  })
})
