# Implementation Plan — Heat Path (MHP) MVP

This plan is split into two tracks that can run in parallel once the shared
contract is frozen:

- **Engine track (this coder):** Tasks 1–4 + the shared contract (C).
- **UI track (other coder):** Tasks 5–10, built against the frozen contract.

> **Contract-first rule:** The UI track must not start until milestone C is
> frozen. The engine's public surface — `types.ts` and the set of i18n keys
> `evaluate()` emits — is the handoff between the two coders. Freeze it, then
> both build in parallel.
>
> **Gate:** Engine tasks 1–4 must pass `npx vitest run` before the engine track
> is considered done. The UI track does not need to wait for 1–4, only for C.
>
> **Policy rule:** `/policies/*.json` is READ-ONLY and authored by the team. Do
> not create or edit it. If a required value or `source_url`/`verified_as_of`
> is missing, STOP and name the exact file and field.
>
> **i18n ownership:** The engine track adds every `nextStepKey` / `messageKey`
> the engine emits to `src/i18n/en.json` as keys (values may be placeholder or
> draft copy). The UI coder owns the human-facing copy for those keys and any
> UI-only keys. Neither track silently deletes the other's keys.

---

## Milestone C — Shared contract (Engine track, do first)

- [ ] C. Freeze the engine ↔ UI contract
  - Finalize `src/rules/types.ts`: `Household`, `ChainStep`, `ChainResult`,
    `Policies`, and the enum unions. This is the data shape the UI renders.
  - Enumerate the i18n keys `evaluate()` will emit (`nextStepKey`s per program,
    `messageKey`s for `ask_provider`, bill-check, and the data-unavailable
    screen) and seed them in `src/i18n/en.json` as keys with draft copy.
  - Share both with the UI coder and agree they are frozen before UI work
    begins. Changes after freeze are coordinated, not silent.
  - _Requirements: 2.1; cross-cutting (i18n-only strings)._

---

## Engine track (this coder)

- [ ] 1. Project setup and policy loading
  - Add Tailwind via `@tailwindcss/vite` (install + Vite plugin + base config).
  - Add Vitest config with `jsdom` environment; install `@testing-library/react`
    and `fast-check`.
  - Create the folder layout: `src/rules/`, `src/ui/`, `src/i18n/`,
    `tests/properties/`, `tests/dates/`.
  - Write `src/rules/loadPolicies.ts`: import + validate the six policy files;
    throw a typed error naming file + field on any missing value or missing
    `source_url`/`verified_as_of`. No defaults or placeholders. (Soft error:
    surfaced via the UI error boundary built in Task 10.)
  - Verify: `npx vitest run` executes (even with no tests yet) and `tsc`/lint
    pass.
  - _Requirements: 2.7, 2.8; cross-cutting (strict TS, tooling)._
  - _Depends on: C (types.ts)._

- [ ] 2. Rules engine core and cliff data
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
  - Emit only i18n keys declared in milestone C; add any new key to `en.json`.
  - _Requirements: 2.1–2.9, 3.1–3.4, 4.1–4.4, 5.1–5.4, 6.1–6.3._

- [ ] 3. Property tests P1–P10
  - In `tests/properties/`, implement the ten invariants with fast-check using
    fixture `Policies` objects (not the live policy values).
  - P1 Determinism, P2 No clock/global dependence, P3 Dependency order,
    P4 Unlock soundness, P5 Cliff monotonicity, P6 Pending ⇒ ask_provider,
    P7 Municipal light plant, P8 Provenance, P9 No-amount hedging,
    P10 Protections never silent.
  - If any property fails: STOP, show the shrunk counterexample, and say whether
    the code or the requirement is wrong. NEVER edit a property to make it pass.
  - _Requirements: 2.2–2.9, 4.3, 6.3._

- [ ] 4. Fixed-date tests
  - In `tests/dates/`, test the Winter Moratorium window with fixed `today`
    values: active inside the season window, inactive just outside both
    boundaries, using fixture seasons.
  - Assert `verifiedAsOf` surfaces unchanged from fixtures.
  - **Gate check:** confirm `npx vitest run` is green. Engine track done.
  - _Requirements: 4.1, 7.3._

---

## UI track (other coder)

Builds against the frozen contract (C). Does not need tasks 1–4 complete, only
C frozen. All components are mobile-first (works at 360px, ≥44px tap targets,
no hover-only UI) and reference i18n keys only — no strings or policy numbers
in components. The UI coder owns the human copy in `en.json`.

**Design reference:** The UI follows the Figma design
(`<ADD FIGMA URL>` — placeholder) for layout, spacing, color, and typography.
Figma is the visual source of truth, BUT the compliance and audience rules
below override the mock wherever they conflict. Implement the spec and flag the
mismatch to the designer rather than shipping a non-compliant mock.

**Design-conformance checklist — every result screen must:**
- [ ] show the Massachusetts Heatline (number from policies)
- [ ] show the screener disclaimer (screener, not legal advice/eligibility)
- [ ] show each program's source link and "verified as of <date>"
- [ ] render every dollar figure as a range labeled "estimate" (omit when null)
- [ ] use only hedged language — never "you qualify", "guaranteed", "approved",
      "automatic", or "no action needed"
- [ ] work at 360px wide, with ≥44px tap targets and no hover-only UI
- [ ] end with one clear next step in warm, ~6th-grade-level language
- [ ] pull all text from `en.json` keys (no literals in components)

- [ ] 5. Screener UI
  - Build `src/ui/Screener.tsx`: one question per screen, required fields then
    an optional/skippable protection section; answers in component state only
    (no persistence, logging, or network). Produces a `Household` object.
  - Include the required `anyoneUnder18` question ("Does anyone under 18 live
    with you?"), used to disambiguate the all-adults-65+ protection.
  - The `utility` question offers only National Grid, municipal light plant,
    and not sure.
  - _Requirements: 1.1–1.5; cross-cutting (i18n, audience)._

- [ ] 6. Unlock map UI
  - Build `src/ui/UnlockMap.tsx`: render `ChainResult.steps` in dependency order
    with status, `unlockedBy`, next step, estimate range labeled "estimate",
    source link, and "verified as of <date>".
  - Omit the dollar figure when `estimate` is null; show `ask_provider` guidance
    instead of a claim; use only hedged language (no banned phrases).
  - _Requirements: 3.1–3.4._

- [ ] 7. Protection checker UI
  - Build `src/ui/Protections.tsx`: render each protection with its "what to
    say" script; never show "no action needed"; always surface the Heatline.
  - _Requirements: 4.1–4.4._

- [ ] 8. Cliff chart UI
  - Build `src/ui/CliffChart.tsx` with Recharts from `cliff.ts` data: energy
    cost vs income for this household size, 60% SMI reference line, above-cliff
    program callouts. Legible at 360px.
  - _Requirements: 5.1–5.4._

- [ ] 9. Bill check UI
  - Build `src/ui/BillCheck.tsx`: rate-code entry; when the bill-check flag is
    raised, show the hedged retroactive-discount message with no amount.
  - _Requirements: 6.1–6.3._

- [ ] 10. Result layout and compliance footer
  - Build `src/ui/ResultLayout.tsx`: wrap every result screen with the screener
    disclaimer and the Heatline footer (number from policies).
  - Add the top-level error boundary that renders the neutral "data unavailable"
    screen (soft error) when `loadPolicies` throws, using the C-declared key.
  - Ensure every result screen: shows the Heatline, shows the screener
    disclaimer, shows source + "verified as of" per program, shows dollar
    figures as ranges labeled "estimate", and ends with one clear next step in
    warm ~6th-grade language.
  - _Requirements: 7.1–7.5; 2.8 (soft-error boundary)._

- [ ] 11. Spanish localization (build-time)
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
  - Depends on: `en.json` keys being reasonably stable (milestone C + Task 2).
  - _Requirements: 8.1–8.10._
