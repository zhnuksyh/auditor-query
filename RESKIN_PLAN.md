# Auditor Query — Reskin Plan

Porting **Detective Query** (murder mystery) to **Auditor Query** (IT auditing).

This repo is a git clone of `../deduction-query` at commit `a21816a`, with the
`origin` remote removed. Everything in it is currently still the murder game.
This document is the plan for the port and the record of what has been done.

Status: **Phase 0 not started.** Nothing has been reskinned yet.

---

## Why this port is cheap

The engine is **already theme-agnostic**. `verification.js`, `sqlEngine.js`,
`highlights.js`, `storage.js`, `useGame.js`, `ResultsTable`, `Dropdown`,
`TabBar`, `CaseStamp` and `TutorialOverlay` contain zero murder vocabulary. A
case is plain data (`schemaSql` + `erd` + `report.blanks`), and the unlock
mechanic keys on *any* column name and *any* trigger value. Nothing in the
machinery knows that `suspects` is a table of murderers.

The theme lives in exactly three places:

1. **Case data** — `src/cases/case01–08.js` (~2,400 lines). Rewritten, not ported.
2. **UI copy** — ~30 string occurrences across `MainMenu`, `Guide`,
   `CrimeSceneTab`, `AnalysisTab`, `Credits`, `GameDashboard`, `index.html`,
   `vite.config.js`.
3. **One structural coupling** — `CrimeSceneTab.jsx` hardcodes `Victim` /
   `Location` / `Time of death` as `<dt>` labels, reading `scene.victim`,
   `scene.location`, `scene.timeOfDeath`. ~10 lines. This is the only genuine
   code obstacle.

**This is a content project, not a code project.** That is the good outcome: the
reskin is bounded and low-risk.

---

## Why IT audit fits

Audit work *is* the activity the game already simulates — a post-mortem where
the records contradict each other.

| Murder | IT Audit |
|---|---|
| Crime Scene report | Engagement scope memo |
| Victim / Location / Time of death | Control ID / System / Audit period |
| Suspects | Users, service accounts, privileged roles |
| The killer | The failed control (or the breaching account) |
| Forensic contradiction | A control exception — the record that shouldn't exist |
| Report Card | Audit finding + severity rating |
| Detective's Notebook | Auditor's workpaper |
| B.D.F. | Internal Audit |

Better, the case archetypes map onto the **existing query-shape ladder** in
`src/cases/CASE_DESIGN.md`:

- **SoD violation** — one user holds two conflicting entitlements → self-join
- **Orphaned account** — a termination with no deprovisioning row → anti-join / `IS NULL`
- **Privilege creep** — grants accumulating, never revoked → `LAG()` / window
- **Change without approval** — a deploy with no CAB record → anti-join
- **Backdated approval** — approval timestamp after the change → misdirection dial
- **Rubber-stamp reviewer** — one approver clearing everything in 4 seconds → `GROUP BY … HAVING`

`CASE_DESIGN.md` survives the reskin **verbatim** — same four dials, same hard
constraints, same "first obvious query returns 2+ candidates" measure. It is the
project's most valuable asset and it costs nothing to carry over.

---

## Risks

1. **Tonal flatness.** Murder gives free narrative stakes; a missing CAB ticket
   does not. Mitigate by scoping each case around a *consequence* — the breach
   that followed, the fraud the gap enabled, the regulator's question. The audit
   is a post-mortem too, just of an incident rather than a body.
2. **Jargon barrier.** SoD, RBAC, CAB, SOX ITGC, privileged access. Murder needs
   no glossary; audit does. Budget a real glossary — `Guide.jsx` is the natural
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

### Phase 0 — Rebrand (~1 hour, mechanical)

- [x] Clone repo, remove `origin` remote
- [x] Adapt `CLAUDE.md`
- [ ] `package.json` — name `auditor-query`, description
- [ ] `index.html` — title + meta description
- [ ] `vite.config.js` — PWA manifest name / short_name / description
- [ ] `MainMenu.jsx` — title `AUDITOR_QUERY`, `REPO_URL`, `SQL_TEXTURE` queries
- [ ] `engine/storage.js` — `KEY` → `auditor-query:save:v1`
- [ ] `Credits.jsx` — attribution and the fictional-data disclaimer
- [ ] `ErrorBoundary.jsx` — log tag `[AuditorQuery]`
- [ ] `engine/music.js` — `MUSIC_FILE` (needs a non-true-crime track)
- [ ] `README.md` — full rewrite for the new theme
- [ ] `tailwind.config.js` — accent crimson → amber (exception) / teal
      (compliant), keep the `zinc-950` ground; retheme `paper.*` folder tones to
      audit domains (`access`, `change`, `finance`, `vendor`, `privacy`,
      `continuity`)

### Phase 1 — Decouple the structural hardcode (~30 min)

- [ ] Generalize `CrimeSceneTab.jsx`'s vitals from three fixed `<dt>`s to a
      `vitals: {term, value}[]` array (or add `term` to `CrimeSceneVital`)
- [ ] Rename `crimeScene` → `engagement` in `types.d.ts` and every case file
- [ ] Rename components: `CrimeSceneTab` → `ScopeTab`, `CaseBoardTab` →
      `DataMapTab`, `ReportCardTab` → `FindingTab`
- [ ] Tab labels in `GameDashboard.jsx` → `SCOPE / DATA MAP / ANALYSIS / FINDING`
- [ ] Update `test/cases.test.mjs` field references and assertion messages
- [ ] Update `_TEMPLATE.md` and `CASE_DESIGN.md` field names
- [ ] `npm test` and `npm run typecheck` green

### Phase 2 — Guide and copy (~2 hours)

- [ ] `Guide.jsx` — SQL examples on audit tables
- [ ] `Guide.jsx` — **new glossary section** for domain jargon (SoD, JML, CAB,
      recertification, privileged access, ITGC)
- [ ] `AnalysisTab.jsx` — starter query, "auditor's workpaper" label, placeholder
- [ ] `engine/sqlErrors.js` — example table names in hint text

### Phase 3 — Author the case ladder (the actual work, ~1 day per case)

90% of the effort, and it is genuine case *design*, not porting. Follow
`CASE_DESIGN.md` unchanged.

| # | Case | New query shape | Domain |
|---|---|---|---|
| 01 | Orphaned account (tutorial) | `WHERE` + `JOIN` | Access management |
| 02 | Unapproved production change | multi-table triangulation | Change management |
| 03 | Rubber-stamp access review | `GROUP BY … HAVING` | Recertification |
| 04 | Backdated approval (misdirection) | aggregate alias | Change management |
| 05 | Segregation-of-duties breach | `SUM … HAVING` + TEXT join | Financial ITGC |
| 06 | Termination, no deprovisioning | anti-join / `IS NULL` | Joiner-mover-leaver |
| 07 | Shared credential, two locations | self-join, `EXCEPT` | Privileged access |
| 08 | Privilege creep across reviews | `LAG() OVER` | Entitlement drift |

**Build Case 01 first, end to end, and play it** before writing 02–08. That
validates the whole reskin against a real player experience while the cost of
changing direction is still one file.

### Phase 4 — Trailer (~half day, deferrable)

`src/trailer/` is ~1,300 lines with ~20 theme references. It is a self-contained
second entry point — safe to defer entirely, or ship without a trailer initially.

- [ ] Rewrite trailer copy and `TrailerCaseBoard` schema
- [ ] Or: drop the `trailer` entry from `vite.config.js` for the first release

---

## Effort

| Phase | Effort |
|---|---|
| 0–2 (rebrand, decouple, copy) | ~half day |
| 3 (eight cases) | ~1 day each — the bulk |
| 4 (trailer) | ~half day, deferrable |

---

## Recommended sequencing

**Do not commit to eight cases up front.** Do Phases 0–2, then author Case 01
and Case 03 — the tutorial plus one that proves the theme carries real deductive
weight — and play them.

If audit cases feel as satisfying to crack as murder cases, continue the ladder.
If they feel like homework, you have spent two days finding out instead of two
weeks.

One upside worth noting: this version has an audience the murder one does not.
Audit/GRC training is a real market, and "learn SQL by finding control
exceptions" is a plausible thing a firm would hand a new hire.
