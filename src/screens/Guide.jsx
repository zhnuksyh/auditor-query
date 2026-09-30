import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Info } from 'lucide-react'

// Curated beginner SQL video tutorials (open in a new tab).
const VIDEOS = [
  {
    title: 'SQL Tutorial: Full Database Course for Beginners',
    by: 'freeCodeCamp',
    url: 'https://www.youtube.com/watch?v=HXV3zeQKqGY',
  },
  {
    title: 'Learn SQL In 60 Minutes',
    by: 'Web Dev Simplified',
    url: 'https://www.youtube.com/watch?v=p3qvj9hO_Bo',
  },
  {
    title: 'SQL Explained in 100 Seconds',
    by: 'Fireship',
    url: 'https://www.youtube.com/watch?v=zsjvFFKOm3c',
  },
]

// The core clauses a player needs to work an engagement. The examples run
// against the kind of tables the cases actually ship (accounts, entitlements,
// changes, approvals), so pasting one into Analysis means something.
const CLAUSES = [
  {
    kw: 'SELECT … FROM',
    desc: 'Pick which columns to see, from which table.',
    ex: 'SELECT name, department FROM accounts;',
  },
  {
    kw: 'WHERE',
    desc: 'Keep only the rows that match a condition.',
    ex: "SELECT * FROM accounts WHERE status = 'active';",
  },
  {
    kw: '= <> < >',
    desc: 'Compare two values; <> means “not equal”. Dates written YYYY-MM-DD compare correctly as text, so > means “later than”.',
    ex: 'SELECT * FROM changes WHERE approved_on > deployed_on;',
  },
  {
    kw: 'IS NULL / IS NOT NULL',
    desc: 'Test for a missing value. “= NULL” never matches anything, not even a missing value, so always use IS NULL.',
    ex: 'SELECT * FROM accounts WHERE disabled_on IS NULL;',
  },
  {
    kw: 'LIKE',
    desc: 'Match text by pattern: % = any run of characters, _ = one character.',
    ex: "SELECT * FROM entitlements WHERE role_name LIKE '%admin%';",
  },
  {
    kw: 'IN',
    desc: 'Match any value from a set. Shorter than chaining ORs.',
    ex: "SELECT * FROM accounts WHERE department IN ('Finance', 'IT');",
  },
  {
    kw: 'AND / OR / BETWEEN',
    desc: 'Combine conditions; BETWEEN checks a range (inclusive).',
    ex: "SELECT * FROM changes\nWHERE deployed_on BETWEEN '2026-03-01' AND '2026-03-31';",
  },
  {
    kw: 'JOIN … ON',
    desc: 'Combine two tables by a matching column (usually a key).',
    ex: 'SELECT a.name, e.role_name\nFROM accounts a\nJOIN entitlements e ON e.account_id = a.id;',
  },
  {
    kw: 'LEFT JOIN … IS NULL',
    desc: 'Find rows with NO match in the other table: the auditor’s workhorse.',
    ex: 'SELECT c.id\nFROM changes c\nLEFT JOIN approvals ap ON ap.change_id = c.id\nWHERE ap.id IS NULL;',
  },
  {
    kw: 'ORDER BY … LIMIT',
    desc: 'Sort the results (DESC to reverse) and cap how many rows come back.',
    ex: 'SELECT * FROM access_logs\nORDER BY granted_on DESC LIMIT 5;',
  },
  {
    kw: 'DISTINCT',
    desc: 'Drop duplicate rows/values; handy for “how many different …”.',
    ex: 'SELECT COUNT(DISTINCT system_id) FROM entitlements;',
  },
  {
    kw: 'GROUP BY … HAVING',
    desc: 'Bucket rows to aggregate (COUNT, SUM…); HAVING filters the buckets.',
    ex: 'SELECT reviewer_id, COUNT(*) FROM reviews\nGROUP BY reviewer_id HAVING COUNT(*) > 50;',
  },
  {
    kw: 'AS (alias)',
    desc: 'Name a result column, so a count or a joined value says what it is.',
    ex: 'SELECT username AS flagged_account FROM accounts;',
  },
  {
    kw: 'MIN / MAX / SUM',
    desc: 'Smallest, largest and total within each group. A comparison counts as 1 or 0, so SUM(x = \'y\') counts matching rows.',
    ex: "SELECT reviewer_id, MIN(decided_at) AS first_at,\n  SUM(decision = 'Revoke') AS revoked\nFROM reviews GROUP BY reviewer_id;",
  },
  {
    kw: 'Self-join',
    desc: 'Join a table to itself under two aliases to compare its rows with each other.',
    ex: 'SELECT a.id, b.id\nFROM sessions a\nJOIN sessions b ON b.account = a.account AND a.id < b.id;',
  },
  {
    kw: 'Subquery · NOT IN',
    desc: 'Use one query’s result inside another, e.g. to leave out a list of names.',
    ex: 'SELECT * FROM accounts\nWHERE id NOT IN (SELECT account_id FROM exceptions);',
  },
  {
    kw: 'NOT EXISTS',
    desc: 'Keep a row only if a subquery finds nothing for it. Does the same job as LEFT JOIN … IS NULL, and often reads more plainly.',
    ex: 'SELECT * FROM changes c\nWHERE NOT EXISTS (\n  SELECT 1 FROM approvals ap WHERE ap.change_id = c.id\n);',
  },
  {
    kw: 'EXCEPT',
    desc: 'Rows the first query returns that the second does not. Both must select the same columns.',
    ex: 'SELECT host FROM sessions\nEXCEPT\nSELECT host FROM approved_hosts;',
  },
  {
    kw: 'WITH … AS (CTE)',
    desc: 'Name a query and use it like a table in the next one. Good for a baseline you compare every row against.',
    ex: 'WITH usual AS (\n  SELECT account, AVG(amount) AS avg_amount\n  FROM payments GROUP BY account\n)\nSELECT p.* FROM payments p JOIN usual u USING (account)\nWHERE p.amount > u.avg_amount * 3;',
  },
  {
    kw: 'UNION ALL',
    desc: 'Stack the rows of two queries into one result, e.g. two logs of the same kind of event. Both must select the same number of columns.',
    ex: "SELECT 'web' AS source, user_id, logged_at FROM web_logins\nUNION ALL\nSELECT 'vpn', user_id, logged_at FROM vpn_logins\nORDER BY logged_at;",
  },
  {
    kw: 'julianday()',
    desc: 'Turns a date into a day number, so two dates can be subtracted.',
    ex: 'SELECT julianday(closed_on) - julianday(opened_on) AS days_open\nFROM tickets;',
  },
  {
    kw: 'LAG() OVER (…)',
    desc: 'Read the previous row’s value. PARTITION BY restarts the count for each group; wrap it in a subquery to filter on the result.',
    ex: 'SELECT * FROM (\n  SELECT account, amount,\n    LAG(amount) OVER (PARTITION BY account ORDER BY day) AS prev\n  FROM balances\n) WHERE amount > prev;',
  },
]

// Domain vocabulary. A murder mystery needs no glossary; an audit does. Every
// case leans on at least one of these, and the scope memo introduces a term in
// plain language before the player has to query it, but this is where someone
// who has never sat an audit can look it up without leaving the game.
const GLOSSARY = [
  {
    term: 'Control',
    desc: 'A rule the organisation says it enforces, such as “every production change is approved before it ships”. The engagement tests whether the records bear that out.',
  },
  {
    term: 'Exception',
    desc: 'A record that breaks the control. One is a finding; a pattern is a systemic failure. Finding it is the game.',
  },
  {
    term: 'Segregation of duties (SoD)',
    desc: 'No one person should hold two powers that together let them act unchecked: raise a payment and approve it, write the code and deploy it.',
  },
  {
    term: 'Entitlement',
    desc: 'A specific access right an account holds on a system: a role, a group, a permission.',
  },
  {
    term: 'Privileged access',
    desc: 'Rights beyond an ordinary user: admin, root, superuser. Audited hardest, because they can erase their own tracks.',
  },
  {
    term: 'Joiner-mover-leaver (JML)',
    desc: 'The account lifecycle. Leavers are where audits bite: a termination with no matching deprovisioning leaves a live account nobody owns.',
  },
  {
    term: 'Orphaned account',
    desc: 'An active account with no active owner. The classic access finding.',
  },
  {
    term: 'Recertification',
    desc: 'A periodic review where an owner re-confirms who should still have access. A reviewer who approved four hundred lines in nine minutes has not reviewed anything.',
  },
  {
    term: 'Change advisory board (CAB)',
    desc: 'The body that approves production changes. A deploy with no CAB record, or one approved after it shipped, is an exception.',
  },
  {
    term: 'Change ticket',
    desc: 'The record of one proposed change, with its own reference (CHG-4410). It names the system the change is for, and a CAB approval covers exactly that, not any change that happens to quote the number.',
  },
  {
    term: 'Automated control',
    desc: 'A control enforced by a system rather than a person, such as a pipeline gate that blocks unapproved releases. It is only as good as what it checks: test the rule it enforces, not just that it ran.',
  },
  {
    term: 'Emergency change',
    desc: 'A change deployed before approval to fix a live fault. Compliant only if it is approved retrospectively within the procedure’s deadline.',
  },
  {
    term: 'Audit trail',
    desc: 'A system-written history of who changed a record and when. Unlike the record’s own date fields, users cannot edit it.',
  },
  {
    term: 'Precision',
    desc: 'Whether a review control could actually catch a problem. A review that happened is not a review that worked.',
  },
  {
    term: 'Mitigating control',
    desc: 'A second control that covers a known gap, such as an independent review of a user who holds conflicting roles under an approved exception.',
  },
  {
    term: 'Population',
    desc: 'The full set of items a control should have operated on: every leaver, every change. Test the whole list, and prove the list is whole.',
  },
  {
    term: 'IPE',
    desc: 'Information produced by the entity: a report or extract the organisation gives you. Before relying on it, check it is complete and accurate against its source.',
  },
  {
    term: 'Generic account',
    desc: 'A shared login such as db_admin that belongs to no single person. Its logs name the account, never the human.',
  },
  {
    term: 'Password vault',
    desc: 'A system that releases a generic account’s password to one named person for a set window, records who, and changes the password afterwards.',
  },
  {
    term: 'Mover',
    desc: 'Someone who changes job internally. Their old access should go when they move; a handover exception may allow a short, approved overlap.',
  },
  {
    term: 'Privilege creep',
    desc: 'Access that accumulates across moves because new roles are added and old ones never removed.',
  },
  {
    term: 'Recovery point objective (RPO)',
    desc: 'The most data the business can afford to lose in a restore, set per system. A weekly backup can only meet an RPO of seven days if it actually backs something up.',
  },
  {
    term: 'Restore test',
    desc: 'Restoring a backup to prove it works. A backup nobody has restored is a hope, not a control.',
  },
  {
    term: 'Three-way match',
    desc: 'An automated control that pays an invoice only if it agrees with the purchase order and the goods received, within a set tolerance.',
  },
  {
    term: 'Reliance',
    desc: 'Trusting an automated control without retesting it, which is only safe while change and access ITGCs stop anyone altering it unnoticed.',
  },
  {
    term: 'ITGC',
    desc: 'IT General Controls: access, change management, and operations. The baseline an IT audit tests.',
  },
  {
    term: 'Audit period',
    desc: 'The window under examination. Evidence outside it is out of scope. Check the dates before you conclude.',
  },
  {
    term: 'Workpaper',
    desc: 'Where an auditor records what they tested and what they found, so someone else can re-walk it. Your notebook on the Analysis tab.',
  },
]

// The vocabulary view lists terms alphabetically, a page at a time; the
// GLOSSARY array stays in the order terms were introduced.
const TERMS = [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term))
const TERMS_PER_PAGE = 8

// Renders as a full screen from the main menu, or as an in-place overlay when
// `overlay` is set (opened via the book icon / Tab key in the case header,
// which also owns the close control). The vocabulary opens as a second view
// inside it, so it works the same from either entry point.
export default function Guide({ game, play, overlay = false }) {
  const [view, setView] = useState('manual')
  const [page, setPage] = useState(0)
  const scrollRef = useRef(null)

  const toTop = () => scrollRef.current?.scrollTo({ top: 0 })
  const showView = (next) => {
    setView(next)
    toTop()
  }
  const showPage = (next) => {
    setPage(next)
    toTop()
  }

  return (
    <div ref={scrollRef} className="h-full w-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-8">
        {view === 'vocab' ? (
          <Vocabulary
            page={page}
            onPage={showPage}
            onBack={() => showView('manual')}
            play={play}
          />
        ) : (
          <>
            <header className="mb-8 border-b border-zinc-800 pb-4">
              {!overlay && (
                <button
                  onClick={() => {
                    play?.('click')
                    game.setScreen('menu')
                  }}
                  onMouseEnter={() => play?.('hover')}
                  className="flex items-center gap-1 text-[11px] uppercase tracking-[0.3em] text-zinc-500 hover:text-zinc-100"
                >
                  <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
                  main menu
                </button>
              )}
              <h1 className="mt-3 font-display text-4xl font-black text-zinc-100">AUDIT MANUAL</h1>
              <p className="mt-2 text-sm text-zinc-500">
                Everything you need to work an engagement with SQL.
              </p>
            </header>

            {/* How the game works */}
            <Section title="How an engagement works">
              <ol className="space-y-2 text-sm leading-relaxed text-zinc-300">
                <Step n="1">
                  Read the <b className="text-zinc-100">Scope</b>: the memo names the control being
                  tested and states every fact you'll need to evidence the exception.
                </Step>
                <Step n="2">
                  Study the <b className="text-zinc-100">Data Map</b>: the tables you've been given,
                  their columns, and how they connect (foreign keys).
                </Step>
                <Step n="3">
                  Write SQL in <b className="text-zinc-100">Analysis</b> to test the control and
                  surface the records that contradict it.
                </Step>
                <Step n="4">
                  Write up the <b className="text-zinc-100">Finding</b>. Every blank offers several
                  plausible answers, and only your query results tell them apart. Submit to close
                  the engagement.
                </Step>
              </ol>
              <p className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-xs text-zinc-400">
                You can't guess your way through, and a finding you can't evidence isn't a finding.
                The records never lie. Find where the <i>control</i> does.
              </p>
            </Section>

            {/* SQL cheat sheet */}
            <Section title="SQL you'll actually use">
              <div className="space-y-3">
                {CLAUSES.map((c, i) => (
                  <div key={c.kw} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                    {/* The tooltip anchors to this row, not the icon, so it
                        spans the card instead of running off a narrow screen. */}
                    <div className="relative flex items-center gap-2">
                      <span className="whitespace-nowrap font-mono text-sm font-semibold text-exception">{c.kw}</span>
                      <InfoTip id={`clause-${i}`} label={c.kw} text={c.desc} />
                    </div>
                    <Code>{c.ex}</Code>
                  </div>
                ))}
              </div>
            </Section>

            {/* Domain glossary: the thing the murder game never needed. Too long
                to list inline, so it opens as its own paged view. */}
            <Section title="Audit vocabulary">
              <button
                onClick={() => {
                  play?.('paper')
                  showView('vocab')
                }}
                onMouseEnter={() => play?.('hover')}
                className="group flex w-full items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-left transition-colors hover:border-exception/60"
              >
                <div>
                  <div className="text-sm font-semibold text-zinc-200">
                    Browse all {TERMS.length} terms
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                    {TERMS.slice(0, 4).map((t) => t.term).join(' · ')} …
                  </p>
                </div>
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-zinc-500 transition-colors group-hover:text-exception"
                  strokeWidth={2.5}
                />
              </button>
            </Section>

            {/* Video tutorials */}
            <Section title="Learn SQL: video tutorials">
              <div className="space-y-2">
                {VIDEOS.map((v) => (
                  <a
                    key={v.url}
                    href={v.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onMouseEnter={() => play?.('hover')}
                    className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 transition-colors hover:border-zinc-600"
                  >
                    <div>
                      <div className="text-sm font-medium text-zinc-200">{v.title}</div>
                      <div className="text-xs text-zinc-500">{v.by}</div>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase leading-none tracking-widest text-zinc-500">
                      <span className="pt-px">watch</span>
                      <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </span>
                  </a>
                ))}
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  )
}

function Vocabulary({ page, onPage, onBack, play }) {
  const pages = Math.ceil(TERMS.length / TERMS_PER_PAGE)
  const first = page * TERMS_PER_PAGE
  const shown = TERMS.slice(first, first + TERMS_PER_PAGE)

  return (
    <>
      <header className="mb-6 border-b border-zinc-800 pb-4">
        <button
          onClick={() => {
            play?.('back')
            onBack()
          }}
          onMouseEnter={() => play?.('hover')}
          className="flex items-center gap-1 text-[11px] uppercase tracking-[0.3em] text-zinc-500 hover:text-zinc-100"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
          audit manual
        </button>
        <h1 className="mt-3 font-display text-4xl font-black text-zinc-100">AUDIT VOCABULARY</h1>
        <p className="mt-2 text-sm text-zinc-500">
          {TERMS.length} terms the engagements use, A to Z.
        </p>
      </header>

      <ol className="space-y-2">
        {shown.map((g) => (
          <li key={g.term} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="text-sm font-semibold text-zinc-200">{g.term}</div>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">{g.desc}</p>
          </li>
        ))}
      </ol>

      {/* Pinned to the bottom of the scroll area so the pages stay reachable
          while a long page of terms scrolls underneath. */}
      <div className="sticky -bottom-8 mt-6 border-t border-zinc-800 bg-zinc-950/95 pb-11 pt-4 backdrop-blur">
        <nav
          aria-label="Vocabulary pages"
          className="flex items-center justify-between gap-3"
        >
          <PageButton disabled={page === 0} onClick={() => onPage(page - 1)} play={play}>
            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.5} />
            prev
          </PageButton>

          <div className="flex flex-wrap justify-center gap-1.5">
            {Array.from({ length: pages }, (_, i) => (
              <button
                key={i}
                onClick={() => {
                  play?.('click')
                  onPage(i)
                }}
                aria-current={i === page ? 'page' : undefined}
                className={`h-7 min-w-7 rounded-md border px-2 font-mono text-[11px] transition-colors ${
                  i === page
                    ? 'border-exception text-exception'
                    : 'border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-200'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <PageButton disabled={page === pages - 1} onClick={() => onPage(page + 1)} play={play}>
            next
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
          </PageButton>
        </nav>
        <p className="mt-2 text-center text-[11px] text-zinc-600">
          {first + 1}–{first + shown.length} of {TERMS.length}
        </p>
      </div>
    </>
  )
}

function PageButton({ disabled, onClick, play, children }) {
  return (
    <button
      disabled={disabled}
      onClick={() => {
        play?.('click')
        onClick()
      }}
      onMouseEnter={() => !disabled && play?.('hover')}
      className="flex items-center gap-1 text-[11px] uppercase tracking-[0.2em] text-zinc-400 transition-colors hover:text-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-700"
    >
      {children}
    </button>
  )
}

export function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">{title}</h2>
      {children}
    </section>
  )
}

// An "i" icon that reveals `text` on hover, or on focus so a keyboard or a tap
// on a touch screen can open it too. Positioned against the nearest `relative`
// ancestor, which the caller chooses.
function InfoTip({ id, label, text }) {
  return (
    <span className="group/tip inline-flex">
      <button
        type="button"
        aria-label={`What ${label} does`}
        aria-describedby={id}
        className="flex h-5 w-5 items-center justify-center rounded-full text-zinc-500 transition-colors hover:text-exception focus:text-exception focus:outline-none"
      >
        <Info className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none invisible absolute left-0 top-full z-10 mt-2 w-full max-w-sm rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-xs leading-relaxed text-zinc-300 opacity-0 shadow-xl transition-opacity group-focus-within/tip:visible group-focus-within/tip:opacity-100 group-hover/tip:visible group-hover/tip:opacity-100"
      >
        {text}
      </span>
    </span>
  )
}

export function Step({ n, children }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-zinc-700 text-[10px] font-bold text-zinc-400">
        {n}
      </span>
      <div className="min-w-0">{children}</div>
    </li>
  )
}

export function Code({ children }) {
  return (
    <pre className="mt-2 overflow-x-auto rounded-lg bg-zinc-950 p-3 font-mono text-xs leading-relaxed text-zinc-300">
      {children}
    </pre>
  )
}

export function Mono({ children }) {
  return <code className="font-mono text-[0.85em] text-zinc-100">{children}</code>
}
