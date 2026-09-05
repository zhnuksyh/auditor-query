import { useCallback, useRef, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { sql, SQLite } from '@codemirror/lang-sql'
import { runQuery } from '../engine/sqlEngine.js'
import { evaluateUnlocks } from '../engine/verification.js'
import ResultsTable from './ResultsTable.jsx'
import { LockedCase } from './ScopeTab.jsx'

const STARTER = '-- Test the control. Try:\nSELECT * FROM accounts;'

// Last run result per case, kept in memory so switching tabs (or leaving and
// reopening the case) doesn't clear the results grid. Deliberately not in the
// localStorage save — result sets can be large, and a fresh session re-runs fine.
const resultCache = new Map()

export default function AnalysisTab({ caseData, db, dbError, game, play, shake, unlocked, onUnlocksChange }) {
  // The editor draft lives in the save so it survives tab switches, returning
  // to the menu, and opening other cases.
  const sqlText = game.save.sqlDrafts?.[caseData.id] ?? STARTER
  const setSqlText = (text) => game.setSqlDraft(caseData.id, text)
  const [result, setResult] = useState(() => resultCache.get(caseData.id) ?? null)
  // Toast for newly obtained evidence: null | 'in' | 'out' (the phase drives the
  // enter/exit animation). Timers are tracked so back-to-back unlocks restart
  // the toast cleanly instead of an old timer dismissing the new one.
  const [flash, setFlash] = useState(null)
  const flashTimers = useRef([])
  const showFlash = useCallback(() => {
    flashTimers.current.forEach(clearTimeout)
    setFlash('in')
    flashTimers.current = [
      setTimeout(() => setFlash('out'), 3000),
      setTimeout(() => setFlash(null), 3300),
    ]
  }, [])

  const notebook = game.save.notebooks[caseData.id] || ''

  // Build a schema map so CodeMirror autocompletes table/column names.
  const schemaHints = {}
  caseData.erd?.tables.forEach((t) => {
    schemaHints[t.name] = t.columns.map((c) => c.name)
  })

  const execute = useCallback(() => {
    if (!db) return
    play('run')
    const res = runQuery(db, sqlText)
    resultCache.set(caseData.id, res)
    setResult(res)

    if (res.error) {
      play('error')
      shake()
      return
    }

    // Intercept: check the returned rows against the case verification matrix.
    let unlockedSomething = false
    if (caseData.report?.blanks) {
      const { unlocked: nextUnlocked, newlyUnlocked } = evaluateUnlocks(
        caseData.report.blanks,
        // allRows spans every statement in the run, not just the displayed one.
        res.allRows ?? res.rows,
        unlocked,
      )
      if (newlyUnlocked.length > 0) {
        unlockedSomething = true
        onUnlocksChange(nextUnlocked)
        showFlash()
      }
    }

    // Obtained evidence gets its own celebratory chime; otherwise the plain
    // "query returned" confirmation. The unlock sound trails the run tick.
    if (unlockedSomething) {
      setTimeout(() => play('unlock'), 120)
    } else {
      play('success')
    }
  }, [db, sqlText, caseData.id, caseData.report, unlocked, onUnlocksChange, play, shake, showFlash])

  // Ctrl/Cmd+Enter to run.
  const onKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      execute()
    }
  }

  if (!caseData.schemaSql) return <LockedCase caseData={caseData} />

  return (
    // Stack the workspace over the notebook on small screens; side-by-side on
    // desktop. `overflow-auto` lets the stacked layout scroll on short viewports.
    <div className="flex h-full flex-col gap-4 overflow-auto p-3 sm:p-5 lg:flex-row">
      {/* Main workspace */}
      <div className="flex min-h-[320px] min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-800" onKeyDown={onKeyDown}>
        {/* SQL input. Fixed header height so its bottom border lines up with the
            notebook header's border across the gap. */}
        <div className="flex h-10 items-center justify-between border-b border-zinc-800 px-4">
          <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">
            SQL input
          </span>
          <div className="flex items-center gap-3">
            <span className="hidden text-[10px] text-zinc-600 sm:block">⌘/Ctrl + Enter</span>
            <button
              onClick={execute}
              disabled={!db}
              className="press rounded-full bg-zinc-100 px-5 py-1.5 text-[11px] font-bold uppercase tracking-widest text-zinc-950 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-500"
            >
              RUN
            </button>
          </div>
        </div>

        <div className="h-[42%] min-h-[140px] overflow-hidden border-b border-zinc-800">
          {dbError ? (
            <div className="p-4 text-xs text-zinc-400">
              Couldn’t load the case database: {dbError}
            </div>
          ) : (
            <CodeMirror
              value={sqlText}
              onChange={setSqlText}
              theme="dark"
              extensions={[sql({ dialect: SQLite, schema: schemaHints, upperCaseKeywords: true })]}
              basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: true }}
              placeholder="Write SQL here…"
            />
          )}
        </div>

        {/* Results */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-1.5">
          <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">
            query results
          </span>
          {result && !result.error && (
            <span className="text-[10px] text-zinc-600">{result.rows.length} row(s)</span>
          )}
        </div>
        <div className="relative min-h-0 flex-1">
          {!db && !dbError && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/70 text-xs text-zinc-300">
              compiling sql.js runtime…
            </div>
          )}
          <ResultsTable result={result} />

          {flash && (
            <div
              className={`pointer-events-none absolute bottom-3 left-1/2 rounded-xl border border-[#f26d78]/40 bg-zinc-900 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-[#f26d78] shadow-lg shadow-black/30 ${
                flash === 'in' ? 'animate-toast-up' : 'animate-toast-down'
              }`}
            >
              EVIDENCE OBTAINED!
            </div>
          )}
        </div>
      </div>

      {/* Auditor's Workpaper — full width when stacked, fixed sidebar on desktop. */}
      <aside className="flex h-48 shrink-0 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 lg:h-auto lg:w-72">
        {/* Header height matches the SQL-input header so their bottom borders
            sit on the same line. */}
        <div className="flex h-10 items-center border-b border-zinc-800 px-4 text-[10px] uppercase tracking-[0.25em] text-zinc-500">
          auditor's workpaper
        </div>
        <textarea
          value={notebook}
          onChange={(e) => game.setNotebook(caseData.id, e.target.value)}
          placeholder="Note what you tested, the exceptions you found, queries still to run… auto-saved."
          className="flex-1 resize-none bg-transparent px-4 py-3 text-xs leading-relaxed text-zinc-300 placeholder:text-zinc-700 focus:outline-none"
          spellCheck={false}
        />
      </aside>
    </div>
  )
}
