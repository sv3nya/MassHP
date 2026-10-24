import { Component, type ReactNode } from 'react'

type ErrorBoundaryProps = {
  /** Rendered when a descendant throws during render/lifecycle. */
  fallback: ReactNode
  children: ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
}

/**
 * Top-level error boundary (Requirement 2.8, task 11). Catches a thrown error
 * from anywhere below it — notably a PolicyError from loadPolicies when a
 * policy file is missing a value or provenance — and renders a neutral
 * fallback instead of a blank crash.
 *
 * Deliberately does NOT log the error anywhere: no household data is ever
 * logged or transmitted, and policy-shaped errors are surfaced as a soft,
 * neutral screen rather than a stack trace.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false }

  // Deliberately only derive state — no componentDidCatch logging. No
  // household data is ever logged or transmitted (privacy), and policy errors
  // are surfaced as a neutral screen rather than a stack trace.
  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  render(): ReactNode {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}
