#!/usr/bin/env node
/**
 * Build-time Spanish generator (Requirement 8.1–8.4).
 *
 * Produces src/i18n/es.json from src/i18n/en.json so that es.json has exactly
 * one entry per English key (no missing keys, no extras). Spanish copy comes
 * from a committed, human-maintained translation map (src/i18n/es.source.json)
 * keyed by the same i18n keys. Any key without a Spanish entry falls back to
 * the English string, which keeps the app functional and makes the untranslated
 * keys visible to the compliance reviewer rather than hiding them.
 *
 * This runs ONLY at build time (wired into the "build" script). It makes no
 * network call and performs no machine translation — translation is authored
 * by people in es.source.json and reviewed before release (R8.2, R8.3).
 *
 * The generated es.json is committed as a reviewable artifact.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const i18nDir = resolve(here, '..', 'src', 'i18n')
const enPath = resolve(i18nDir, 'en.json')
const esSourcePath = resolve(i18nDir, 'es.source.json')
const esOutPath = resolve(i18nDir, 'es.json')

const en = JSON.parse(readFileSync(enPath, 'utf8'))
const esSource = existsSync(esSourcePath)
  ? JSON.parse(readFileSync(esSourcePath, 'utf8'))
  : {}

// Phrases that must never appear in user-facing copy, in Spanish (R8.4). These
// mirror the English banned list in compliance.md. A match fails the build.
const BANNED_ES = [
  'usted califica',
  'calificas',
  'garantizado',
  'garantizada',
  'aprobado',
  'aprobada',
  'automático',
  'automática',
  'no se necesita ninguna acción',
  'no se requiere ninguna acción',
]

const out = {}
let translated = 0
let fellBack = 0
const violations = []

for (const [key, enValue] of Object.entries(en)) {
  if (key === '_note') {
    out[key] =
      'Spanish is GENERATED from en.json at build time (scripts/generate-es.mjs). Do not edit by hand; edit es.source.json. Review for compliance before release.'
    continue
  }
  const esValue = esSource[key]
  if (typeof esValue === 'string' && esValue.length > 0) {
    out[key] = esValue
    translated++
    const lower = esValue.toLowerCase()
    for (const phrase of BANNED_ES) {
      if (lower.includes(phrase)) violations.push({ key, phrase, value: esValue })
    }
  } else {
    // Fallback to English so every key has an entry (R8.1) and the gap is
    // visible to the reviewer (R8.6 handles runtime fallback too).
    out[key] = enValue
    fellBack++
  }
}

if (violations.length > 0) {
  console.error('\nes.json generation FAILED — banned phrase(s) in Spanish copy:')
  for (const v of violations) {
    console.error(`  ${v.key}: "${v.value}" contains "${v.phrase}"`)
  }
  process.exit(1)
}

writeFileSync(esOutPath, JSON.stringify(out, null, 2) + '\n')
const total = Object.keys(en).length
console.log(
  `es.json generated: ${total} keys (${translated} translated, ${fellBack} English fallback).`,
)
if (fellBack > 0) {
  console.log(
    `  ${fellBack} key(s) still need Spanish copy in es.source.json (currently English).`,
  )
}
