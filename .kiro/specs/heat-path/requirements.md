# Requirements — Heat Path (MHP) MVP

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
  rules engine `evaluate()`; cliff data via `cliff.ts`; all text via i18n.
- **Out of scope (separate/later):** accounts, persistence, advocate mode,
  translations beyond `en.json`, any network calls.

### Cross-cutting constraints (apply to every requirement)

- All numbers, percentages, income limits, dates, and phone numbers come from
  `/policies/*.json`. No literals in `src/`, tests, or this document.
- `evaluate(household, today, policies)` is pure: no `Date.now()`, no `fetch`,
  no globals, no randomness. `today` is passed in as an ISO date string.
- No household data is sent over the network, stored, logged, or placed in
  `localStorage`.
- All user-facing strings come from i18n keys in `src/i18n/en.json`.
- Compliance language: use "likely", "may", "you might qualify"; never "you
  qualify", "guaranteed", "approved", or "automatic".

---

## Requirements

### Requirement 1 — Screener intake

**User Story:** As a stressed parent on my phone, I want to answer a few short
questions one at a time, so that I can get my results without feeling
overwhelmed.

#### Acceptance Criteria

1. WHEN the screener starts THEN the system SHALL collect the required
   Household fields: `size`, `grossAnnualIncome`, `utility`, `heatingFuel`,
   `benefits`, `behindOnBills`, and `heapLastWinter`.
2. WHEN the screener presents the optional protection questions
   (`infantUnder12mo`, `allAdults65Plus`, `seriousIllness`, `rateCode`) THEN
   the system SHALL allow the user to skip them and still reach results.
3. WHEN displayed on a 360px-wide viewport THEN the system SHALL show one
   question per screen with tap targets of at least 44px and no hover-only
   controls.
4. WHEN the user supplies an answer THEN the system SHALL NOT persist, log, or
   transmit it anywhere outside the current in-memory session.
5. IF a user chooses `utility = "not_sure"` THEN the system SHALL still proceed
   and let the rules engine resolve utility-dependent steps as unknown.

### Requirement 2 — Rules engine (`evaluate`)

**User Story:** As a user, I want the app to figure out which programs likely
apply to me and in what order, so that I know where to start.

#### Acceptance Criteria

1. WHEN `evaluate(household, today, policies)` is called THEN the system SHALL
   return a `ChainResult` containing `steps`, `protections`, `aboveCliff`,
   `cliff`, `heatline`, and optionally `billCheckFlag`.
2. WHEN producing `steps` THEN the system SHALL order them in dependency order
   (HEAP → discount → AMP → Mass Save → protections) and set each step's
   `unlockedBy` to the programIds or benefit ids that enable it.
3. WHEN a step's unlocking conditions are met THEN the system SHALL set its
   `status` to `likely`; WHEN partially met or uncertain THEN `possible`;
   WHEN clearly not met THEN `not_likely`.
4. WHEN a utility's discount tiers have `"status": "pending"` in
   `discount-rates.json` THEN the system SHALL set the affected step status to
   `ask_provider` and use the "ask your utility" message key, never a concrete
   discount.
5. WHEN scoring discount eligibility THEN the system SHALL use the Federal
   Poverty Level bands from `fpl-tiers.json`, modeled separately from the 60%
   SMI cliff line.
6. WHEN the household's `utility` is `municipal_light_plant` THEN the system
   SHALL still evaluate the Winter Moratorium protection BUT SHALL NOT present
   investor-owned-utility discount, AMP, or Mass Save steps as if they apply;
   it SHALL direct the user to ask their light plant.
7. WHEN building any step THEN the system SHALL populate `sourceUrl` and
   `verifiedAsOf` from the owning policy file.
8. WHERE a required policy value or its `source_url`/`verified_as_of` is
   missing THEN `loadPolicies` SHALL fail loudly and name the file and field;
   `evaluate` SHALL NOT substitute a default.
9. WHEN `evaluate` runs THEN it SHALL be pure — producing identical output for
   identical `(household, today, policies)` with no side effects.

### Requirement 3 — Unlock map

**User Story:** As a user, I want to see my programs as a chain, so that I
understand what I get now and what unlocks later.

#### Acceptance Criteria

1. WHEN results render THEN the system SHALL display each `ChainStep` in
   dependency order showing: its status, what unlocked it (`unlockedBy`), the
   next step (`nextStepKey`), the estimate range, the source link, and
   "verified as of <date>".
2. WHEN a step has an `estimate` THEN the system SHALL render it as a low–high
   range labeled "estimate"; WHEN `estimate` is null THEN the system SHALL omit
   the dollar figure rather than show zero.
3. WHEN a step status is `ask_provider` THEN the system SHALL show the
   "ask your utility / light plant" guidance instead of an eligibility claim.
4. WHEN any step is shown THEN the system SHALL use hedged language and SHALL
   NOT use "you qualify", "guaranteed", "approved", or "automatic".

### Requirement 4 — Protection checker

**User Story:** As a user worried about losing heat, I want to know which
shutoff protections may cover me and exactly what to say, so that I can act.

#### Acceptance Criteria

1. WHEN the protection checker runs THEN the system SHALL evaluate the Winter
   Moratorium, infant-under-12-months, serious-illness, all-adults-65+, and the
   prior-winter HEAP hardship presumption using values from
   `protections.json` and `seasons.json`.
2. WHEN a protection may apply THEN the system SHALL show a "what to say"
   script for contacting the utility.
3. WHEN a protection may already apply (e.g. HEAP last winter) THEN the system
   SHALL NOT tell the user "no action needed"; it SHALL tell them to call the
   utility to confirm.
4. WHEN any protection result is shown THEN the system SHALL display the
   Massachusetts Heatline number sourced from policies.

### Requirement 5 — Cliff view

**User Story:** As a user, I want to see where the income cliff is, so that I
understand how close I am to losing the chain and what exists above it.

#### Acceptance Criteria

1. WHEN the cliff view renders THEN the system SHALL display, for this
   household size, estimated yearly energy cost versus income, with the 60% SMI
   line marked, using data from `cliff.ts`.
2. WHEN the household income is above the 60% SMI line THEN the system SHALL
   surface the above-cliff programs (Good Neighbor Energy Fund, Middle-Income
   Heating Oil Relief) from `above-cliff.json`.
3. WHEN the chart renders THEN it SHALL be built with Recharts and remain
   legible at 360px width.
4. WHEN `cliff.ts` computes chart data THEN it SHALL be a pure function reading
   limits from policies, with no hardcoded thresholds.

### Requirement 6 — Bill check

**User Story:** As a user, I want to check my rate code, so that I learn if I
am paying the standard rate when I could be on a discount.

#### Acceptance Criteria

1. WHEN the user enters a rate code (e.g. "R-1" or "R-2") THEN the system SHALL
   compare it against the standard-rate codes in policies.
2. IF the user is on a standard rate AND likely eligible for the discount THEN
   the system SHALL set `billCheckFlag.onStandardRate = true` and show the
   corresponding message key.
3. WHEN the bill-check flag is raised THEN the system SHALL show the hedged
   retroactive-discount message ("You may be owed money. Contact your HEAP
   agency or legal aid.") and SHALL NOT state an amount.

### Requirement 7 — Result layout and compliance footer

**User Story:** As a user, I want every result screen to tell me it is not a
guarantee and give me a number to call, so that I know what to trust and where
to go.

#### Acceptance Criteria

1. WHEN any result screen renders THEN the system SHALL display the
   Massachusetts Heatline (1-800-632-8175) sourced from policies.
2. WHEN any result screen renders THEN the system SHALL display a disclaimer
   that Heat Path is a screener and not legal advice or an eligibility
   decision.
3. WHEN any program is shown THEN the system SHALL display its official source
   link and "verified as of <date>".
4. WHEN any dollar figure is shown THEN the system SHALL present it as a range
   labeled "estimate".
5. WHEN any screen ends THEN the system SHALL present one clear next step and a
   phone number, in warm, non-blaming, ~6th-grade-level language.
