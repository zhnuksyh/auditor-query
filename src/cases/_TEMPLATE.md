# New Case Form

Fill this out to design a new case. Hand the completed form back and it can be
turned into a working `caseNN.js` file. Everything the game needs is here.

> **Read [`CASE_DESIGN.md`](./CASE_DESIGN.md) first.** This form covers the
> mechanics of a case; that document covers what makes one *harder* than the
> last — the difficulty dials, the hard constraints, and the checklist a case
> has to pass.

A case is solvable **only by querying the database** — never by guessing. The
core trick: one row in the data contradicts what the control claims, and the player
finds it with SQL. Design the contradiction first, then build the tables around it.

---

## 1. Case identity

| Field | Your answer | Notes |
|---|---|---|
| **id** | `case_0N` | Sequential, e.g. `case_02`. Must be unique. |
| **code** | `CODE_0N` | Shown as a label. |
| **tag** | e.g. `FALLING` | One-word mood/category. |
| **title** | Title Case, e.g. `A Long Way Down` | The case name. |
| **teaser** | 1–2 sentences | Shown on the locked/unlocked level card. Hint at the mystery without spoiling it. |
| **folderTheme** | `access` \| `change` \| `finance` \| `vendor` \| `privacy` \| `continuity` | The audit domain. Just a colour tone for the card. |

---

## 2. Engagement (the narrative)

The player reads this first. **Every fact the player must deduce should be woven
into this prose** (no separate bullet list). State the evidence here in plain
language; the database makes it queryable.

- **vitals** — 2–4 headline cells, each `{ term, line1, line2 }`. The term is
  yours to choose, so head the scope with what this engagement actually turns
  on. Common sets: Control / System / Audit period; or Process / Environment /
  Period. Keep terms short — they render as small-caps labels.
- **report** — 2–4 short paragraphs. Name the control under test, say what the
  business believes is true, and state the scope constraints (the period, which
  systems are in scope, which records are authoritative). Introduce any jargon
  in plain language the first time it appears. End by pointing at the tables
  ("the grant log is in the database; one entitlement outlives its owner").

Any term a player might not know goes in the Audit Manual glossary too
(`src/screens/Guide.jsx`) — the memo teaches it, the glossary backs it up.

Write it out here:

```
Vital 1 term:        (e.g. Control)
Vital 1 line 1:
Vital 1 line 2:
Vital 2 term:        (e.g. System)
Vital 2 line 1:
Vital 2 line 2:
Time of death line 1:
Time of death line 2:

Report:
(paragraph 1)
(paragraph 2)
(paragraph 3)
```

---

## 3. Database schema + data

List each table, its columns, and the seed rows. This becomes plain SQL
(`CREATE TABLE` + `INSERT`). Guidelines:

- Give every table an `id INTEGER PRIMARY KEY`.
- Use foreign keys to link tables (e.g. `alibis.suspect_id` → `suspects.id`).
- Column types: `INTEGER` or `TEXT` (store times/dates as `TEXT` like `'23:10'`).
- **Plant exactly one contradiction** in the data — the single row that only
  surfaces when the player joins/filters correctly. That row is the solution.

For each table:

```
TABLE <name>
  <col> <TYPE> [PK] [FK -> table.col]
  ...
ROWS
  (values...)
  (values...)
```

Example (from Case 01):

```
TABLE suspects
  id INTEGER PK
  name TEXT
  relationship TEXT
  handedness TEXT
ROWS
  1, 'Mara Quinn',  'Business partner', 'right'
  2, 'Elias Vale',  'Estranged brother','left'
  ...

TABLE keycard_logs
  id INTEGER PK
  suspect_id INTEGER FK -> suspects.id
  wing TEXT
  direction TEXT      -- 'IN' or 'OUT'
  swipe_time TEXT     -- 'HH:MM'
ROWS
  4, 4, 'East Wing', 'IN',  '23:12'   <- the contradiction: enters during time of death
  ...
```

---

## 4. Finding (the deduction)

A fill-in-the-blank paragraph that closes the engagement. Each `{{blank}}` is a
dropdown the player must complete. **A blank stays locked until the player runs
the query that proves it** — the anti-cheat.

- **template** — the closing paragraph with `{{key}}` tokens inline.
- For **each blank** (`key`):
  - **label** — short description (e.g. "the failed control").
  - **targetValue** — the correct answer (must be one of `options`).
  - **options** — 3–4 choices shown in the dropdown. While locked, the correct
    answer is hidden, so the player can't guess it.
  - **unlockedByColumn** + **triggerValue** — the blank unlocks when a query
    returns a row where `row[unlockedByColumn] === triggerValue`. Pick a column +
    value that only appears when the player runs the *right* proving query.
    Matching is forgiving about spelling, not about substance: column names
    compare case-insensitively (`AS LAST_PING` unlocks a `last_ping` trigger),
    values compare loosely (`3` == `"3"`, text trimmed + case-insensitive), and
    every statement in a multi-statement run is checked, not just the last one.
    An aliased aggregate still requires the alias — `SELECT MAX(x)` without
    `AS …` does not unlock, which is what forces real query work.
  - **hint** — one line nudging toward the proving query (shown as guidance).

Fill in per blank:

```
Template paragraph (with {{blanks}}):

Blank key:
  label:
  targetValue:
  options: [ , , , ]
  unlockedByColumn:
  triggerValue:
  hint:
```

---

## 5. Solvability checklist

Before it's a real case, confirm:

- [ ] Each blank's proving query returns a row with `unlockedByColumn === triggerValue`.
- [ ] Running those queries unlocks **all** blanks.
- [ ] The `targetValue` of every blank is in its `options`.
- [ ] The contradiction is discoverable **only** by querying (not stated outright).
- [ ] The narrative contains every fact needed, in plain language.
