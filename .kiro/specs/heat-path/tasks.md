# Implementation Plan

## Overview

This plan runs in two tracks once the shared contract is frozen: the **engine
track** (tasks 1–5: the shared contract plus the pure engine and its tests) and
the **UI track** (tasks 6–12: the screens, built against the frozen contract).
The tracks can proceed in parallel after task 1 is frozen.

## Notes

Working rules that apply to every task:

- **Contract-first:** The UI track must not start until the shared contract
  (task 1) is frozen — `types.ts` and the set of i18n keys `evaluate()` emits
  are the handoff between the two coders. Freeze it, then build in parallel.
- **Gate:** Engine tasks 1–5 must pass `npx vitest run` before the engine track
  is considered done. The UI track waits only on task 1, not on 2–5.
- **Policy rule:** `/policies/*.json` is READ-ONLY and authored by the team. Do
  not create or edit it. If a required value or `source_url`/`verified_as_of`
  is missing, STOP and name the exact file and field.
- **i18n ownership:** The engine track adds every `nextStepKey` / `messageKey`
  the engine emits to `src/i18n/en.json` as keys (placeholder or draft copy).
  The UI coder owns the human-facing copy for those keys and any UI-only keys.
  Neither track silently deletes the other's keys.
- **UI design reference:** The UI follows the Figma design
  (`<ADD FIGMA URL>` — placeholder) for layout, spacing, color, and typography.
  Figma is the visual source of truth, but the compliance and audience rules
  override the mock wherever they conflict. Implement the spec and flag the
  mismatch to the designer rather than shipping a non-compliant mock.
- **Per-screen conformance:** Every result screen must show the Heatline, show
  the screener disclaimer, show each program's source link and "verified as of
  <date>", render every dollar figure as a range labeled "estimate" (omit when
  null), use only hedged language (never "you qualify", "guaranteed",
  "approved", "automatic", or "no action needed"), work at 360px with ≥44px tap
  targets and no hover-only UI, show the English/Spanish language toggle
  (English default), end with one clear next step in warm ~6th-grade-level
  language, and pull all text from `src/i18n/` keys (no literals in components).

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": [1],
      "description": "Freeze the shared contract. Gates both tracks."
    },
    {
      "wave": 2,
      "tasks": [2, 6, 7, 8, 9, 10, 11],
      "description": "Engine setup and all UI screens. Each depends only on task 1, so they run in parallel."
    },
    {
      "wave": 3,
      "tasks": [3],
      "description": "Rules engine core and cliff data. Depends on task 2."
    },
    {
      "wave": 4,
      "tasks": [4, 12],
      "description": "Property tests and Spanish localization. Both depend on the stable engine and en.json keys from task 3."
    },
    {
      "wave": 5,
      "tasks": [5],
      "description": "Fixed-date tests and the engine-track gate check. Depends on task 4."
    }
  ],
  "dependencies": {
    "1": [],
    "2": [1],
    "3": [2],
    "4": [3],
    "5": [4],
    "6": [1],
    "7": [1],
    "8": [1],
    "9": [1],
    "10": [1],
    "11": [1],
    "12": [1, 3]
  }
}
```

Task 1 (the frozen contract) gates both tracks. The engine track is a chain
(2 → 3 → 4 → 5). The UI tasks (6–11) each depend only on task 1 and can run in
parallel. Task 12 depends on task 1 and on task 3 (stable `en.json` keys).

## Tasks

- [x] 1. Freeze the engine ↔ UI shared contract
  - Finalize `src/rules/types.ts`: `Household`, `ChainStep`, `ChainResult`,
    `Policies`, and the enum unions. This is the data shape the UI renders.
  - Enumerate the i18n keys `evaluate()` will emit (`nextStepKey`s per program,
    `messageKey`s for `ask_provider`, bill-check, and the data-unavailable
    screen) and seed them in `src/i18n/en.json` as keys with draft copy.
  - Share both with the UI coder and agree they are frozen before UI work
    begins. Changes after freeze are coordinated, not silent.
  - _Requirements: 2.1_

- [x] 2. Project setup and policy loading
  - Add Tailwind via `@tailwindcss/vite` (install + Vite plugin + base config).
  - Add Vitest config with `jsdom` environment; install `@testing-library/react`
    and `fast-check`.
  - Create the folder layout: `src/rules/`, `src/ui/`, `src/i18n/`,
    `tests/properties/`, `tests/dates/`.
  - Write `src/rules/loadPolicies.ts`: import and validate the six policy files;
    throw a typed error naming file + field on any missing value or missing
    `source_url`/`verified_as_of`. No defaults or placeholders (soft error:
    surfaced via the UI error boundary built in task 11).
  - Verify `npx vitest run` executes (even with no tests yet) and `tsc`/lint
    pass.
  - _Requirements: 2.7, 2.8_

- [x] 3. Rules engine core and cliff data
  - Implement `src/rules/evaluate.ts` as the pure pipeline: cliff inputs → FPL
    bands vs 60% SMI (modeled separately) → chain build in dependency order
    (HEAP → discount → AMP → Mass Save) → utility rules (pending ⇒
    `ask_provider`; municipal light plant carve-out; `not_sure` handling) →
    protections → above-cliff → bill check → attach `heatline`.
  - Populate `sourceUrl` and `verifiedAsOf` on every `ChainStep` from policies.
  - Implement `src/rules/cliff.ts` as a pure function producing chart data from
    policy thresholds (no literals).
  - Keep both functions pure: no `Date.now()`, `fetch`, globals, or randomness;
    `today` and `policies` are parameters.
  - Emit only i18n keys declared in task 1; add any new key to `en.json`.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3_

- [x] 4. Property tests P1–P10
  - In `tests/properties/`, implement the ten invariants with fast-check using
    fixture `Policies` objects (not the live policy values).
  - P1 Determinism, P2 No clock/global dependence, P3 Dependency order,
    P4 Unlock soundness, P5 Cliff monotonicity, P6 Pending ⇒ ask_provider,
    P7 Municipal light plant, P8 Provenance, P9 No-amount hedging,
    P10 Protections never silent.
  - If any property fails: STOP, show the shrunk counterexample, and say whether
    the code or the requirement is wrong. NEVER edit a property to make it pass.
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 4.4, 6.3_

- [x] 5. Fixed-date tests
  - In `tests/dates/`, test the Winter Moratorium window with fixed `today`
    values: active inside the season window, inactive just outside both
    boundaries, using fixture seasons.
  - Assert `verifiedAsOf` surfaces unchanged from fixtures.
  - Gate check: confirm `npx vitest run` is green. Engine track done.
  - _Requirements: 4.1, 7.3_

- [ ] 6. Screener UI
  - Build `src/ui/Screener.tsx`: one question per screen, required fields then
    an optional/skippable protection section; answers in component state only
    (no persistence, logging, or network). Produces a `Household` object.
  - Include the required `anyoneUnder18` question ("Does anyone under 18 live
    with you?"), used to disambiguate the all-adults-65+ protection.
  - The `utility` question offers only National Grid, municipal light plant,
    and not sure.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 8.7, 8.8_

- [ ] 7. Unlock map UI
  - Build `src/ui/UnlockMap.tsx`: render `ChainResult.steps` in dependency order
    with status, `unlockedBy`, next step, estimate range labeled "estimate",
    source link, and "verified as of <date>".
  - Omit the dollar figure when `estimate` is null; show `ask_provider` guidance
    instead of a claim; use only hedged language (no banned phrases).
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 8. Protection checker UI
  - Build `src/ui/Protections.tsx`: render each protection with its "what to
    say" script; never show "no action needed"; always surface the Heatline.
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 9. Cliff chart UI
  - Build `src/ui/CliffChart.tsx` with Recharts from `cliff.ts` data: energy
    cost vs income for this household size, 60% SMI reference line, above-cliff
    program callouts. Legible at 360px.
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 10. Bill check UI
  - Build `src/ui/BillCheck.tsx`: rate-code entry; when the bill-check flag is
    raised, show the hedged retroactive-discount message with no amount.
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 11. Result layout and compliance footer
  - Build `src/ui/ResultLayout.tsx`: wrap every result screen with the screener
    disclaimer and the Heatline footer (number from policies).
  - Add the top-level error boundary that renders the neutral "data unavailable"
    screen (soft error) when `loadPolicies` throws, using the task 1 key.
  - Ensure every result screen: shows the Heatline, shows the screener
    disclaimer, shows source + "verified as of" per program, shows dollar
    figures as ranges labeled "estimate", and ends with one clear next step in
    warm ~6th-grade language.
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 2.8, 8.7_

- [ ] 12. Spanish localization (build-time)
  - Add a build script that generates `src/i18n/es.json` from `en.json` before
    `vite build`, producing one Spanish entry per English key.
  - Commit `es.json` as a reviewable artifact; a Spanish-speaking reviewer must
    check its copy against the compliance rules (hedged phrasing; no equivalent
    of "you qualify", "guaranteed", "approved", "automatic", "no action
    needed") before release.
  - No runtime translation and no network calls — generation happens only at
    build time.
  - Add a language toggle (English ⇄ Spanish, English default) that switches
    the active locale from in-memory state only — no `localStorage`, no
    persistence; reload returns to English. Switching re-renders the current
    screen in place without losing in-progress answers. The toggle meets the
    mobile constraints (≥44px tap target, 360px width, no hover-only).
  - The UI renders from the active locale file, with English fallback when a key
    is missing from `es.json`.
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10_
