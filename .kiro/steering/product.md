# Product: Massachusetts Heat Path Program (Heat Path, MHP)

Heat Path shows a Massachusetts household its chain of linked home-energy
programs: HEAP fuel assistance -> utility discount rate -> Arrearage
Management Program (debt forgiveness) -> free efficiency upgrades
(Mass Save income-eligible) -> shutoff protections. It shows what is likely
available, in order, with the next step, and shows the 60% State Median
Income cliff where most of the chain is lost at once.

Users: (1) a stressed parent on a phone (PRIMARY — build for this user),
(2) caseworkers at community action agencies (advocate mode).

Scope note: advocate mode is a SEPARATE later spec. Do not build its UI
now. But design the rules engine (`evaluate()`) to be reusable so advocate
mode can call it unchanged later.

Heat Path is a screener, not an eligibility decision. Local agencies and
utilities decide eligibility.