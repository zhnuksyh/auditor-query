# Case Design: what makes a case *harder*

`_TEMPLATE.md` covers the **mechanics** of a case: the fields to fill in, the
schema format, how unlocks are wired. This document covers the **design**: how
to pitch a new case above the last one, and the rules that keep it solvable.

Read `AUDIT_PRACTICE.md` first for what real IT audit work looks like and where
its difficulty lives. Read this before writing a case. Fill in `_TEMPLATE.md`
after.

Some lessons below come from Detective Query, the murder-mystery game this
project forked from, whose eight cases were the first test bed for these rules.
Where a lesson was learned there, it says so.

---

## Two kinds of difficulty

These are independent, and confusing them is the easiest mistake to make.

**Mechanical difficulty: "which query do I have to write?"**
How advanced the SQL is. A case needing `GROUP BY … HAVING` is mechanically
harder than one needing a `WHERE` clause.

**Deductive difficulty: "even with the right query, is the answer obvious?"**
How much reasoning is left *after* the SQL runs. A case where the exception is
the only row returned is deductively trivial no matter how clever the query was.

A case can be hard in one and easy in the other. The best cases raise both.

> **The failure mode to watch for:** you write a genuinely advanced query shape,
> and it returns exactly one row. The player types clever SQL and the game
> hands them the answer. It *feels* hard to author and plays as easy.

### Measuring deductive difficulty

Run the **first obvious query** a player would try, the one-table filter the
narrative points at ("who held that entitlement during the audit period?"), and
count the candidates it returns. That number is your deductive difficulty.

| Survivors | Verdict |
|---|---|
| 0 | Fine only as deliberate misdirection: the obvious test passes, and the case is about why that proves nothing. |
| 1 | Trivial. The case named the exception. Add candidates. |
| 2–3 | Good. Forces an intersection of evidence sets. |
| 4+ | Strong, if each is eliminated by a *different* kind of evidence. |

Where the shipped cases actually land:

| Case | First obvious query | Survivors |
|---|---|---|
| 01 The Leaver | left in March, account still enabled | 2 |
| 02 The Green Light | released to Claims Engine in the audit week | 3 |
| 03 Rubber Stamp | reviewers who revoked nothing | 2 |
| 04 Paper Trail | approval dated after deployment | 2, both compliant emergency changes |
| 05 Both Sides | users holding both conflicting roles | 3 |
| 06 The Missing Row | leavers on the report disabled late | 0; the report is the problem |
| 07 Two at Once | generic-account sessions that evening | 4 |
| 08 Nothing Taken Away | users whose role count rose | 3 |
| 09 Restore Point | failed backup jobs | 1, on the wrong system (explained) |
| 10 Tolerance | config changes without a ticket, in the app audit | 0; the log is incomplete |

Every case needs an intersection to reach the exception. Cases 04, 06 and 10
are the deliberate zeros, and Case 09 the deliberate wrong lead: the obvious
test clears everyone or points elsewhere, which is exactly the false comfort
the case is about.

In Detective Query, two cases shipped with a single survivor and had to be
rebalanced by adding candidates *after* the fact. That is more delicate than
designing the field in from the start: every added row has to be checked
against the proving queries so the intended solution stays unique. Run this
measure while you are seeding the tables, not after.

---

## The four dials

Turn **one or two** per case. Turning all four at once produces a case that is
exhausting rather than hard. `AUDIT_PRACTICE.md` adds a fifth kind of dial, the
**realism dial** (population completeness, explained deviations, time logic and
so on); pair one with each new query shape.

### 1. Query shape (the primary dial)

Each case should need a SQL construct no earlier case required. This is the
backbone of the ladder and the reason the game teaches anything.

| Case | New shape introduced |
|---|---|
| 01 | `WHERE` filter + a single `JOIN` |
| 02 | multi-table triangulation, comparing an attribute across joined tables |
| 03 | `GROUP BY … HAVING` with `COUNT`, `MIN`, `MAX` and a conditional `SUM` |
| 04 | aggregate **alias** (`MIN(edited_at) AS first_entered`), where MIN vs MAX matters |
| 05 | `SUM … HAVING` + a TEXT join (`vendors.bank_account = payroll_accounts.bank_account`) |
| 06 | anti-join / absence (`LEFT JOIN … IS NULL`), `NOT EXISTS`, date arithmetic |
| 07 | **self-join** (a table against itself), `EXCEPT` |
| 08 | **window function**: `LAG() OVER (PARTITION BY … ORDER BY …)`, subquery-wrapped |
| 09 | **CTE** (`WITH … AS`): a per-system baseline every row is compared against |
| 10 | `UNION ALL`: two logs stacked into one complete population |

**Still unused, roughly in order of difficulty:** `LEAD`, `ROW_NUMBER`,
`RANK`, recursive CTEs (probably a step too far for players; Case 09 uses one
only to seed its data).

sql.js ships SQLite **3.49.1**, and `LAG`, `LEAD`, `ROW_NUMBER`, `PARTITION BY`
and CTEs are all confirmed working; no need to re-check before using them.

A self-join pairs naturally with any log where two rows must be compared with
each other: two sessions overlapping (Case 07), a value changing, a state
flipping.

Reach for a window function whenever the answer lives *between* two consecutive
rows rather than inside either one. Case 08's snapshots only mean something next
to the previous quarter's. SQLite won't let you filter on a window alias in the
same `WHERE`, so the query has to wrap it in a subquery, which is itself a
useful difficulty step.

### 2. Evidence sets to intersect

The exception must never fall out of a single filter. Case 05 is the model:
three users hold both conflicting roles, two exercised the conflict, one of
those has an approved exception, and then the bank-account match seals it.

Design rule: **keep more than one candidate per single-table filter**, so
presence alone never convicts. Three sets of 2–3 candidates intersecting to one
account is the sweet spot.

### 3. Misdirection

The most memorable dial and the most expensive to author. Case 04 is the
standout: every ticket's approval is dated before deployment, the obvious query
clears every standard change, and only the system audit trail shows one
approval was created after go-live and typed backwards.

Variants worth trying: a control test that passed on an incomplete population
(Case 06); a sign-off whose timestamps show it could not have been a real
review (Case 03); a corroborating record whose own history contradicts it.

Use sparingly: one misdirection per case, at most.

### 4. Table and row count (the weakest dial)

Going 7 tables to 9 adds tedium, not difficulty. The shipped cases sit at 3–7
tables and get harder purely through shape and intersection.
**Do not reach for this dial to make a case harder.**

---

## Hard constraints

Violate these and the case breaks.

- **Exactly one planted contradiction**, discoverable *only* by querying. Never
  state it outright in the narrative.
- **Every fact the player must deduce appears in the scope-memo prose** in
  plain language. The database makes it queryable; the story makes it findable.
  If a fact is only in the tables, players won't know to look for it.
- **Neither the memo nor the Finding template may name the exception.** The
  Finding tab is visible from the start. A date, time, amount, count or product
  in the template is a free filter: Case 02's template drafted with the
  release's date, and Case 03's with the reviewer's six-minute window.
- **Times are compared as TEXT.** `'HH:MM'` and `'YYYY-MM-DD HH:MM'` compare
  correctly as strings, but never seed an `'HH:MM'` window spanning midnight
  (`'23:30'`–`'03:00'`) or every gap/overlap filter silently breaks. Use full
  timestamps or clamp to same-day times.
- **Don't let a plain `SELECT *` unlock a blank you want earned.** Key it on a
  column name that exists in no table and name the alias in the hint: an
  aggregate (`lines_certified`, `first_entered`, `self_approved_total`) or a
  plain aliased column (`orphan_account`, `signed_off_by`). `SELECT MAX(x)`
  *without* the alias deliberately does not unlock.

  Players see each blank's `label` and alias under the Finding at all times,
  and its `hint` on request. So the alias and label must not give the answer
  away (`orphan_account`, not `brecht_account`), and the hint should point at
  the method, not the row.

  This applies to **every** blank, not just the aggregate ones. A blank keyed on
  a raw column like `username` or `reviewer` is unlocked by a bare dump of that
  table, and the player is handed an answer for typing `SELECT *`. Case 01
  drafted that way: `SELECT * FROM accounts` alone unlocked four of its five
  blanks while the rest of the suite stayed green. `npm test` now runs a
  `SELECT *` against every table of every case and fails if anything unlocks.
- **No proving query may give away a LATER answer.** Blanks are declared in the
  intended solve order, and a query may only unlock blanks at or before its own
  position. Unlocking a later blank hands the player an answer they haven't
  earned, usually because a helper query selected a column it didn't need.

  Unlocking an *earlier* blank is fine and often unavoidable: Case 02's deployer
  query filters `WHERE d.change_ref = 'CHG-4388'`, so only someone who already
  found that reference can write it.

  When two blanks are genuinely **one deduction** (Case 03's reviewer and line
  count come from the same `GROUP BY` row; Case 04's change and the moment its
  approval first existed come from the same aggregate), declare
  `coUnlocksWith: 'otherKey'` rather than splitting the query into busywork.

  `npm test` enforces all of this. It found real leaks in five of Detective
  Query's seven cases the first time it ran, so do not rely on spotting them by
  eye.
- **Every deduction must be UNIQUE in the data, not just in your proving query.**
  `npm test` only checks that your query unlocks its blank; it cannot tell you
  that the *general* form of the same question returns three rows. A Detective
  Query case nearly shipped with three rows answering the same question; the
  proving query looked fine because it filtered on a value only the author knew
  to use. Run the honest, unfiltered version of each deduction and confirm it
  returns exactly one row. Incidental noise elsewhere in the seed data is how a
  case becomes ambiguous without any test failing.
- **The locked dropdown must hide the correct answer**, or players can guess
  past the anti-cheat.
- **Every blank needs a `provingQuery`**, and `npm test` must pass. The suite
  builds the real schema and verifies the case is actually solvable.

---

## Checklist for a new case

Mechanical:

- [ ] Needs a query shape no earlier case required.
- [ ] Every blank has a `provingQuery`; `npm test` passes.
- [ ] Every blank is keyed on an alias that exists in no table, named in its hint.
- [ ] No proving query unlocks a blank that comes later in the solve order
      (`npm test` checks this; use `coUnlocksWith` for genuine shared deductions).
- [ ] No `'HH:MM'` window crosses midnight.
- [ ] `targetValue` is in `options` for every blank.
- [ ] Any SQL the case needs that the Audit Manual does not teach is added to
      `CLAUSES` in `src/screens/Guide.jsx`, and every new term to `GLOSSARY`.

Deductive:

- [ ] The first obvious query returns **2 or more** candidates, or 0 by design.
- [ ] The exception is identified by an **intersection**, not a single filter.
- [ ] Every fact needed is in the narrative prose.
- [ ] Neither the memo nor the template names the exception or a value that
      filters straight to it.
- [ ] The contradiction cannot be spotted without running a query.
- [ ] A player who guesses the most suspicious-sounding account is wrong.
- [ ] The unfiltered form of every deduction returns exactly **one** row:
      no second row anywhere in the seed data answers the same question.
