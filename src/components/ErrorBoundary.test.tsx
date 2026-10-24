import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DataUnavailable } from './DataUnavailable'
import { ErrorBoundary } from './ErrorBoundary'
import { PolicyError } from '../rules/loadPolicies'

/**
 * Task 11: a thrown error below the boundary (notably a PolicyError from
 * loadPolicies) must surface the neutral data-unavailable screen with the
 * Heatline — never a blank crash.
 */

function Boom({ error }: { error: Error }): never {
  throw error
}

describe('ErrorBoundary', () => {
  it('renders the fallback when a child throws a PolicyError', () => {
    // React logs the caught error to console.error; silence it for a clean run.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary fallback={<DataUnavailable />}>
        <Boom error={new PolicyError('heap-fy2027.json', 'limit_60_smi')} />
      </ErrorBoundary>,
    )
    // The neutral screen shows the data-unavailable copy and the Heatline.
    expect(screen.getByText(/not available right now/i)).toBeDefined()
    expect(screen.getAllByText(/1-800-632-8175/).length).toBeGreaterThan(0)
    spy.mockRestore()
  })

  it('renders children normally when nothing throws', () => {
    render(
      <ErrorBoundary fallback={<DataUnavailable />}>
        <p>all good</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('all good')).toBeDefined()
  })
})
