- TypeScript (strict mode), Vite + React (react-ts template).
- Tailwind CSS via `@tailwindcss/vite`.
- Recharts for the cliff chart.
- Tests: Vitest + fast-check (property-based tests),
  `@testing-library/react`, `jsdom`. Run the suite with `npx vitest run`.
- The rules engine is a pure function in `src/rules/evaluate.ts`:
  `evaluate(household, today, policies) -> ChainResult`.
  It must be PURE: no `Date.now()`, no `fetch`, no globals, no
  randomness. `today` (an ISO date string) is always passed in. The UI
  passes the real date; tests pass fake dates.
- `src/rules/cliff.ts` is a pure function that produces cliff chart data.
- All policy numbers live in `/policies/*.json`. Never hardcode a dollar
  amount, percentage, income limit, or date in `src/`. Read it from
  `/policies`.
- No household data is sent over the network, stored, or logged. No
  `localStorage`. Everything runs in the browser.
- No user-facing strings in components. All text comes from i18n keys in
  `src/i18n/en.json`.
- NEVER edit a property test to make it pass. If a property fails, show
  the shrunk counterexample, fix the code, or stop and ask the human
  whether the requirement is wrong.
