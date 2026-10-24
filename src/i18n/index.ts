import en from './en.json'

/**
 * Minimal i18n accessor. All user-facing strings live in the locale JSON
 * files (currently `en.json`); components must never contain literal copy.
 *
 * Usage:
 *   t('screening.householdSize.title')
 *   t('screening.progress.label', { current: 1, total: 6 })
 *
 * This is intentionally dependency-free and pure. It can be swapped for a
 * full i18n runtime later without changing call sites.
 */

type Vars = Record<string, string | number>

function resolve(key: string): string {
  const table = en as Record<string, unknown>

  // en.json uses flat dotted keys (e.g. "result.title"), so try a direct
  // lookup first. This is the source-of-truth format.
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
      en,
    )
  if (typeof nested === 'string') return nested

  // Surface the missing key instead of rendering `undefined`.
  return key
}

export function t(key: string, vars?: Vars): string {
  const template = resolve(key)
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  )
}
