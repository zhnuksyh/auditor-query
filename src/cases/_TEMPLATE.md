# New Case Form

Fill this out to design a new case. Hand the completed form back and it can be
turned into a working `caseNN.js` file. Everything the game needs is here.

> **Read [`CASE_DESIGN.md`](./CASE_DESIGN.md) first.** This form covers the
> mechanics of a case; that document covers what makes one *harder* than the
> last — the difficulty dials, the hard constraints, and the checklist a case
> has to pass.

A case is solvable **only by querying the database** — never by guessing. The
core trick: one row in the data contradicts a suspect's story, and the player
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
| **folderTheme** | `drift` \| `fall` \| `signal` \| `work` | Just a color tone for the card. |

---

## 2. Crime Scene (the narrative)

The player reads this first. **Every fact the player must deduce should be woven
into this prose** (no separate bullet list). Plant the clues here in plain
language; the database makes them queryable.

- **victim** — two lines: `line1` (name, age), `line2` (occupation).
- **location** — two lines: `line1` (place/address), `line2` (room/floor/detail).
- **timeOfDeath** — two lines: `line1` (time range), `line2` (date).
- **report** — 2–4 short paragraphs. Set the scene, name the suspects' situation,
  and state the physical/forensic constraints (wound angle, missing item, locked
  door, logged access, etc.). End by pointing at the tables ("the logs are in the
  database; one statement contradicts the swipes").

Write it out here:

```
Victim line 1:
Victim line 2:
Location line 1:
Location line 2:
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

## 4. Report Card (the deduction)

A fill-in-the-blank paragraph that closes the case. Each `{{blank}}` is a
dropdown the player must complete. **A blank stays locked until the player runs
the query that proves it** — the anti-cheat.

- **template** — the closing paragraph with `{{key}}` tokens inline.
- For **each blank** (`key`):
  - **label** — short description (e.g. "the killer").
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
