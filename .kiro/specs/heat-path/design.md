# Design Document

## Overview

Heat Path is a client-only, phone-first web app built with Vite + React in
TypeScript. A pure rules engine reads
human-verified policy JSON and a `Household` input and returns a `ChainResult`
describing the household's chain of linked energy programs, their shutoff
protections, the above-cliff fallbacks, and the 60% SMI cliff data. The UI
renders that result in mobile-first screens, with every user-facing string
coming from i18n and every number coming from policy files.

The design keeps a hard line between three layers:

1. **Policy data** (`/policies/*.json`) — hand-written, human-verified,
   READ-ONLY. The single source of every number, date, URL, and phone number.
2. **Rules core** (`src/rules/`) — pure, deterministic, framework-free. Knows
   nothing about React or the DOM. This is the layer advocate mode will reuse.
3. **UI** (`src/ui/`) — React + Tailwind + Recharts. Collects the household,
   calls `evaluate`, renders the result. Holds no policy numbers and no
   hardcoded copy.

```
Household (in memory) ─┐
                       ├──> evaluate(household, today, policies) ──> ChainResult ──> UI
Policies (from JSON) ──┘                 │
                                         └──> cliff.ts (cliff chart data)
```

_Requirements covered by this overview: all cross-cutting constraints._

## Architecture

### Folder layout

```
policies/                 READ-ONLY. Authored by a human/teammate.
  heap-fy2027.json
  fpl-tiers.json
  discount-rates.json
  protections.json
  above-cliff.json
  seasons.json

src/rules/
  types.ts                Household, ChainStep, ChainResult, Policies, enums
  loadPolicies.ts         Import + validate policy JSON; fail loudly
  evaluate.ts             The rules engine (pure)
  cliff.ts                Pure cliff-chart data producer

src/ui/
  Screener.tsx            One-question-per-screen intake
  UnlockMap.tsx           The dependency-ordered chain
  Protections.tsx         Shutoff-protection checker + scripts
  CliffChart.tsx          Recharts cliff view
  BillCheck.tsx           Rate-code checker
  ResultLayout.tsx        Shared frame: disclaimer + Heatline footer

src/i18n/
  en.json                 ALL user-facing strings (source of truth)
  es.json                 Spanish, generated from en.json at build time

tests/
  properties/             fast-check property tests P1–P10
  dates/                  Fixed-date tests
```

### Data flow and purity boundary

- `today` is injected as an ISO date string. The UI passes the real date once,
  at the top; tests pass fixed dates. Nothing below the UI reads the clock.
- `Policies` is loaded once via `loadPolicies()` and passed down explicitly.
  `evaluate` and `cliff` never import policy JSON directly — they receive it as
  an argument, which keeps them pure and testable with fixture policies.
- No module in `src/rules/` imports React, performs I/O, uses `Math.random`,
  or reads globals.

_Requirements: 2.9 (purity), cross-cutting constraints._

## Components and Interfaces

### Types (`src/rules/types.ts`)

The core contract. These mirror the agreed data shapes.

```ts
export type Utility =
  | "national_grid" | "municipal_light_plant" | "not_sure";

export type HeatingFuel = "gas" | "electric" | "oil" | "propane" | "other";

export type Benefit =
  | "snap" | "masshealth" | "tafdc" | "eaedc" | "ssi"
  | "public_housing" | "heap";

export interface Household {
  size: number;
  grossAnnualIncome: number;
  utility: Utility;
  heatingFuel: HeatingFuel;
  benefits: Benefit[];
  behindOnBills: boolean;
  heapLastWinter: "yes" | "no" | "not_sure";
  anyoneUnder18: boolean;       // distinguishes the two 65+ protections
  infantUnder12mo?: boolean;
  allAdults65Plus?: boolean;
  seriousIllness?: boolean;
  rateCode?: string;
}

export type StepStatus = "likely" | "possible" | "not_likely" | "ask_provider";

export interface ChainStep {
  programId: string;
  status: StepStatus;
  unlockedBy: string[];         // programIds or benefit ids
  nextStepKey: string;          // i18n key
  estimate: { low: number; high: number } | null;
  sourceUrl: string;
  verifiedAsOf: string;
  requiresAction: boolean;
}

export interface ChainResult {
  steps: ChainStep[];           // dependency order
  protections: ChainStep[];
  aboveCliff: ChainStep[];
  cliff: { limit60Smi: number; householdIncome: number };
  heatline: string;             // from policies
  billCheckFlag?: { onStandardRate: boolean; messageKey: string };
}

// Policies is the validated, in-memory shape of the six JSON files.
export interface Policies { /* one typed field per policy file */ }
```

_Requirements: 2.1._

### `loadPolicies.ts`

- Imports the six JSON files and validates them into a `Policies` object.
- Validation checks, per file: presence of `source_url` and `verified_as_of`,
  and presence of the fields the engine depends on.
- On any missing file or field, it **throws** a typed error naming the exact
  file and field (e.g. `discount-rates.json: missing "verified_as_of"`). No
  defaults, no placeholders.
- **Soft-error behavior:** the throw is always caught by the app's top-level
  error boundary, which renders a neutral "data unavailable" screen (string
  from i18n) plus the Heatline. It never white-screens and never includes
  household data in the message. In dev the underlying error is also logged to
  the console with the file + field for debugging.

_Requirements: 2.7, 2.8._

### `evaluate.ts`

Signature: `evaluate(household: Household, today: string, policies: Policies): ChainResult`

Pipeline (pure, ordered):

1. **Compute cliff inputs.** Look up the 60% SMI limit for `household.size`
   from policies; capture `householdIncome`. Produce `cliff`.
2. **Score income bands.** Compute the household's FPL band from
   `fpl-tiers.json` (used for discount tiers) independently from the SMI line
   (used for the cliff). These are separate thresholds and are never conflated.
3. **Build the chain in dependency order:** HEAP → discount → AMP → Mass Save.
   Each step's `status` and `unlockedBy` derive from benefits held, income
   bands, and upstream steps:
   - A step is `likely` when its unlocking conditions are met, `possible` when
     partial/uncertain, `not_likely` when clearly unmet.
   - `unlockedBy` lists the programIds/benefit ids that enabled it (e.g. HEAP or
     a categorical benefit unlocks the discount).
4. **Apply utility rules.**
   - If the utility's discount tier is `"status": "pending"`, the discount step
     becomes `ask_provider` with the "ask your utility" message key.
   - If `utility === "municipal_light_plant"`, suppress the IOU discount, AMP,
     and Mass Save steps (present them as "ask your light plant") but still run
     the Winter Moratorium protection.
   - If `utility === "not_sure"`, utility-dependent steps resolve to `possible`
     / `ask_provider` rather than a hard claim.
5. **Build protections** (see Protections section) → `protections`.
6. **Build above-cliff** steps from `above-cliff.json` when income is above the
   60% SMI line → `aboveCliff`.
7. **Bill check** (see Bill check section) → optional `billCheckFlag`.
8. **Attach `heatline`** from policies.

Every `ChainStep` carries `sourceUrl` and `verifiedAsOf` copied from the owning
policy file.

_Requirements: 2.1–2.9, 3.1–3.4, 5.2._

### `cliff.ts`

Signature (pure): `cliffData(household, policies) => CliffDatum[]`

- Produces the series the chart renders: estimated yearly energy cost vs income
  for this household size, plus the 60% SMI reference line value.
- Reads all thresholds from policies; contains no numeric literals.

_Requirements: 5.1, 5.4._

### Protections logic

Evaluated from `protections.json` + `seasons.json`, using `today` to decide
whether the Winter Moratorium window is active:

| Protection                     | Trigger                                  |
|--------------------------------|------------------------------------------|
| Winter Moratorium              | `today` within season window (policy)    |
| Infant under 12 months         | `household.infantUnder12mo === true`     |
| Serious illness                | `household.seriousIllness === true`      |
| All adults 65+ (no minors)     | `allAdults65Plus === true` AND `anyoneUnder18 === false` |
| Prior-winter HEAP presumption  | `household.heapLastWinter === "yes"`     |

Each protection step carries a "what to say" script key. No protection ever
yields "no action needed" — when one may already apply, its script tells the
user to call the utility to confirm. The municipal-light-plant case still
includes the Winter Moratorium.

_Requirements: 4.1–4.5, 2.6._

### Bill check logic

- Input: optional `household.rateCode`.
- Compare against standard-rate codes listed in policies.
- If on a standard rate AND the discount step is `likely`/`possible`, set
  `billCheckFlag = { onStandardRate: true, messageKey: <hedged retro msg> }`.
- The message is the hedged retroactive-discount copy; it never states an
  amount.

_Requirements: 6.1–6.3._

### Design reference (Figma)

The UI's visual layout is designed in Figma and used as the reference for the
`src/ui/` components.

- **Figma file:** `<ADD FIGMA URL>` _(placeholder — paste the share link)_
- Figma is the source of truth for **layout, spacing, color, typography, and
  visual hierarchy**.
- **Compliance and audience rules override the mock.** Where the Figma design
  omits or contradicts a mandatory element, the spec wins. Non-negotiable
  regardless of the mock: the Heatline on every result screen, the screener
  disclaimer, per-program source link + "verified as of <date>", every dollar
  figure as a range labeled "estimate", hedged language (never "you qualify",
  "guaranteed", "approved", "automatic", or "no action needed"), 360px-wide
  support, ≥44px tap targets, and no hover-only UI.
- If the mock conflicts with these, implement the spec and flag the mismatch to
  the designer rather than shipping the mock as-is.

### UI components (`src/ui/`)

All are mobile-first (works at 360px, ≥44px tap targets, no hover-only UI) and
pull every string from `src/i18n/` (the active locale, `en.json` or `es.json`).
They follow the Figma layout within the compliance constraints above.

- **Screener** — steps through required fields one per screen; protection
  questions are an optional, skippable section. Holds answers in component
  state only (no persistence).
- **ResultLayout** — shared frame wrapping every result screen. Renders the
  screener disclaimer and the Heatline footer (number from policies) so each
  result screen satisfies the compliance footer by construction.
- **UnlockMap** — renders `steps` in order with status, `unlockedBy`, next
  step, estimate range (labeled "estimate"), source link, and "verified as of".
- **Protections** — renders `protections` with each "what to say" script.
- **CliffChart** — Recharts chart from `cliff.ts` data with the 60% SMI
  reference line and above-cliff callouts.
- **BillCheck** — rate-code entry; shows the hedged flag when raised.

_Requirements: 1.1–1.6, 3.1–3.4, 4.1–4.5, 5.1–5.4, 6.1–6.3, 7.1–7.5, 8.7–8.10._

### i18n (`src/i18n/`)

- `en.json` is the source of truth: a flat/namespaced key → string map.
  Components reference keys only.
- Holds hedged phrasing, scripts, disclaimer, and labels — but NOT policy
  numbers, URLs, dates, or the Heatline number (those come from policies at
  render time and are interpolated into strings).
- **Spanish (`es.json`) is generated from `en.json` at build time.** A build
  script (run before `vite build`) produces one Spanish entry per English key
  and writes `es.json`, which is committed as a reviewable artifact so its copy
  can be checked against the compliance rules before release. No runtime
  translation and no network calls.
- A **language toggle** (English ⇄ Spanish, English default) picks the active
  locale. The selected locale is held in in-memory app state only — no
  `localStorage` and no persistence — so a reload returns to English. Switching
  re-renders the current screen in place without losing in-progress answers.
  The toggle is a standard mobile control (≥44px tap target, usable at 360px,
  no hover-only behavior).
- Lookups fall back to the English string when a key is missing from `es.json`,
  never a raw key or missing-text placeholder.
- The compliance constraints apply to both locales: the Spanish copy must
  preserve hedged phrasing and avoid the equivalents of the banned words.
  Generated Spanish is reviewed by a Spanish-speaking reviewer before release,
  not trusted blindly.

_Requirements: cross-cutting (i18n-only strings), 7.1–7.5, 8.1–8.10._

## Data Models

The `Policies` type is the validated union of the six files. Each file is
expected to expose `source_url` and `verified_as_of` plus its domain fields
(income limits, FPL bands, discount tiers with optional `status`, protection
definitions, above-cliff programs, season windows, the Heatline number). Exact
field names are owned by the policy authors; `loadPolicies` validates against
them and the engine reads only through the typed `Policies` object.

## Error Handling

- **Missing/invalid policy data (soft error):** `loadPolicies` throws naming
  file + field; the top-level React error boundary catches it and renders a
  neutral "data unavailable" screen with the Heatline. No white-screen, no
  household data in any error output. Dev builds also console-log the detail.
- **Unknown/`not_sure` utility:** resolved to `possible`/`ask_provider`, never
  a crash.
- **Out-of-range household input** (e.g. size 0, negative income): the screener
  validates inputs; the engine treats them defensively and never throws on
  valid-typed but unusual values (covered by property tests).

## Correctness Properties

These are the canonical invariants `evaluate` must satisfy, verified by the
fast-check property tests P1–P10 (Task 4). They hold for every
`(household, today, policies)`.

### Property 1: Determinism

For any `(household, today, policies)`, two calls to `evaluate` return deeply
equal results.

**Validates: Requirements 2.9**

### Property 2: No clock/global dependence

Output depends only on inputs: varying wall-clock time (not `today`) never
changes output.

**Validates: Requirements 2.9**

### Property 3: Dependency order

`steps` always appear in canonical order (HEAP → discount → AMP → Mass Save);
AMP never precedes the discount, etc.

**Validates: Requirements 2.2**

### Property 4: Unlock soundness

No step is `likely` unless every id in its `unlockedBy` is actually satisfied
by the household/upstream steps.

**Validates: Requirements 2.2, 2.3**

### Property 5: Cliff monotonicity

Holding size fixed, raising income never moves a below-cliff income-gated step
from `not_likely` to `likely` (eligibility doesn't improve as you get richer).

**Validates: Requirements 2.3, 2.5**

### Property 6: Pending ⇒ ask_provider

If the utility's discount tier is pending, the discount step status is always
`ask_provider` and never shows an estimate.

**Validates: Requirements 2.4**

### Property 7: Municipal light plant

For `municipal_light_plant`, IOU discount/AMP/Mass Save are never `likely`, but
the Winter Moratorium protection is always evaluated.

**Validates: Requirements 2.6**

### Property 8: Provenance

Every `ChainStep` (steps, protections, aboveCliff) has a non-empty `sourceUrl`
and `verifiedAsOf`.

**Validates: Requirements 2.7, 7.3**

### Property 9: No-amount hedging

Whenever `billCheckFlag.onStandardRate` is true, no dollar amount appears in
the retroactive message.

**Validates: Requirements 6.3**

### Property 10: Protections never silent

No protection result is ever "no action needed"; HEAP-last-winter still yields
a call-to-confirm step.

**Validates: Requirements 4.4**

## Testing Strategy

Engine tasks 1–5 must pass `npx vitest run` before any UI task begins.
Rules-core tests use fixture `Policies` objects so they never depend on the
real policy files' current values.

### Property tests (`tests/properties/`)

- Implement the ten Correctness Properties (P1–P10) above with fast-check.

### Fixed-date tests (`tests/dates/`)

- Winter Moratorium active on a date inside the season window; inactive just
  outside it (both boundaries), using fixed `today` values and fixture seasons.
- `verifiedAsOf` surfaces unchanged from fixtures.

### UI tests

- `@testing-library/react` + `jsdom`: screener skip-path reaches results;
  ResultLayout always renders disclaimer + Heatline; no step renders a banned
  phrase ("you qualify", "guaranteed", "approved", "automatic").

## Requirements Traceability

| Requirement | Design element |
|-------------|----------------|
| 1 Screener | Screener.tsx, no-persistence state, 360px/44px rules |
| 2 Engine | evaluate.ts pipeline, loadPolicies.ts, types.ts, P1–P8 |
| 3 Unlock map | evaluate steps, UnlockMap.tsx |
| 4 Protections | Protections logic + Protections.tsx, P10 |
| 5 Cliff | cliff.ts + CliffChart.tsx |
| 6 Bill check | Bill check logic + BillCheck.tsx, P9 |
| 7 Result layout | ResultLayout.tsx, i18n, policy-sourced Heatline, P8 |
| 8 Spanish localization | i18n build-time es.json generation + language toggle |

## Decisions and Open Questions

- **RESOLVED — Missing-policy behavior:** soft error. `loadPolicies` throws
  naming file + field; the top-level error boundary shows a neutral "data
  unavailable" screen with the Heatline. Never a hard white-screen crash.
- **RESOLVED — Property invariants:** P1–P10 above are the canonical list.
- **Open — Exact policy field names** (owned by the policy authors): the engine
  will be wired to them once the JSON lands.
