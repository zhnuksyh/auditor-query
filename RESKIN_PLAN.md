# Auditor Query: Reskin Plan

Porting **Detective Query** (murder mystery) to **Auditor Query** (IT auditing).

This repo began as a git clone of `../deduction-query` at commit `a21816a`.
This document is the plan for the port and the record of what has been done.

Status: **Phases 0–3 done.** All ten cases are audit engagements. Still
outstanding: the trailer (Phase 4), the music track, and a playtest of the
ladder (see Recommended sequencing).

`npm test`, `npm run typecheck` and `npm run build` are green.

---

## Why this port is cheap

The engine is **already theme-agnostic**. `verification.js`, `sqlEngine.js`,
`highlights.js`, `storage.js`, `useGame.js`, `ResultsTable`, `Dropdown`,
`TabBar`, `CaseStamp` and `TutorialOverlay` contain zero murder vocabulary. A
case is plain data (`schemaSql` + `erd` + `report.blanks`), and the unlock
mechanic keys on *any* column name and *any* trigger value. Nothing in the
machinery knows that `suspects` is a table of murderers.

The theme lives in exactly three places:

1. **Case data**: `src/cases/case01–08.js` (~2,400 lines). Rewritten, not ported.
2. **UI copy**: ~30 string occurrences across `MainMenu`, `Guide`,
   `CrimeSceneTab`, `AnalysisTab`, `Credits`, `GameDashboard`, `index.html`,
   `vite.config.js`.
3. **One structural coupling**: `CrimeSceneTab.jsx` hardcodes `Victim` /
   `Location` / `Time of death` as `<dt>` labels, reading `scene.victim`,
   `scene.location`, `scene.timeOfDeath`. ~10 lines. This is the only genuine
   code obstacle.

**This is a content project, not a code project.** That is the good outcome: the
reskin is bounded and low-risk.

---

## Why IT audit fits

Audit work *is* the activity the game already simulates: a post-mortem where
the records contradict each other.

| Murder | IT Audit |
|---|---|
| Crime Scene report | Engagement scope memo |
| Victim / Location / Time of death | Control ID / System / Audit period |
| Suspects | Users, service accounts, privileged roles |
| The killer | The failed control (or the breaching account) |
| Forensic contradiction | A control exception: the record that shouldn't exist |
| Report Card | Audit finding + severity rating |
| Detective's Notebook | Auditor's workpaper |
| B.D.F. | Internal Audit |

Better, the case archetypes map onto the **existing query-shape ladder** in
`src/cases/CASE_DESIGN.md`:

- **SoD violation**: one user holds two conflicting entitlements → self-join
- **Orphaned account**: a termination with no deprovisioning row → anti-join / `IS NULL`
- **Privilege creep**: grants accumulating, never revoked → `LAG()` / window
- **Change without approval**: a deploy with no CAB record → anti-join
- **Backdated approval**: approval timestamp after the change → misdirection dial
- **Rubber-stamp reviewer**: one approver clearing everything in 4 seconds → `GROUP BY … HAVING`

`CASE_DESIGN.md` survives the reskin **verbatim**: same four dials, same hard
constraints, same "first obvious query returns 2+ candidates" measure. It is the
project's most valuable asset and it costs nothing to carry over.

---

## Risks

1. **Tonal flatness.** Murder gives free narrative stakes; a missing CAB ticket
   does not. Mitigate by scoping each case around a *consequence*: the breach
   that followed, the fraud the gap enabled, the regulator's question. The audit
   is a post-mortem too, just of an incident rather than a body.
2. **Jargon barrier.** SoD, RBAC, CAB, SOX ITGC, privileged access. Murder needs
   no glossary; audit does. Budget a real glossary; `Guide.jsx` is the natural
   home, and the Case Brief overlay already exists.
3. **The `suspects` table name** is woven into `MainMenu`'s SQL texture,
   `Guide`'s examples, `AnalysisTab`'s starter query, and `sqlErrors.js`'s hint
   text. Renaming to `users` / `accounts` touches all four.

---

## Fork, not theme layer

Decided: **fork**, which is what this repo is. Reasons:

- 100% of case content is replaced anyway, so a shared "theme" abstraction would
  serve exactly one consumer each.
- The two games want different names, domains, PWA identities and trailers.
- A theming indirection would make `CASE_DESIGN.md` and the test suite harder to
  read for zero payoff.

Cherry-pick engine fixes across if either side diverges.

---

## Phases

### Phase 0: Rebrand (~1 hour, mechanical)

- [x] Clone repo, remove `origin` remote
- [x] Adapt `CLAUDE.md`
- [x] `package.json`: name `auditor-query`, description
- [x] `index.html`: title + meta description
- [x] `vite.config.js`: PWA manifest name / short_name / description
- [x] `MainMenu.jsx`: title `AUDITOR_QUERY`, `REPO_URL`, `SQL_TEXTURE` queries
- [x] `engine/storage.js`: `KEY` → `auditor-query:save:v1`
- [x] `Credits.jsx`: attribution and the fictional-data disclaimer
- [x] `ErrorBoundary.jsx`: log tag `[AuditorQuery]`
- [x] `engine/music.js`: `MUSIC_FILE`, track renamed to `theme.mp3`
      (still the parent game's crime-drama cue; **replacing it is outstanding**)
- [x] `README.md`: full rewrite for the new theme
- [x] `tailwind.config.js`: accent crimson → amber (exception) / teal
      (compliant), keep the `zinc-950` ground; retheme `paper.*` folder tones to
      audit domains (`access`, `change`, `finance`, `vendor`, `privacy`,
      `continuity`)

### Phase 1: Decouple the structural hardcode (~30 min)

- [x] Generalize `CrimeSceneTab.jsx`'s vitals from three fixed `<dt>`s to a
      `vitals: {term, value}[]` array (or add `term` to `CrimeSceneVital`)
- [x] Rename `crimeScene` → `engagement` in `types.d.ts` and every case file
- [x] Rename components: `CrimeSceneTab` → `ScopeTab`, `CaseBoardTab` →
      `DataMapTab`, `ReportCardTab` → `FindingTab`
- [x] Tab labels in `GameDashboard.jsx` → `SCOPE / DATA MAP / ANALYSIS / FINDING`
- [x] Update `test/cases.test.mjs` field references and assertion messages
- [x] Update `_TEMPLATE.md` and `CASE_DESIGN.md` field names
- [x] `npm test` and `npm run typecheck` green

### Phase 2: Guide and copy (~2 hours)

- [x] `Guide.jsx`: SQL examples on audit tables
- [x] `Guide.jsx`: **new glossary section** for domain jargon (SoD, JML, CAB,
      recertification, privileged access, ITGC)
- [x] `AnalysisTab.jsx`: starter query, "auditor's workpaper" label, placeholder
- [x] `engine/sqlErrors.js`: example table names in hint text

### Phase 3: Author the case ladder (the actual work, ~1 day per case)

90% of the effort, and it is genuine case *design*, not porting. Each case's
subject and realism dial came from `src/cases/AUDIT_PRACTICE.md`, which also
moved Case 06 from a repeat of Case 01 to population completeness. Cases 09
and 10 were added past the original eight: IT operations (the one ITGC domain
the first eight missed) and a reliance-chain capstone.

| # | Case | New query shape | Domain |
|---|---|---|---|
| 01 | ✅ **The Leaver**: orphaned account (tutorial) | `WHERE` + `JOIN` | Access management |
| 02 | ✅ **The Green Light**: approval reused across systems | multi-table triangulation | Change management |
| 03 | ✅ **Rubber Stamp**: twelve lines certified in six minutes | `GROUP BY … HAVING` | Recertification |
| 04 | ✅ **Paper Trail**: approval created after go-live, back-dated | aggregate alias | Change management |
| 05 | ✅ **Both Sides**: SoD conflict exercised, paid to own account | `SUM … HAVING` + TEXT join | Financial ITGC |
| 06 | ✅ **The Missing Row**: leaver report omitted contractors | anti-join / `IS NULL` | Population completeness (IPE) |
| 07 | ✅ **Two at Once**: generic admin account open from two hosts | self-join, `EXCEPT` | Privileged access |
| 08 | ✅ **Nothing Taken Away**: three moves, no access removed | `LAG() OVER (PARTITION BY …)` | Mover access |
| 09 | ✅ **Restore Point**: backups reported Success while writing 12 MB | CTE (`WITH … AS`) | IT operations |
| 10 | ✅ **Tolerance**: match tolerance changed straight in the database | `UNION ALL` | Reliance on an automated control |

**Build Case 01 first, end to end, and play it** before writing 02–08. That
validates the whole reskin against a real player experience while the cost of
changing direction is still one file.

#### What Case 01 taught (apply to 02–08)

- **Alias every unlock trigger, without exception.** Case 01 first shipped with
  blanks keyed on raw columns, and a bare `SELECT * FROM accounts` unlocked four
  of five blanks. `npm test` passed the whole time: it only checks that the
  proving query *does* unlock, never that a lazy one *doesn't*. Key every blank
  on a column name that exists in no table (`orphan_account`, `orphan_last_day`,
  `signed_off_by`) and name the alias in the hint.
- **Write the decoy in deliberately.** Tomas Lindqvist is genuinely orphaned and
  never used. Without him, "which leaver still has an account" answers the case
  in one filter; with him it takes the intersection.
- **Check the honest, unfiltered form of every deduction by hand.** The suite
  cannot do this. Case 01's "Administrator on Helios HR" returns two rows, which is fine
  here, because only one belongs to a leaver, but that is the shape that ships an
  ambiguous case.
- **The leak test is order-sensitive and strict.** A proving query that merely
  *selects* a later blank's column fails it. Project only what the deduction
  needs.

#### What Cases 02–08 taught

- **The template leaks as easily as the data.** The Finding tab is visible from
  the start. Case 02's template drafted with the release date and Case 03's with
  the reviewer's six-minute window; either filters straight to the answer. Keep
  dates, times, amounts, counts and product names out of the template and memo.
- **Explained deviations make the best decoys.** A retro-approved emergency
  change (04), an SoD holder with an approved exception (05) and a mover under a
  handover exception (08) each look exactly like the exception until a second
  table is read. That is also how real audits go.
- **A zero-survivor first query is a valid design** when it is the point: Cases
  04 and 06 are about an obvious test that passes and proves nothing.
- **Plant the wrong aggregate on purpose.** Case 04's harmless later edit makes
  `MAX` flag the wrong change; Case 05's pre-change payment makes an all-payments
  `SUM` give the wrong total; Case 06's December leaver punishes a missing
  period filter.
- **Check every weekday.** Several deductions lean on "one working day" or "the
  CAB meets on Mondays"; every date was checked against the real 2026 calendar.

### Phase 4: Trailer (~half day, deferrable)

`src/trailer/` is ~1,300 lines with ~20 theme references. It is a self-contained
second entry point: safe to defer entirely, or ship without a trailer initially.

- [ ] Rewrite trailer copy and `TrailerCaseBoard` schema
- [ ] Or: drop the `trailer` entry from `vite.config.js` for the first release

---

## Decisions made during Phases 0–2

- **`crimson` keeps its name.** Its ~56 usages all mean "alert / exception /
  wrong answer", which the audit theme wants too. Only the value moved (rose red
  → register amber). `exception` / `compliant` aliases exist for new code.
  Hardcoded reds left in components, CSS and the trailer were later moved to
  the amber token as well, so the whole app, trailer included, uses one accent.
- **Vitals are case-supplied.** `engagement.vitals` is a `{term, line1, line2}[]`
  and the grid auto-fits, so a case picks its own headline labels and count.
- **`paper.*` folder tones were rekeyed** to audit domains even though nothing
  renders them yet; the `FolderTheme` type is the only thing holding them
  honest, and fixing eight stale values later is worse than fixing them now.
- **`CASE_DESIGN.md` kept its rules and swapped its examples.** The rules are
  about SQL shape, not theme; once all eight audit cases shipped, its examples
  and tables were rewritten around them.
- **The `AUDIT_CASES` opt-in list was removed.** It existed so the inherited
  murder cases could skip the bare-`SELECT *` check. With every case an audit
  case, the check now runs on every playable case by default.
- **Outstanding:** the music track is still the parent game's crime-drama cue,
  renamed to `theme.mp3`. Needs a replacement.

---

## Effort

| Phase | Effort |
|---|---|
| 0–2 (rebrand, decouple, copy) | ~half day |
| 3 (eight cases) | ~1 day each (the bulk) |
| 4 (trailer) | ~half day, deferrable |

---

## Recommended sequencing

**Do not commit to eight cases up front.** Do Phases 0–2, then author Case 01
and Case 03 (the tutorial plus one that proves the theme carries real deductive
weight), and play them.

If audit cases feel as satisfying to crack as murder cases, continue the ladder.
If they feel like homework, you have spent two days finding out instead of two
weeks.

**What actually happened:** Cases 03–08 were written straight after 01 and 02,
without the playtest. Every case passes `npm test` and a hand check of its
deductions, but nobody has yet played the ladder end to end. That playtest is
the outstanding check.

One upside worth noting: this version has an audience the murder one does not.
Audit/GRC training is a real market, and "learn SQL by finding control
exceptions" is a plausible thing a firm would hand a new hire.
