---
inclusion: fileMatch
fileMatchPattern: "(policies|src/rules)/**"
---
# Program sources

Rules must trace to these files. Each policy file has `source_url` and
`verified_as_of`.

#[[file:policies/heap-fy2027.json]]
#[[file:policies/fpl-tiers.json]]
#[[file:policies/discount-rates.json]]
#[[file:policies/protections.json]]
#[[file:policies/above-cliff.json]]
#[[file:policies/seasons.json]]

## Policy data is READ-ONLY

- The `/policies/*.json` files are hand-written and human-verified.
  Read them. NEVER create, edit, or overwrite them, not even as a
  "temporary" placeholder.
- Every number, percentage, income limit, date, and phone number used
  anywhere in `src/` comes from `/policies`. Never write such a literal
  in `src/`, in tests, or in requirements.
- If a required value is missing (including `source_url` or
  `verified_as_of`), STOP. Name the exact file and field and ask the
  human. Do not invent, guess, or substitute a placeholder.
- A discount tier with `"status": "pending"` must produce a step status
  of `ask_provider` with the "ask your utility" message. Never show it
  as a concrete discount.
- Discount eligibility uses Federal Poverty Level bands
  (`fpl-tiers.json`), not only the 60% State Median Income line. Model
  both.
