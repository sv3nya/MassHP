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
  const value = key
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object'
          ? (node as Record<string, unknown>)[part]
          : undefined,
      en,
    )

  if (typeof value !== 'string') {
    // Surface the missing key instead of rendering `undefined`.
    return key
  }
  return value
}

export function t(key: string, vars?: Vars): string {
  const template = resolve(key)
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  )
}
