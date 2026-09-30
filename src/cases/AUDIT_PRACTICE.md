# IT Audit in Practice: a reference for case progression

`CASE_DESIGN.md` says how to make a case harder as a **puzzle**. This document
says how real IT audit work is done and where its difficulty actually lives, so
the ladder gets harder in the ways the job gets harder. Read it before designing
a case; read `CASE_DESIGN.md` before building one.

It is synthesised from public practitioner guidance, audit standards summaries
and firm publications (sources at the end). It has **not** been reviewed by a
practising IT auditor, and that review is still the real test of domain
accuracy.

---

## 1. What the work is

An IT auditor tests whether the controls an organisation says it runs over its
systems actually operated, across a period, with evidence. Most of that work
sits in three **IT general control (ITGC)** domains:

| Domain | Controls tested | Typical evidence |
|---|---|---|
| **Access** | Provisioning (joiners), movers, deprovisioning (leavers), periodic user access reviews, privileged and emergency access, segregation of duties | HR joiner/leaver feeds, directory and application user lists, access request tickets, review sign-offs, last-logon data, privileged session logs |
| **Change management** | Changes approved before production, tested, deployed by someone other than the developer; emergency changes approved after the fact; developers kept out of production | Change tickets, CAB minutes, UAT evidence, deployment logs, commit history, emergency-change registers, production access lists |
| **IT operations** | Batch jobs monitored and failures resolved, backups completed and restores tested, incidents managed | Job scheduler logs, failure tickets, backup logs, restore and DR test results |

ITGCs matter because of what depends on them. **IT application controls**
(ITACs), such as a three-way match that blocks an invoice unless order, receipt
and invoice agree, or an approval limit configured in the ERP, are only
trustworthy if nobody could change their configuration or grant themselves
around them. When access or change ITGCs fail, auditors can no longer rely on
the automated controls running on that system, and testing has to expand.
When they hold, external auditors may even "benchmark" an unchanged automated
control instead of retesting it every year.

Two audiences do this work, and the game's player is the first:

- **Internal audit** works for the organisation (reporting to the audit
  committee) under the IIA's Global Internal Audit Standards, which took
  effect on 9 January 2025. Its scope is whatever the risk-based audit plan
  says: a system, a process, an incident.
- **External audit** tests ITGCs as part of the financial-statement audit and,
  for US-listed companies, the SOX 404 opinion on internal control (PCAOB
  AS 2201). Its scope is financial reporting.

A third source of evidence is the **SOC 1 / SOC 2 report** from a service
provider (payroll bureau, cloud host). Relying on one means reading its
exceptions and checking the **complementary user entity controls** the
provider assumes the customer runs.

---

## 2. The shape of an engagement

1. **Planning and scoping.** Pick the systems in scope from the IT audit
   universe, by risk. Agree the audit period and the control objectives.
2. **Walkthrough (test of design).** Follow one instance end to end: does the
   control, as designed, address the risk? A gate that checks a change
   reference is approved but not what it was approved for fails *here*, before
   any sampling. (This is Case 02.)
3. **Test of operating effectiveness.** Pull the population, select a sample
   across the whole period, and test each item. Did the control run every time?
4. **Evaluate exceptions.** Is each deviation real? Is there an explanation, a
   compensating control, a root cause? How severe is it?
5. **Report.** Write findings, agree management action plans with owners and
   dates.
6. **Follow up.** Confirm the actions were actually implemented.

A typical internal IT audit engagement runs a few weeks of fieldwork. An
external ITGC audit tests a full year, often with an interim round and a
roll-forward to year end.

### Evidence techniques, weakest to strongest

| Technique | What it is | Standing |
|---|---|---|
| Inquiry | Asking the control owner | Never sufficient on its own |
| Observation | Watching the control happen | Point in time only |
| Inspection | Examining records: tickets, logs, sign-offs | The workhorse |
| Reperformance | Independently redoing the control and comparing | Strongest |

**The game is almost entirely inspection and reperformance**, which is where the
SQL lives. That is a fair simplification: data analytics is exactly how
reperformance scales.

### Sample sizes

Common SOX practice, by how often the control runs:

| Control frequency | Typical sample |
|---|---|
| Annual | 1 |
| Quarterly | 2 |
| Monthly | 2–5 |
| Weekly | 5–15 |
| Daily | 20–40 |
| Many times a day / per transaction | 25–60 |

Data analytics tools (ACL, IDEA, plain SQL) increasingly make **full-population
testing** possible: test every leaver, every deployment, every payment, and
investigate only the exceptions ("audit by exception"). **This is what the
player is doing in every case**, and it is the modern, realistic framing: the
analyst who queries everything instead of ticking 25 samples.

---

## 3. The population problem

The most under-appreciated part of real IT audit, and a recurring PCAOB
inspection finding: auditors test a list someone else produced without
checking the list is **complete and accurate**. That list is **information
produced by the entity (IPE)**.

- A leaver report that silently excludes contractors.
- A deployment list pulled from the ticketing tool, which by definition omits
  changes that never had a ticket.
- A user access review performed on an extract that was missing one
  application's admin group.

Real procedures: inspect the query or report parameters that produced it,
reconcile it to the source system, look for gaps in sequences and dates.

**Game potential: high.** "The list you were given is wrong" is a genuine
auditor's insight, fully expressible in SQL (reconcile two sources with an
anti-join), and a satisfying twist: the control looked perfect because the
exceptions were never in the population.

---

## 4. What exceptions actually look like

The recurring ITGC findings, with the data an auditor would query and the SQL
shape that exposes each. Terminated-user access, weak access reviews, SoD and
change management gaps top every list of common deficiencies.

| Failure mode | Domain | Evidence joined | SQL shape |
|---|---|---|---|
| Leaver's account left enabled, then used | Access | HR leavers × accounts × logins | `JOIN` + date comparison |
| Deprovisioned late (outside the SLA) | Access | Leaver date × disable date | Date arithmetic, working days |
| Leaver list incomplete (IPE) | Access | HR feed × payroll × directory | Anti-join (`LEFT JOIN … IS NULL`, `EXCEPT`) |
| Rubber-stamp access review | Access | Review line items × timestamps × reviewer | `GROUP BY … HAVING`, time per item |
| Review on an incomplete extract | Access | Review population × live user list | Anti-join |
| SoD conflict (raise and approve payment) | Access / finance | User × role × conflict ruleset | Self-join or join to a conflict matrix |
| SoD conflict actually exercised | Access / finance | Conflicting users × transactions they both raised and approved | Join, then filter |
| Privilege creep | Access | Grant history across reviews | Window (`LAG`, `PARTITION BY`) |
| Shared or generic admin account | Privileged access | Sessions per account × source location | Self-join on overlapping times |
| Emergency access used, never reviewed | Privileged access | Firefighter sessions × log reviews | Anti-join |
| Service account with interactive logins | Privileged access | Account type × login type | Filter + join |
| Change deployed with no ticket | Change | Deployment log × tickets | Anti-join |
| Approval that does not cover the change | Change | Deployment × ticket × approval | Multi-table join, attribute mismatch |
| Approval dated after deployment | Change | Deployment time × approval time | Join + timestamp comparison |
| Developer deployed own code | Change | Commit author × deployer | Join, `author = deployer` |
| Emergency change never retro-approved | Change | Emergency register × approvals | Anti-join + time window |
| Batch job failed, no resolution | Operations | Job runs × incident tickets | Anti-join |
| Backups never restore-tested | Operations | Backup sets × restore tests | Aggregate by system |
| Vendor bank details changed, then paid | Finance ITAC | Vendor master change log × payments | Join + window around the change |

---

## 5. Evaluating what you found

Finding a matching row is not the end of the work. Real auditors ask:

- **Is it really an exception?** An account enabled after the leaver's last day
  might belong to a rehire, or a contractor extended by email. An emergency
  change without prior approval is **compliant** if it was retro-approved in
  time under the emergency procedure.
- **Did the gap get used?** For late deprovisioning, auditors check last-logon
  data. An orphaned account never logged into is still a deficiency, but a much
  smaller one than one used at 02:47. (Case 01's decoy, Tomas Lindqvist, is
  exactly this distinction.)
- **Is there a compensating control?** Only if it operates precisely enough to
  catch the same problem.
- **Isolated or systemic?** One deviation in a sample of 25 can trigger a
  larger sample. A pattern suggests a design failure.
- **What is the root cause?** The most cited cause of stale-access findings is
  that deprovisioning depends on a manual ticket with no automated trigger.
  Recommendations that address the cause prevent recurrence; ones that address
  the condition only fix this instance.

### Severity

- **SOX (external):** *control deficiency* → *significant deficiency* (merits
  the audit committee's attention) → *material weakness* (a reasonable
  possibility that a material misstatement would not be prevented or detected
  on time). Deficiencies are **aggregated**: several minor ones on the same
  system can add up. ITGC deficiencies are judged by their effect on the
  application controls and data that depend on them.
- **Internal audit:** usually a High / Medium / Low (sometimes Critical) rating
  on likelihood and impact, defined in the function's own methodology.

### Writing the finding

The IIA standards (Domain V, Principle 14) expect each finding to carry five
attributes, often called the **5 Cs**:

| Attribute | Meaning | Case 02 example |
|---|---|---|
| **Criteria** | What should have happened | Every production change has a CAB approval for that change on that system |
| **Condition** | What did happen | A Claims Engine release shipped under an approval issued for Broker Portal |
| **Cause** | Why | The pipeline gate validated the reference's status, not its system |
| **Effect** | So what | 214 claims paid twice |
| **Recommendation** | What to fix | Gate must match ticket system to deployment target; review the year's releases for reuse |

Management then responds with an **action plan**, an owner and a date, and
internal audit later confirms it was done.

The game's Finding tab currently captures **condition** well and touches
**effect** in prose. **Cause, severity and recommendation are not yet player
choices.** They are the natural place to add evaluative difficulty later.

---

## 6. Where the difficulty really lives

Ordered roughly from what a first-year associate handles to what a manager
signs off. Each is a candidate **realism dial** for the ladder, alongside the
SQL-shape dial in `CASE_DESIGN.md`.

1. **Reading the control.** Knowing what the control promises: "within one
   working day", "before deployment", "by someone independent". Most
   exceptions are a precise reading of the criteria against the data.
2. **Joining identities.** In real estates, HR, the directory and each
   application key people differently: employee number, username, email,
   display name. Rehires, name changes and contractors break naive joins.
   Matching them is often the hardest part of access testing.
3. **Time logic.** Working days vs calendar days, audit period boundaries,
   effective dates vs entry dates, timestamps vs dates. A leaver who left on a
   Friday and was disabled on Monday is **compliant** under a one-working-day
   rule (Case 01's Daniel Okafor).
4. **Explained deviations.** Separating true exceptions from legitimate ones:
   retro-approved emergency changes, approved risk acceptances, service
   accounts, break-glass access with a reviewed log.
5. **Population completeness (IPE).** Proving the list under test is the whole
   list.
6. **Precision of review controls.** A review that happened is not a review
   that worked. Timing, volume and outcome reveal rubber-stamping.
7. **Design vs operation.** Recognising that a control ran perfectly and still
   could not catch the problem.
8. **Evaluation and severity.** Mitigating evidence, compensating controls,
   aggregation, root cause.
9. **Reliance chains.** One ITGC failure undermining an automated control, and
   through it the numbers downstream.

### Career shape, for pacing

| Level | What they own | Game analogue |
|---|---|---|
| Associate / staff | Executes test steps on a given population and sample | Early cases: the control is explained, the query path is short |
| Senior | Runs the engagement's fieldwork, designs tests, evaluates exceptions, drafts findings | Middle cases: player must pick the right comparison and rule out explained deviations |
| Manager | Scopes, challenges evidence quality, rates severity, agrees actions with management | Late cases: question the population itself, judge severity, identify cause |

Most IT auditors hold or work toward the **CISA** (ISACA). A player finishing
the ladder should have practised, in miniature, most of what that exam's
auditing domains describe.

---

## 7. A progression for Auditor Query

The current ladder in `RESKIN_PLAN.md` climbs SQL shapes well. Mapping it
against sections 4 and 6 shows two things to fix:

- **Case 06 ("termination, no deprovisioning") repeats Case 01.** Both are the
  orphaned leaver account. Keep Case 06's anti-join shape but move its subject
  to **population completeness**: the leaver list HR supplied omits
  contractors, the control looked clean, and only reconciling payroll against
  the directory reveals the missing leaver. Same SQL rung, a genuinely new
  auditor skill.
- **IT operations is untested.** No case touches batch jobs or backups. That
  suits an extra rung beyond Case 08, or a swap if a later case feels thin.

Recommended ladder, pairing each SQL rung with one realism dial from section 6:

| # | Case | Domain | SQL rung | Realism dial it introduces |
|---|---|---|---|---|
| 01 | ✅ The Leaver | Access: deprovisioning | `WHERE` + `JOIN` | Reading the control; "did the gap get used?" |
| 02 | ✅ The Green Light | Change approval | Multi-table triangulation | Design vs operation |
| 03 | Rubber-stamp review | Access recertification | `GROUP BY … HAVING` | Precision of review controls |
| 04 | Backdated approval | Change approval | Aggregate alias | Time logic: approval timestamp vs deployment |
| 05 | SoD conflict exercised | Finance ITGC | `SUM … HAVING` + TEXT join | Conflict held vs conflict **used** |
| 06 | The missing leaver | Access: IPE | Anti-join / `IS NULL` | Population completeness |
| 07 | Shared admin credential | Privileged access | Self-join, `EXCEPT` | Joining identities: one account, two people |
| 08 | Privilege creep | Entitlement drift | `LAG() OVER` | Explained deviations: which grants were approved exceptions |
| 09+ | Candidates | Operations; ITAC reliance; vendor master fraud | `LEAD`, `PARTITION BY`, `UNION` | Reliance chains; severity |

### Keep these unrealistic on purpose

Some realism would make a worse game. Hold these lines:

- **One planted contradiction per case.** Real populations have noise and many
  small exceptions. The game needs a single, provable answer.
- **Small tables.** Tens of rows, not thousands. Difficulty comes from the
  comparison, not the volume (`CASE_DESIGN.md`, dial 4).
- **No inquiry.** The player cannot interview anyone. Every fact comes from the
  memo or the data.
- **Short audit periods.** A week or a quarter keeps the data legible. When a
  case wants full-year realism, say in the memo that the player is testing the
  full population, which is the realistic framing for an analytics-led
  auditor anyway.

### Mechanics these findings suggest (not yet decided)

- **A severity blank** on the Finding (Low / Medium / High), graded against the
  memo's own rating criteria, from Case 05 onward.
- **A cause blank** ("the gate checked status, not system"), so the player
  names why the control failed, not just what happened.
- **A recommendation choice** between a condition fix and a cause fix, with the
  cause fix as the correct answer.
- **Explained-deviation decoys** as standard from Case 04 onward: a row that
  looks like the exception but is legitimate once a second table is consulted.

### Known gaps in the shipped cases

- **Case 01** is realistic as written: the one-working-day rule, the
  never-used orphan as a decoy and the review sign-off all hold up. It does not
  ask for severity or cause.
- **Case 02**'s audit period is one week, which reads as an incident review
  rather than a controls audit; framing it as full-population testing of the
  releases before the incident would fix that in one sentence. Leon Varga wrote
  and deployed his own commit, a segregation-of-duties issue a real auditor
  would raise; it is left unasked because Case 05 owns SoD.

---

## Sources

- ITGC domains, test steps and common deficiencies:
  [CloudEagle, ITGC testing](https://www.cloudeagle.ai/blogs/itgc-testing-how-to-run-it-general-controls),
  [MetricStream, IT general controls](https://www.metricstream.com/learn/it-general-controls-importance-components-implementation.html),
  [Eduyush, ITGC guide for auditors](https://eduyush.com/en-us/blogs/cima/it-general-controls-itgc),
  [Zluri, ITGC audit for access](https://www.zluri.com/blog/itgc-audit),
  [Weaver, terminated user exceptions](https://weaver.com/resources/how-reduce-terminated-user-exceptions-your-next-audit/)
- Change management testing:
  [Linford & Co, change control for SOC](https://linfordco.com/blog/change-control-management/),
  [Auditing Information Systems, IS change management](https://ecampusontario.pressbooks.pub/auditinginformationsystems/chapter/0503/)
- Sample sizes by frequency:
  [Sarbanes-Oxley Forum](https://www.sarbanes-oxley-forum.com/topic/6949/control-frequency-sample-size-1640),
  [Blue Sage Group testing guidelines](http://www.thebluesagegroup.com/resources/The%20Blue%20Sage%20Group%20Internal%20Control%20Testing%20Guidelines.pdf)
- Design vs operating effectiveness:
  [Linford & Co](https://linfordco.com/blog/design-vs-operating-effectiveness/),
  [ICAEW, six steps to an effective walkthrough](https://www.icaew.com/insights/viewpoints-on-the-news/2025/jul-2025/six-steps-to-an-effective-walkthrough)
- IPE and population completeness:
  [Schneider Downs, IPE 101](https://schneiderdowns.com/our-thoughts-on/ipe-understanding-information-produced-by-entity/),
  [KPMG, IPE and inspections](https://kpmg.com/kpmg-us/content/dam/kpmg/pdf/2023/ipe-audits-inspections.pdf),
  [AuditBoard, PCAOB inspection trends](https://auditboard.com/blog/leveraging-the-latest-pcaob-reports-to-improve-your-sox-program)
- Deficiency evaluation and severity:
  [BDO, evaluating control deficiencies](https://www.bdo.com/insights/assurance/evaluating-internal-control-deficiencies-guide),
  [Fieldguide, material weakness vs significant deficiency](https://fieldguide.io/resource-articles/material-weakness-vs-significant-deficiency-classification-guide)
- Finding attributes:
  [IIA, Global Internal Audit Standards](https://www.theiia.org/globalassets/site/standards/globalinternalauditstandards_2024january9.pdf),
  [Internal Auditor, the five attributes approach](https://internalauditor.theiia.org/en/articles/2023/february/the-five-attributes-approach/)
- Application controls and benchmarking:
  [Compact, benchmarking IT application controls](https://www.compact.nl/articles/benchmarking-it-application-controls/)
- SOC reports:
  [Wipfli, complementary user entity controls](https://www.wipfli.com/insights/articles/ra-soc-reports-the-value-of-complementary-user-entity-controls)
- Privileged and emergency access:
  [SAP Learning, monitoring emergency access](https://learning.sap.com/learning-journeys/discovering-the-main-functionalities-of-sap-access-control/monitoring-the-emergency-access-session_ed466dd1-8d00-4989-aa3d-331e8bfbebe5)
- Data analytics and full-population testing:
  [ACCA, data analytics for internal auditors](https://www.accaglobal.com/us/en/member/sectors/internal-audit/our-publications/data-analytics-for-internal-auditors.html),
  [Audit data analytics and full population testing](https://www.sciencedirect.com/science/article/pii/S240591882200006X)
- Vendor master fraud:
  [Washington State Auditor, vendor master file](https://sao.wa.gov/the-audit-connection-blog/protect-your-vendor-master-file-fraudsters)
- IT operations:
  [CyberArrow, ITGC categories and testing](https://www.cyberarrow.io/blog/what-are-itgc-controls/)
- Engagement phases and audit universe:
  [ISACA, audit universe and IT risk assessment](https://www.isaca.org/resources/news-and-trends/isaca-now-blog/2016/audit-universe-and-the-it-risk-assessment-process),
  [Auditing Information Systems, risk-based IS audit plans](https://ecampusontario.pressbooks.pub/auditinginformationsystems/chapter/0301/)
