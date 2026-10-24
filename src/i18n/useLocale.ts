import { useSyncExternalStore } from 'react'
import { getLocale, subscribeLocale, type Locale } from './index'

/**
 * Subscribe a component to the active locale. Re-renders in place when the
 * locale changes (Requirement 8.8) without any persistence. Because the locale
 * lives in memory, a reload returns to English (Requirement 8.9).
 */
export function useLocale(): Locale {
  return useSyncExternalStore(subscribeLocale, getLocale, getLocale)
}
