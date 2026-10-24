# Compliance (always applies)

- Heat Path is not legal advice and never promises eligibility.
  Use "likely", "may", "you might qualify". Never "you qualify",
  "guaranteed", "approved", or "automatic".
- Never tell a user "no action needed" about any shutoff protection. Even
  when protection may already apply (HEAP last winter), say to call the
  utility to confirm.
- Every result screen shows the Massachusetts Heatline: 1-800-632-8175.
- Every dollar figure is a range and labeled "estimate".
- Every program shown links to its official source and shows
  "verified as of <date>".
- Municipal light plant customers: the Winter Moratorium applies, but do NOT
  show investor-owned-utility discount, AMP, or Mass Save rules as if they
  apply. Tell them to ask their light plant.
- Retroactive discount money: hedge. "You may be owed money. Contact your
  HEAP agency or legal aid." Never state an amount.
- A utility whose discount tiers have `"status": "pending"` gets the
  status `ask_provider` and the "ask your utility" message. Do not show a
  concrete discount for it.
- Discount eligibility is scored on Federal Poverty Level bands
  (`fpl-tiers.json`), not only the 60% State Median Income cliff line.
  Model both, and don't conflate the two thresholds in what the user sees.