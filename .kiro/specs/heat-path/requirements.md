# Requirements Document

## Introduction

Heat Path is a phone-first web app that screens a Massachusetts household and
shows its chain of linked home-energy programs in dependency order:

HEAP fuel assistance → utility discount rate → Arrearage Management Program
(AMP, debt forgiveness) → Mass Save income-eligible upgrades → shutoff
protections.

For each step it shows what is **likely** available, what unlocked it, the
next concrete step, an estimate range, an official source, and a "verified as
of" date. It also shows the 60% State Median Income (SMI) cliff — where most
of the chain is lost at once — and the programs that exist above the cliff
(Good Neighbor Energy Fund, Middle-Income Heating Oil Relief).

Heat Path is a **screener, not an eligibility decision**. Local agencies and
utilities decide eligibility.

### Scope

- **In scope:** the single phone-parent user; the six features below; a pure
  rules engine `evaluate()`; cliff data via `cliff.ts`; all text via i18n in
  English and Spanish.
- **Out of scope (separate/later):** accounts, persistence, advocate mode, any
  network calls.

Heat Path is a web app built with Vite + React in TypeScript (not a
server-rendered or native app); everything runs in the browser.

### Cross-cutting constraints (apply to every requirement)

- All numbers, percentages, income limits, dates, and phone numbers come from
  `/policies/*.json`. No literals in `src/`, tests, or this document.
- `evaluate(household, today, policies)` is pure: no `Date.now()`, no `fetch`,
  no globals, no randomness. `today` is passed in as an ISO date string.
- No household data is sent over the network, stored, logged, or placed in
  `localStorage`.
- All user-facing strings come from i18n keys in `src/i18n/`. English
  (`en.json`) is the source of truth; Spanish (`es.json`) is generated from it
  at build time (see Requirement 8).
- Compliance language: use "likely", "may", "you might qualify"; never "you
  qualify", "guaranteed", "approved", or "automatic".

## Glossary

- **Heat Path (MHP):** this app — the Massachusetts Heat Path Program screener.
- **HEAP:** Home Energy Assistance Program — fuel assistance; the first link in
  the chain and a common unlocker for later programs.
- **Utility discount rate:** a reduced electric/gas rate for income-eligible
  customers of an investor-owned utility.
- **AMP:** Arrearage Management Program — forgives past-due utility debt over
  time for enrolled customers.
- **Mass Save (income-eligible):** no-cost home energy-efficiency upgrades for
  qualifying households.
- **Shutoff protections:** rules that prevent a utility from shutting off
  service (e.g. Winter Moratorium, infant under 12 months, serious illness,
  all adults 65+, prior-winter HEAP hardship presumption).
- **Winter Moratorium:** a seasonal protection period during which utilities
  may not shut off service for eligible households.
- **SMI (State Median Income):** the income benchmark whose 60% line is the
  "cliff" where most of the chain is lost at once.
- **60% SMI cliff:** the income threshold above which the linked chain largely
  drops away; above it, only the above-cliff programs remain.
- **FPL (Federal Poverty Level):** the income bands used to score utility
  discount tiers, modeled separately from the 60% SMI line.
- **Above-cliff programs:** help for households above the 60% SMI line — the
  Good Neighbor Energy Fund and the Middle-Income Heating Oil Relief program.
- **Municipal light plant:** a municipally owned utility; the Winter Moratorium
  applies, but investor-owned-utility discount/AMP/Mass Save rules do not.
- **Heatline:** the Massachusetts energy assistance phone line shown on every
  result screen (number sourced from policies).
- **`evaluate()`:** the pure rules engine function
  `evaluate(household, today, policies) => ChainResult`.
- **ChainResult / ChainStep:** the engine's output — the ordered chain of
  program steps plus protections, above-cliff programs, and cliff data.
- **Policies:** the validated, in-memory shape of the `/policies/*.json` files;
  the single source of every number, date, URL, and phone number.

## Requirements

### Requirements 1:

**User Story:** As a stressed parent on my phone, I want to answer a few short
questions one at a time, so that I can get my results without feeling
overwhelmed.

### Acceptance Criteria

1. WHEN the screener starts THE SYSTEM SHALL collect the required Household
   fields: `size`, `grossAnnualIncome`, `utility`, `heatingFuel`, `benefits`,
   `behindOnBills`, `heapLastWinter`, and `anyoneUnder18` ("Does anyone under
   18 live with you?").
2. WHEN the screener presents `utility` THE SYSTEM SHALL offer only the options
   National Grid (`national_grid`), municipal light plant
   (`municipal_light_plant`), and not sure (`not_sure`).
3. WHEN the screener presents the optional protection questions
   (`infantUnder12mo`, `allAdults65Plus`, `seriousIllness`, `rateCode`) THE
   SYSTEM SHALL allow the user to skip them and still reach results.
4. WHEN displayed on a 360px-wide viewport THE SYSTEM SHALL show one question
   per screen with tap targets of at least 44px and no hover-only controls.
5. WHEN the user supplies an answer THE SYSTEM SHALL NOT persist, log, or
   transmit it anywhere outside the current in-memory session.
6. IF a user chooses `utility = "not_sure"` THE SYSTEM SHALL still proceed and
   let the rules engine resolve utility-dependent steps as unknown.

### Requirements 2:

**User Story:** As a user, I want the app to figure out which programs likely
apply to me and in what order, so that I know where to start.

### Acceptance Criteria

1. WHEN `evaluate(household, today, policies)` is called THE SYSTEM SHALL
   return a `ChainResult` containing `steps`, `protections`, `aboveCliff`,
   `cliff`, `heatline`, and optionally `billCheckFlag`.
2. WHEN producing `steps` THE SYSTEM SHALL order them in dependency order
   (HEAP → discount → AMP → Mass Save → protections) and set each step's
   `unlockedBy` to the programIds or benefit ids that enable it.
3. WHEN a step's unlocking conditions are met THE SYSTEM SHALL set its `status`
   to `likely`; WHEN partially met or uncertain THE SYSTEM SHALL set it to
   `possible`; WHEN clearly not met THE SYSTEM SHALL set it to `not_likely`.
4. WHEN a utility's discount tiers have `"status": "pending"` in
   `discount-rates.json` THE SYSTEM SHALL set the affected step status to
   `ask_provider` and use the "ask your utility" message key, never a concrete
   discount.
5. WHEN scoring discount eligibility THE SYSTEM SHALL use the Federal Poverty
   Level bands from `fpl-tiers.json`, modeled separately from the 60% SMI
   cliff line.
6. WHEN the household's `utility` is `municipal_light_plant` THE SYSTEM SHALL
   still evaluate the Winter Moratorium protection BUT SHALL NOT present
   investor-owned-utility discount, AMP, or Mass Save steps as if they apply;
   it SHALL direct the user to ask their light plant.
7. WHEN building any step THE SYSTEM SHALL populate `sourceUrl` and
   `verifiedAsOf` from the owning policy file.
8. IF a required policy value or its `source_url`/`verified_as_of` is missing
   THE SYSTEM SHALL fail loudly in `loadPolicies`, naming the file and field,
   and SHALL NOT substitute a default in `evaluate`.
9. WHEN `evaluate` runs THE SYSTEM SHALL be pure — producing identical output
   for identical `(household, today, policies)` with no side effects.

### Requirements 3:

**User Story:** As a user, I want to see my programs as a chain, so that I
understand what I get now and what unlocks later.

### Acceptance Criteria

1. WHEN results render THE SYSTEM SHALL display each `ChainStep` in dependency
   order showing: its status, what unlocked it (`unlockedBy`), the next step
   (`nextStepKey`), the estimate range, the source link, and "verified as of
   <date>".
2. WHEN a step has an `estimate` THE SYSTEM SHALL render it as a low–high range
   labeled "estimate"; WHEN `estimate` is null THE SYSTEM SHALL omit the dollar
   figure rather than show zero.
3. WHEN a step status is `ask_provider` THE SYSTEM SHALL show the "ask your
   utility / light plant" guidance instead of an eligibility claim.
4. WHEN any step is shown THE SYSTEM SHALL use hedged language and SHALL NOT use
   "you qualify", "guaranteed", "approved", or "automatic".

### Requirements 4:

**User Story:** As a user worried about losing heat, I want to know which
shutoff protections may cover me and exactly what to say, so that I can act.

### Acceptance Criteria

1. WHEN the protection checker runs THE SYSTEM SHALL evaluate the Winter
   Moratorium, infant-under-12-months, serious-illness, all-adults-65+, and the
   prior-winter HEAP hardship presumption using values from `protections.json`
   and `seasons.json`.
2. WHEN evaluating the all-adults-65+ protection THE SYSTEM SHALL treat it as
   applicable only when `allAdults65Plus === true` AND `anyoneUnder18 ===
   false`, since a household with a minor present is not an all-65+ household.
3. WHEN a protection may apply THE SYSTEM SHALL show a "what to say" script for
   contacting the utility.
4. WHEN a protection may already apply (e.g. HEAP last winter) THE SYSTEM SHALL
   NOT tell the user "no action needed"; it SHALL tell them to call the utility
   to confirm.
5. WHEN any protection result is shown THE SYSTEM SHALL display the
   Massachusetts Heatline number sourced from policies.

### Requirements 5:

**User Story:** As a user, I want to see where the income cliff is, so that I
understand how close I am to losing the chain and what exists above it.

### Acceptance Criteria

1. WHEN the cliff view renders THE SYSTEM SHALL display, for this household
   size, estimated yearly energy cost versus income, with the 60% SMI line
   marked, using data from `cliff.ts`.
2. WHEN the household income is above the 60% SMI line THE SYSTEM SHALL surface
   the above-cliff programs (Good Neighbor Energy Fund, Middle-Income Heating
   Oil Relief) from `above-cliff.json`.
3. WHEN the chart renders THE SYSTEM SHALL build it with Recharts and keep it
   legible at 360px width.
4. WHEN `cliff.ts` computes chart data THE SYSTEM SHALL do so as a pure function
   reading limits from policies, with no hardcoded thresholds.

### Requirements 6:

**User Story:** As a user, I want to check my rate code, so that I learn if I
am paying the standard rate when I could be on a discount.

### Acceptance Criteria

1. WHEN the user enters a rate code (e.g. "R-1" or "R-2") THE SYSTEM SHALL
   compare it against the standard-rate codes in policies.
2. IF the user is on a standard rate AND likely eligible for the discount THE
   SYSTEM SHALL set `billCheckFlag.onStandardRate = true` and show the
   corresponding message key.
3. WHEN the bill-check flag is raised THE SYSTEM SHALL show the hedged
   retroactive-discount message ("You may be owed money. Contact your HEAP
   agency or legal aid.") and SHALL NOT state an amount.

### Requirements 7:

**User Story:** As a user, I want every result screen to tell me it is not a
guarantee and give me a number to call, so that I know what to trust and where
to go.

### Acceptance Criteria

1. WHEN any result screen renders THE SYSTEM SHALL display the Massachusetts
   Heatline (sourced from policies).
2. WHEN any result screen renders THE SYSTEM SHALL display a disclaimer that
   Heat Path is a screener and not legal advice or an eligibility decision.
3. WHEN any program is shown THE SYSTEM SHALL display its official source link
   and "verified as of <date>".
4. WHEN any dollar figure is shown THE SYSTEM SHALL present it as a range
   labeled "estimate".
5. WHEN any screen ends THE SYSTEM SHALL present one clear next step and a phone
   number, in warm, non-blaming, ~6th-grade-level language.

### Requirements 8:

**User Story:** As a Spanish-speaking parent, I want the app in Spanish, so that
I can understand my options in my own language.

### Acceptance Criteria

1. WHEN the app builds THE SYSTEM SHALL generate `src/i18n/es.json` from
   `src/i18n/en.json` at build time, with one Spanish entry per English key.
2. WHEN `es.json` is generated THE SYSTEM SHALL commit it as a reviewable
   artifact so a Spanish-speaking reviewer can check its copy for compliance
   before release.
3. WHEN generating Spanish copy THE SYSTEM SHALL NOT make any network call at
   runtime; translation happens only at build time.
4. WHEN Spanish copy is produced THE SYSTEM SHALL preserve the compliance
   constraints — hedged phrasing and no equivalent of "you qualify",
   "guaranteed", "approved", "automatic", or "no action needed".
5. WHEN the user selects a language THE SYSTEM SHALL render all strings from the
   matching locale file, defaulting to English if a key is missing from
   `es.json`.
6. IF an English key has no corresponding Spanish entry THE SYSTEM SHALL fall
   back to the English string rather than show a missing-key placeholder.
7. WHEN any screen renders THE SYSTEM SHALL show a language toggle for switching
   between English and Spanish, with English as the default.
8. WHEN the user activates the language toggle THE SYSTEM SHALL re-render the
   current screen in the chosen language without losing the user's in-progress
   answers or navigating away.
9. WHEN the app loads or reloads THE SYSTEM SHALL default to English, since the
   selected language is held in memory only and is never stored (no
   `localStorage`, no persistence).
10. WHEN the language toggle renders THE SYSTEM SHALL meet the mobile
    constraints — a tap target of at least 44px, usable at 360px width, and no
    hover-only behavior.
