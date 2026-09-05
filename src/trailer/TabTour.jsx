import { useEffect, useRef, useState } from 'react'
import TabBar from '../components/TabBar.jsx'
import CaseStamp from '../components/CaseStamp.jsx'
import TrailerCaseBoard from './TrailerCaseBoard.jsx'
import { case01 } from '../cases/case01.js'

/**
 * A faithful, scaled-down recreation of the real game dashboard that plays
 * itself: it auto-navigates the four folder tabs (Crime Scene -> Case Board ->
 * Analysis -> Report Card), types and "runs" the proving query, verifies a
 * clue, fills the report blanks, and slams CASE CLOSED. The visuals mirror the
 * real components; the choreography is driven by a scene-relative clock.
 *
 * `t` is seconds since this scene mounted. `onCue(name)` fires audio cues at
 * beat boundaries — the parent maps them to the game's SFX so the sound stays
 * in lockstep with the picture, and stays correct after pause/resume.
 */

const TABS = [
  { key: 'scene', label: 'CRIME SCENE' },
  { key: 'board', label: 'CASE BOARD' },
  { key: 'analysis', label: 'ANALYSIS' },
  { key: 'report', label: 'REPORT CARD' },
]

// Beat map (seconds, scene-relative). Each tab gets a dwell; within Analysis
// the query types, runs, and verifies; within Report the blanks fill and the
// case closes.
const T_BOARD = 1.7
// The board dwells long enough to scroll down and reveal the tables below the
// fold, then scroll back, before Analysis opens (see BoardScroller).
const T_BOARD_SCROLL_DOWN = 2.5 // start easing down
const T_BOARD_SCROLL_UP = 3.7 // start easing back to top
const T_ANALYSIS = 4.6
const T_QUERY_DONE = 6.6 // query finished typing -> RUN
const T_RESULTS = 7.1 // results rows appear
const T_VERIFIED = 7.9 // CLUE VERIFIED toast
const T_REPORT = 9.0
// Blanks fill one-by-one so it reads like the answers are being entered.
const T_FILL = [9.7, 10.2, 10.7, 11.2]
const T_SUBMIT = 12.1 // submit -> stamp slam
const T_STAMP = 12.4

const FULL_QUERY = `SELECT s.name, k.wing, k.swipe_time
FROM suspects s
JOIN keycard_logs k ON k.suspect_id = s.id
JOIN coroner_reports c
WHERE k.direction = 'IN'
  AND k.swipe_time BETWEEN c.tod_from AND c.tod_to;`

function tabFor(t) {
  if (t >= T_REPORT) return 'report'
  if (t >= T_ANALYSIS) return 'analysis'
  if (t >= T_BOARD) return 'board'
  return 'scene'
}

export default function TabTour({ t, onCue }) {
  const activeTab = tabFor(t)

  // Fire a paper-flip cue exactly when the active tab changes.
  const [lastTab, setLastTab] = useState('scene')
  useEffect(() => {
    if (activeTab !== lastTab) {
      onCue?.('paper')
      setLastTab(activeTab)
    }
  }, [activeTab, lastTab, onCue])

  // One-shot cues inside Analysis / Report, fired as the clock crosses each beat.
  const [fired, setFired] = useState(() => new Set())
  useEffect(() => {
    const cross = (mark, name) => {
      if (t >= mark && !fired.has(mark)) {
        onCue?.(name)
        setFired((s) => new Set(s).add(mark))
      }
    }
    cross(T_QUERY_DONE, 'run')
    cross(T_VERIFIED, 'unlock')
    // A soft "select" tick as each report blank fills in.
    T_FILL.forEach((mark) => cross(mark, 'select'))
    cross(T_SUBMIT, 'success')
    cross(T_STAMP, 'stamp')
  }, [t, fired, onCue])

  return (
    <div className="flex h-full w-full items-center justify-center px-4">
      {/* The dashboard at NATURAL 1:1 pixels — no scale() transform. The active
          tab merges into the card via a 1px seam, which only stays pixel-exact
          (seamless) when unscaled, exactly as in the real game. max-w-4xl
          matches the game so three table cards fit in the first row. */}
      <div className="w-full max-w-4xl">
        {/* Header row, matching the real dashboard chrome. */}
        <div className="mx-auto mb-3 flex w-full items-center justify-between px-1">
          <div className="flex items-center gap-4">
            <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">‹ files</span>
            <div className="h-4 w-px bg-zinc-800" />
            <span className="text-sm font-medium tracking-wide text-zinc-200">
              The Midnight Drift
            </span>
          </div>
          <div className="rounded-lg border border-zinc-800 p-1.5 text-zinc-500">
            <BookIcon />
          </div>
        </div>

        {/* Folder card: real TabBar sticking out of a white-outlined content box.
            Same structure as the game (GameDashboard): the TabBar row carries a
            bottom border, and the card below uses -mt-px so the active tab's
            open bottom merges seamlessly into the card outline. */}
        <div className="mx-auto w-full">
          <div className="overflow-x-auto">
            <TabBar tabs={TABS} active={activeTab} onSelect={() => {}} />
          </div>
          <div className="-mt-px h-[400px] overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-950">
            {/* Keyed so each tab replays the game's fade-up on entry. The board
                skips the fade-up transform: its FK connectors are measured from
                the live DOM, and a mid-animation transform would throw the
                measurement off. */}
            <div key={activeTab} className={`h-full ${activeTab === 'board' ? '' : 'animate-fade-up'}`}>
              {activeTab === 'scene' && <SceneView />}
              {activeTab === 'board' && (
                <BoardScroller t={t}>
                  <TrailerCaseBoard caseData={case01} />
                </BoardScroller>
              )}
              {activeTab === 'analysis' && <AnalysisView t={t} />}
              {activeTab === 'report' && <ReportView t={t} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Crime Scene tab -------------------------------------------------------
function SceneView() {
  return (
    <div className="h-full overflow-hidden px-8 py-7">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-2xl font-semibold text-zinc-100">Crime Scene</h2>
        <p className="mt-1 text-xs text-zinc-500">The Midnight Drift</p>
        <dl className="mb-6 mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-zinc-800 bg-zinc-800">
          <Vital term="Victim" line1="Adrian Vale, 54" line2="Publisher" />
          <Vital term="Location" line1="Vale Press — East Wing" line2="Study, Floor 3" />
          <Vital term="Time of death" line1="23:10 – 23:25" line2="June 14th" />
        </dl>
        <p className="text-[15px] leading-[2.4] text-zinc-300">
          At 00:04 the custodian found ADRIAN VALE face-down at his desk. A single deep wound to
          the left of the neck. No forced entry — but the East Wing logs every keycard swipe.
          Four alibis. One statement contradicts the swipes.
        </p>
      </div>
    </div>
  )
}

function Vital({ term, line1, line2 }) {
  return (
    <div className="bg-zinc-950 p-4">
      <dt className="mb-1.5 text-[10px] uppercase tracking-[0.25em] text-zinc-600">{term}</dt>
      <dd className="text-sm text-zinc-200">{line1}</dd>
      <dd className="text-xs text-zinc-400">{line2}</dd>
    </div>
  )
}

// --- Case Board auto-scroll ------------------------------------------------
// The real Case Board is taller than the card, so tables sit below the fold.
// This eases the board's own scroll container down to reveal them, then back
// to the top, timed off the scene clock — a gentle "here's the whole board"
// pan before the tab switches. It drives the child DataMapTab's scrollable
// div (found by ref) rather than owning the scroll itself.
function BoardScroller({ t, children }) {
  const wrapRef = useRef(null)

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    // The DataMapTab root is the scrollable element (overflow-auto).
    const scroller = wrap.querySelector('div')
    if (!scroller) return
    const max = scroller.scrollHeight - scroller.clientHeight
    if (max <= 0) return

    // ease-in-out for a smooth pan.
    const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2)
    let p = 0
    if (t >= T_BOARD_SCROLL_DOWN && t < T_BOARD_SCROLL_UP) {
      p = ease((t - T_BOARD_SCROLL_DOWN) / (T_BOARD_SCROLL_UP - T_BOARD_SCROLL_DOWN))
    } else if (t >= T_BOARD_SCROLL_UP && t < T_ANALYSIS) {
      p = 1 - ease((t - T_BOARD_SCROLL_UP) / (T_ANALYSIS - T_BOARD_SCROLL_UP))
    }
    scroller.scrollTop = p * max
  }, [t])

  return (
    <div ref={wrapRef} className="h-full">
      {children}
    </div>
  )
}

// --- Analysis tab ----------------------------------------------------------
const RESULT_ROWS = [
  { name: 'Theo Marsh', wing: 'East Wing', time: '23:12', flag: true },
]

function AnalysisView({ t }) {
  // Reveal the query progressively by character count (fast typing feel).
  const typeStart = T_ANALYSIS + 0.25
  const typeDur = T_QUERY_DONE - typeStart
  const prog = Math.max(0, Math.min(1, (t - typeStart) / typeDur))
  const shown = FULL_QUERY.slice(0, Math.ceil(prog * FULL_QUERY.length))
  const running = t >= T_QUERY_DONE && t < T_RESULTS
  const showResults = t >= T_RESULTS
  const verified = t >= T_VERIFIED

  return (
    <div className="flex h-full gap-4 p-5">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-800">
        <div className="flex h-10 items-center justify-between border-b border-zinc-800 px-4">
          <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">SQL input</span>
          <button
            className={`rounded-full px-5 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-colors ${
              running ? 'bg-crimson text-white' : 'bg-zinc-100 text-zinc-950'
            }`}
          >
            {running ? 'RUNNING…' : 'RUN'}
          </button>
        </div>
        {/* Editor body */}
        <div className="h-[150px] overflow-hidden border-b border-zinc-800 bg-zinc-950 px-4 py-3 font-mono text-[12.5px] leading-relaxed">
          <SqlHighlight text={shown} />
          {!running && !showResults && <span className="dq-caret align-middle" />}
        </div>
        {/* Results header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-1.5">
          <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">query results</span>
          {showResults && <span className="text-[10px] text-zinc-600">{RESULT_ROWS.length} row(s)</span>}
        </div>
        {/* Results grid */}
        <div className="relative min-h-0 flex-1 overflow-hidden font-mono text-[12px]">
          {showResults ? (
            <>
              <div className="grid grid-cols-3 gap-x-4 border-b border-zinc-800 px-4 py-2 text-[10px] uppercase tracking-widest text-zinc-500">
                <span>name</span>
                <span>wing</span>
                <span>swipe_time</span>
              </div>
              {RESULT_ROWS.map((r) => (
                <div
                  key={r.name}
                  className={`grid animate-fade-up grid-cols-3 gap-x-4 px-4 py-2 ${
                    r.flag ? 'bg-crimson/15 text-zinc-100' : 'text-zinc-300'
                  }`}
                >
                  <span className="font-semibold">{r.name}</span>
                  <span>{r.wing}</span>
                  <span>{r.time}</span>
                </div>
              ))}
              <div className="px-4 py-3 text-[11px] leading-relaxed text-zinc-500">
                &gt; one suspect entered the East Wing inside the coroner's window — while their
                alibi swore they were never there.
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-[11px] text-zinc-600">
              {running ? 'querying evidence…' : 'run a query to see results'}
            </div>
          )}

          {verified && (
            <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 animate-toast-up rounded-xl border border-[#f26d78]/40 bg-zinc-900 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-[#f26d78] shadow-lg">
              CLUE VERIFIED!
            </div>
          )}
        </div>
      </div>

      {/* Notebook sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 lg:flex">
        <div className="flex h-10 items-center border-b border-zinc-800 px-4 text-[10px] uppercase tracking-[0.25em] text-zinc-500">
          detective's notebook
        </div>
        <div className="flex-1 px-4 py-3 font-mono text-[11px] leading-relaxed text-zinc-400">
          - TOD 23:10–23:25
          <br />- Theo: "never entered E. Wing"
          <br />- keycard: IN @ 23:12 ✕<br />- LEFT-handed wound
        </div>
      </aside>
    </div>
  )
}

// Minimal SQL syntax colouring for the trailer editor.
const KEYWORDS = /\b(SELECT|FROM|JOIN|ON|WHERE|AND|OR|BETWEEN|GROUP|BY|HAVING|ORDER)\b/g
function SqlHighlight({ text }) {
  // Split into lines, then tokenize keywords / strings for colour.
  return (
    <pre className="whitespace-pre-wrap break-words text-zinc-200">
      {text.split('\n').map((line, i) => (
        <div key={i}>{colorize(line)}</div>
      ))}
    </pre>
  )
}
function colorize(line) {
  const out = []
  let rest = line
  let key = 0
  // Strings first.
  const strSplit = rest.split(/('[^']*')/g)
  strSplit.forEach((chunk) => {
    if (chunk.startsWith("'")) {
      out.push(
        <span key={key++} className="text-[#f26d78]">
          {chunk}
        </span>,
      )
    } else {
      let last = 0
      let m
      KEYWORDS.lastIndex = 0
      while ((m = KEYWORDS.exec(chunk))) {
        if (m.index > last) out.push(<span key={key++}>{chunk.slice(last, m.index)}</span>)
        out.push(
          <span key={key++} className="text-crimson">
            {m[0]}
          </span>,
        )
        last = m.index + m[0].length
      }
      if (last < chunk.length) out.push(<span key={key++}>{chunk.slice(last)}</span>)
    }
  })
  return out
}

// --- Report Card tab -------------------------------------------------------
// Extra report-card keyframes: a blank "slots in" (drops + overshoots) and a
// one-shot ring flash pulses out from it as the answer lands.
const REPORT_CSS = `
@keyframes dq-slot { 0% { opacity: 0; transform: translateY(-10px) scale(0.7); } 60% { opacity: 1; transform: translateY(0) scale(1.12); } 100% { transform: translateY(0) scale(1); } }
@keyframes dq-ring { 0% { box-shadow: 0 0 0 0 rgba(225,29,72,0.55); } 100% { box-shadow: 0 0 0 14px rgba(225,29,72,0); } }
.dq-slot { animation: dq-slot 0.34s cubic-bezier(0.34,1.56,0.64,1) both, dq-ring 0.6s ease-out both; }
`

// A report blank. Module-scope (stable identity) so the parent's per-frame
// re-renders don't remount it — that remount was restarting the CSS entrance
// animation every frame, pinning the text at opacity 0 (invisible answers).
// Now the `dq-slot` entrance plays exactly once, when `done` flips true.
function Blank({ children, done }) {
  return (
    <span
      className={`mx-0.5 inline-block min-w-[7rem] rounded-md border px-3 py-1 text-center text-sm font-semibold ${
        done
          ? 'dq-slot border-crimson/60 bg-crimson/10 text-crimson'
          : 'border-zinc-700 bg-zinc-900 text-zinc-600'
      }`}
    >
      {done ? children : '—— ▾'}
    </span>
  )
}

function ReportView({ t }) {
  const submitted = t >= T_SUBMIT
  const stamped = t >= T_STAMP
  const allFilled = t >= T_FILL[T_FILL.length - 1]

  return (
    <div className="relative h-full overflow-hidden px-8 py-7">
      <style>{REPORT_CSS}</style>
      {stamped && (
        <div className="pointer-events-none absolute inset-0 z-20 flex animate-stamp-slam items-center justify-center">
          <div className="scale-90">
            <CaseStamp size="board" rotate={-16} />
          </div>
        </div>
      )}
      <div className="relative mx-auto max-w-3xl">
        <h2 className="text-2xl font-semibold text-zinc-100">Report Card</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Fill each blank. The proving query must run before the answer unlocks.
        </p>
        <div className="mt-6 text-[15px] leading-[2.9] text-zinc-300">
          The killer was <Blank done={t >= T_FILL[0]}>Theo Marsh</Blank>, who lied about their
          whereabouts — the keycard logs place them entering the East Wing at 23:12, inside the
          coroner's window from <Blank done={t >= T_FILL[1]}>23:10</Blank> to 23:25. The wound
          proves a <Blank done={t >= T_FILL[2]}>left-handed</Blank> attacker. The weapon was the
          missing <Blank done={t >= T_FILL[3]}>letter opener</Blank>.
        </div>
        {!submitted && (
          <div className="mt-6 flex justify-end">
            <button
              className={`rounded-lg px-8 py-3 text-sm font-semibold uppercase tracking-widest transition-all duration-300 ${
                allFilled ? 'scale-105 bg-crimson text-white shadow-lg shadow-crimson/30' : 'bg-zinc-800 text-zinc-600'
              }`}
            >
              submit report
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}
