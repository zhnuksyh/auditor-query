import { ChevronLeft, ChevronRight } from 'lucide-react'

// Curated beginner SQL video tutorials (open in a new tab).
const VIDEOS = [
  {
    title: 'SQL Tutorial — Full Database Course for Beginners',
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
// against the kind of tables the cases actually ship — accounts, entitlements,
// changes, approvals — so pasting one into Analysis means something.
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
    kw: 'LIKE',
    desc: 'Match text by pattern: % = any run of characters, _ = one character.',
    ex: "SELECT * FROM entitlements WHERE role_name LIKE '%admin%';",
  },
  {
    kw: 'IN',
    desc: 'Match any value from a set — shorter than chaining ORs.',
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
    desc: 'Find rows with NO match in the other table — the auditor’s workhorse.',
    ex: 'SELECT c.id\nFROM changes c\nLEFT JOIN approvals ap ON ap.change_id = c.id\nWHERE ap.id IS NULL;',
  },
  {
    kw: 'ORDER BY … LIMIT',
    desc: 'Sort the results (DESC to reverse) and cap how many rows come back.',
    ex: 'SELECT * FROM access_logs\nORDER BY granted_on DESC LIMIT 5;',
  },
  {
    kw: 'DISTINCT',
    desc: 'Drop duplicate rows/values — handy for “how many different …”.',
    ex: 'SELECT COUNT(DISTINCT system_id) FROM entitlements;',
  },
  {
    kw: 'GROUP BY … HAVING',
    desc: 'Bucket rows to aggregate (COUNT, SUM…); HAVING filters the buckets.',
    ex: 'SELECT reviewer_id, COUNT(*) FROM reviews\nGROUP BY reviewer_id HAVING COUNT(*) > 50;',
  },
]

// Domain vocabulary. A murder mystery needs no glossary; an audit does. Every
// case leans on at least one of these, and the scope memo introduces a term in
// plain language before the player has to query it — but this is where someone
// who has never sat an audit can look it up without leaving the game.
const GLOSSARY = [
  {
    term: 'Control',
    desc: 'A rule the organisation says it enforces — “every production change is approved before it ships”. The engagement tests whether the records bear that out.',
  },
  {
    term: 'Exception',
    desc: 'A record that breaks the control. One is a finding; a pattern is a systemic failure. Finding it is the game.',
  },
  {
    term: 'Segregation of duties (SoD)',
    desc: 'No one person should hold two powers that together let them act unchecked — raise a payment and approve it, write the code and deploy it.',
  },
  {
    term: 'Entitlement',
    desc: 'A specific access right an account holds on a system: a role, a group, a permission.',
  },
  {
    term: 'Privileged access',
    desc: 'Rights beyond an ordinary user — admin, root, superuser. Audited hardest, because they can erase their own tracks.',
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
    desc: 'The body that approves production changes. A deploy with no CAB record — or one approved after it shipped — is an exception.',
  },
  {
    term: 'ITGC',
    desc: 'IT General Controls: access, change management, and operations. The baseline an IT audit tests.',
  },
  {
    term: 'Audit period',
    desc: 'The window under examination. Evidence outside it is out of scope — check the dates before you conclude.',
  },
  {
    term: 'Workpaper',
    desc: 'Where an auditor records what they tested and what they found, so someone else can re-walk it. Your notebook on the Analysis tab.',
  },
]

// Renders as a full screen from the main menu, or as an in-place overlay when
// `overlay` is set (opened via the book icon / Tab key in the case header,
// which also owns the close control).
export default function Guide({ game, play, overlay = false }) {
  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-8">
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
              Read the <b className="text-zinc-100">Scope</b> — the memo names the control being
              tested and states every fact you'll need to evidence the exception.
            </Step>
            <Step n="2">
              Study the <b className="text-zinc-100">Data Map</b> — the tables you've been given,
              their columns, and how they connect (foreign keys).
            </Step>
            <Step n="3">
              Write SQL in <b className="text-zinc-100">Analysis</b> to test the control and
              surface the records that contradict it.
            </Step>
            <Step n="4">
              Write up the <b className="text-zinc-100">Finding</b>. Each blank unlocks only after
              you run the query that evidences it — then submit to close the engagement.
            </Step>
          </ol>
          <p className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-xs text-zinc-400">
            You can't guess your way through, and a finding you can't evidence isn't a finding.
            The records never lie — find where the <i>control</i> does.
          </p>
        </Section>

        {/* SQL cheat sheet */}
        <Section title="SQL you'll actually use">
          <div className="space-y-3">
            {CLAUSES.map((c) => (
              <div key={c.kw} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-sm font-semibold text-exception">{c.kw}</span>
                  <span className="text-right text-xs text-zinc-400">{c.desc}</span>
                </div>
                <pre className="mt-2 overflow-x-auto rounded-lg bg-zinc-950 p-3 font-mono text-xs leading-relaxed text-zinc-300">
                  {c.ex}
                </pre>
              </div>
            ))}
          </div>
        </Section>

        {/* Domain glossary — the thing the murder game never needed. */}
        <Section title="Audit vocabulary">
          <div className="space-y-2">
            {GLOSSARY.map((g) => (
              <div key={g.term} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                <div className="text-sm font-semibold text-zinc-200">{g.term}</div>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">{g.desc}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Video tutorials */}
        <Section title="Learn SQL — video tutorials">
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
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">{title}</h2>
      {children}
    </section>
  )
}

function Step({ n, children }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-zinc-700 text-[10px] font-bold text-zinc-400">
        {n}
      </span>
      <span>{children}</span>
    </li>
  )
}
