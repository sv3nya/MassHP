import en from './en.json'
import es from './es.json'

/**
 * Minimal, dependency-free i18n accessor. All user-facing strings live in the
 * locale JSON files; components must never contain literal copy.
 *
 * English (`en.json`) is the source of truth. Spanish (`es.json`) is generated
 * from it at build time (see scripts/generate-es.mjs) and committed for
 * compliance review. Lookups fall back to English when a Spanish key is
 * missing — never a raw-key placeholder (Requirement 8.5, 8.6).
 *
 * The active locale is held in memory only: no localStorage, no persistence,
 * no network. A reload returns to English (Requirement 8.9). Components read
 * the active locale via the `useLocale` hook so a switch re-renders them in
 * place without losing in-progress answers (Requirement 8.8).
 *
 * Usage:
 *   t('screening.householdSize.title')
 *   t('screening.progress.label', { current: 1, total: 6 })
 */

export type Locale = 'en' | 'es'

type Vars = Record<string, string | number>

const TABLES: Record<Locale, Record<string, unknown>> = {
  en: en as Record<string, unknown>,
  es: es as Record<string, unknown>,
}

// In-memory only. Defaults to English on every load/reload (R8.9).
let activeLocale: Locale = 'en'
const listeners = new Set<() => void>()

export function getLocale(): Locale {
  return activeLocale
}

/** Switch the active locale and notify subscribers so the UI re-renders. */
export function setLocale(locale: Locale): void {
  if (locale === activeLocale) return
  activeLocale = locale
  for (const listener of listeners) listener()
}

/** Subscribe to locale changes. Returns an unsubscribe function. */
export function subscribeLocale(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function lookup(table: Record<string, unknown>, key: string): string | undefined {
  // Locale JSON uses flat dotted keys (e.g. "result.title") — try direct first.
  const flat = table[key]
  if (typeof flat === 'string') return flat

  // Fall back to nested traversal so grouped JSON also resolves if present.
  const nested = key
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object'
          ? (node as Record<string, unknown>)[part]
          : undefined,
      table,
    )
  return typeof nested === 'string' ? nested : undefined
}

function resolve(key: string): string {
  // Active locale first, then English fallback (R8.6), then the raw key so a
  // genuinely missing key is visible rather than rendering `undefined`.
  const active = lookup(TABLES[activeLocale], key)
  if (active !== undefined) return active
  const english = lookup(TABLES.en, key)
  if (english !== undefined) return english
  return key
}

export function t(key: string, vars?: Vars): string {
  const template = resolve(key)
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  )
}
