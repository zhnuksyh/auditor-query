# Case Design — what makes a case *harder*

> **Note on the examples.** This document carried over from Detective Query, the
> murder-mystery game this project forked from, and its worked examples still
> cite those eight cases. They are kept deliberately: the design rules are about
> SQL shape and deduction, not about the theme, and the cases are real evidence
> for them. Read "killer" as "the exception" and "suspect" as "the account" — the
> reasoning transfers exactly. Phase 3 replaces the table as audit cases ship.

`_TEMPLATE.md` covers the **mechanics** of a case: the fields to fill in, the
schema format, how unlocks are wired. This document covers the **design** — how
to pitch a new case above the last one, and the rules that keep it solvable.

Read this before writing a case. Fill in `_TEMPLATE.md` after.

---

## Two kinds of difficulty

These are independent, and confusing them is the easiest mistake to make.

**Mechanical difficulty — "which query do I have to write?"**
How advanced the SQL is. A case needing `GROUP BY … HAVING` is mechanically
harder than one needing a `WHERE` clause.

**Deductive difficulty — "even with the right query, is the answer obvious?"**
How much reasoning is left *after* the SQL runs. A case where the killer is the
only row returned is deductively trivial no matter how clever the query was.

A case can be hard in one and easy in the other. The best cases raise both.

> **The failure mode to watch for:** you write a genuinely advanced query shape,
> and it returns exactly one row. The player types clever SQL and the game
> hands them the answer. It *feels* hard to author and plays as easy.

### Measuring deductive difficulty

Run the **first obvious query** a player would try — the one-table filter the
narrative points at (who held that entitlement during the audit period?) — and
count the candidates it returns. That number is your deductive difficulty.

| Survivors | Verdict |
|---|---|
| 1 | Trivial. The case named the exception. Add candidates. |
| 2–3 | Good. Forces an intersection of evidence sets. |
| 4+ | Strong, if each is eliminated by a *different* kind of evidence. |

Where the shipped cases actually land:

| Case | First obvious query | Survivors |
|---|---|---|
| 01 Midnight Drift | keycard in East Wing during TOD | 1 — fine, it's the tutorial |
| 02 A Long Way Down | rode the elevator to Floor 7 | 3 |
| 03 Terminal Velocity | badged into Stairwell C | 6 |
| 04 Dead Signal | phone at Dockside in the real window | 2 |
| 05 Zero Sum | in the pantry during the dosing window | 3 |
| 06 The Archivist | in the vault during TOD | 3 |
| 07 Slack Water | upstream of Jetty 4 during the ebb | 3 |
| 08 The Long Shift | badged onto Ward 3B during the TOD window | 4 |

Case 01 gets a pass — it is the tutorial, and it should feel solvable. Every
other case sits at 2 or more, so the killer always requires an intersection.

Both Case 02 and Case 06 originally shipped at 1 and had to be rebalanced by
adding candidates *after* the fact, which is more delicate than designing the
field in from the start: every added row has to be checked against the proving
queries so the intended solution stays unique. Run this measure while you are
seeding the tables, not after.

---

## The four dials

Turn **one or two** per case. Turning all four at once produces a case that is
exhausting rather than hard.

### 1. Query shape (the primary dial)

Each case should need a SQL construct no earlier case required. This is the
backbone of the ladder and the reason the game teaches anything.

| Case | New shape introduced |
|---|---|
| 01 | `WHERE` filter + a single `JOIN` |
| 02 | multi-table triangulation (5 joins) |
| 03 | `GROUP BY … HAVING`, set intersection |
| 04 | aggregate **alias** (`MAX(x) AS last_ping`) |
| 05 | `SUM … HAVING` + a TEXT join across tables |
| 06 | anti-join / absence (`IS NULL`), correlated subquery |
| 07 | **self-join** (a table against itself), `EXCEPT` |
| 08 | **window function** — `LAG() OVER (ORDER BY …)`, subquery-wrapped |

**Still unused, roughly in order of difficulty:** `LEAD` and `PARTITION BY`
(case 08 used only `LAG`, so the rest of the window family is still fresh),
`UNION` for combining evidence sets, recursive CTEs (probably a step too far).

sql.js ships SQLite **3.49.1**, and `LAG`, `LEAD`, `ROW_NUMBER`, `PARTITION BY`
and CTEs are all confirmed working — no need to re-check before using them.

Case 07 used the self-join and `EXCEPT`. Note that a self-join pairs naturally
with any hourly log where the *transition* matters rather than the value —
tide turning, a door state changing, a temperature crossing a threshold.

Case 08 used `LAG()` to expose a **gap that exists in no column**: ordering the
shift roster by start time and pulling the previous row's end shows where the
relay failed to overlap. Reach for a window function whenever the answer lives
*between* two consecutive rows rather than inside either one. Note that SQLite
won't let you filter on a window alias in the same `WHERE`, so the query has to
wrap it in a subquery — which is itself a useful difficulty step.

### 2. Evidence sets to intersect

The exception must never fall out of a single filter. Case 05 is the model: two
suspects were in the pantry, two booked entries to the shell vendor, and only
one account is in **both** — then the address match seals it.

Design rule: **keep more than one candidate per single-table filter**, so
presence alone never convicts. Three sets of 2–3 candidates intersecting to one
person is the sweet spot.

### 3. Misdirection

The most memorable dial and the most expensive to author. Case 04 is the
standout: the headline fact — a 02:14 text "from the victim" — is **false**, and
the data disproves itself via `MAX(ping_time)`. The player must dismantle a
stated fact before the real question even makes sense.

Variants worth trying: a corroborated alibi that the corroborator's own data
contradicts; a physical impossibility (travel time between two logged
locations); a record everyone treats as authoritative that turns out to be
hand-written.

Use sparingly — one misdirection per case, at most.

### 4. Table and suspect count (the weakest dial)

Going 7 tables → 9 adds tedium, not difficulty. Cases 03–06 all sit at 6–7
tables and 5–6 suspects and get harder purely through shape and intersection.
**Do not reach for this dial to make a case harder.**

---

## Hard constraints

Violate these and the case breaks.

- **Exactly one planted contradiction**, discoverable *only* by querying. Never
  state it outright in the narrative.
- **Every fact the player must deduce appears in the scope-memo prose** in
  plain language. The database makes it queryable; the story makes it findable.
  If a fact is only in the tables, players won't know to look for it.
- **Times are `'HH:MM'` TEXT compared lexicographically.** Never seed a window
  spanning midnight (`'23:30'`–`'03:00'`) or every gap/overlap filter silently
  breaks. Clamp to same-day times. (This bit Case 04 during authoring.)
- **Don't let a plain `SELECT *` unlock a blank you want earned.** Key it on an
  aliased aggregate that exists in no table (`incident_count`, `last_ping`,
  `skimmed_total`) and name the alias in the hint. `SELECT MAX(x)` *without* the
  alias deliberately does not unlock.
- **No proving query may give away a LATER answer.** Blanks are declared in the
  intended solve order, and a query may only unlock blanks at or before its own
  position. Unlocking a later blank hands the player an answer they haven't
  earned — usually because a helper query selected `s.name` it didn't need.

  Unlocking an *earlier* blank is fine and often unavoidable: Case 02's alibi
  query filters `WHERE s.name = 'Marcus Feld'`, so only someone who already
  identified him can write it.

  When two blanks are genuinely **one deduction** — Case 03's killer and
  incident count come from the same `GROUP BY`; Case 05's poison and its window
  come from the same toxicology row — declare `coUnlocksWith: 'otherKey'` rather
  than splitting the query into busywork.

  `npm test` enforces all of this. It found real leaks in five of seven cases
  the first time it ran, so do not rely on spotting them by eye.
- **Every deduction must be UNIQUE in the data, not just in your proving query.**
  `npm test` only checks that your query unlocks its blank — it cannot tell you
  that the *general* form of the same question returns three rows. Case 08 nearly
  shipped with three countersignatures written after their signer's shift ended;
  the proving query looked fine because it filtered on `dose_mg = 60`. Run the
  honest, unfiltered version of each deduction and confirm it returns exactly one
  row. Incidental noise elsewhere in the seed data is how a case becomes
  ambiguous without any test failing.
- **The locked dropdown must hide the correct answer**, or players can guess
  past the anti-cheat.
- **Every blank needs a `provingQuery`**, and `npm test` must pass. The suite
  builds the real schema and verifies the case is actually solvable.

---

## Checklist for a new case

Mechanical:

- [ ] Needs a query shape no earlier case required.
- [ ] Every blank has a `provingQuery`; `npm test` passes.
- [ ] No proving query unlocks a blank that comes later in the solve order
      (`npm test` checks this; use `coUnlocksWith` for genuine shared deductions).
- [ ] No time window crosses midnight.
- [ ] `targetValue` is in `options` for every blank.

Deductive:

- [ ] The first obvious query returns **2 or more** suspects.
- [ ] The exception is identified by an **intersection**, not a single filter.
- [ ] Every fact needed is in the narrative prose.
- [ ] The contradiction cannot be spotted without running a query.
- [ ] A player who guesses the most suspicious-sounding account is wrong.
- [ ] The unfiltered form of every deduction returns exactly **one** row —
      no second row anywhere in the seed data answers the same question.
