# MassHP
Hackachussets 2026 - Civic Services Project: Massachustes Heat Path Program

Notes for A:

1. ~~The screener needs a “Does anyone under 18 live with you?” question, to tell the two 65+ protections apart.~~ **DONE** — reflected in the spec (`requirements.md`, `design.md`, `tasks.md`).
2. ~~Only National Grid, municipal light plant, and not sure are utility options.~~ **DONE** — reflected in the spec.
3. ~~The policy loader must resolve every season_ref and fail loudly on a missing key, and there should be a test that checks every reference.~~ **DONE** — `loadPolicies` resolves every `season_ref` and throws a typed `PolicyError`; covered by `tests/loadPolicies.test.ts`.
4. ~~Discount lookups use today, so add April 30 and May 1, 2027 to the date tests.~~ **DONE (data-level)** — boundary pinned in `tests/dates/discount-tier-dates.test.ts`. Note: `evaluate()` does not yet surface the active `discount_pct` by date (discount step is eligibility-only, `estimate: null`); the test guards the data and the boundary until a later task consumes it.

## TODO

- Add the Figma design link here once it's ready. The UI track uses Figma as
  the visual reference, and the spec has two `<ADD FIGMA URL>` placeholders
  (`.kiro/specs/heat-path/design.md` and `tasks.md`) to update at the same time.
