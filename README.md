# MassHP
Hackachussets 2026 - Civic Services Project: Massachustes Heat Path Program

Notes for A:

1. ~~The screener needs a “Does anyone under 18 live with you?” question, to tell the two 65+ protections apart.~~ **DONE** — reflected in the spec (`requirements.md`, `design.md`, `tasks.md`).
2. ~~Only National Grid, municipal light plant, and not sure are utility options.~~ **DONE** — reflected in the spec.
3. The policy loader must resolve every season_ref and fail loudly on a missing key, and there should be a test that checks every reference.
4. Discount lookups use today, so add April 30 and May 1, 2027 to the date tests.

## TODO

- Add the Figma design link here once it's ready. The UI track uses Figma as
  the visual reference, and the spec has two `<ADD FIGMA URL>` placeholders
  (`.kiro/specs/heat-path/design.md` and `tasks.md`) to update at the same time.
