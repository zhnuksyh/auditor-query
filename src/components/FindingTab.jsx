import { Fragment, useState } from 'react'
import { Check, Lock } from 'lucide-react'
import { gradeReport } from '../engine/verification.js'
import { LockedCase } from './ScopeTab.jsx'
import Dropdown from './Dropdown.jsx'
import CaseStamp from './CaseStamp.jsx'

export default function FindingTab({ caseData, unlocked, game, play, shake }) {
  const report = caseData.report
  // Selections live in the save so they survive tab switches, returning to
  // the menu, and opening other cases.
  const answers = game.save.reportAnswers?.[caseData.id] || {}
  const [graded, setGraded] = useState(null)
  // True only for the solve that just happened in this session; it drives the
  // slam animation + sound; a previously solved case shows the stamp at rest.
  const [justSolved, setJustSolved] = useState(false)

  if (!report) return <LockedCase caseData={caseData} />

  const alreadySolved = game.save.solvedCases.includes(caseData.id)
  const allAnswered = Object.keys(report.blanks).every(
    (k) => answers[k] != null && answers[k] !== '',
  )

  const submit = () => {
    const res = gradeReport(report.blanks, answers)
    setGraded(res)
    if (res.correct) {
      game.markSolved(caseData.id)
      setJustSolved(true)
      // The slam lands ~50% into the 0.65s animation; the thud and a screen
      // shake hit on the impact frame, then the fanfare follows once the ink
      // has settled.
      setTimeout(() => {
        play('stamp')
        shake()
      }, 310)
      setTimeout(() => play('solved'), 780)
    } else {
      play('error')
      shake()
    }
  }

  // Split the template on {{tokens}} and interleave dropdowns.
  const parts = report.template.split(/(\{\{\w+\}\})/g)

  const stamped = alreadySolved || graded?.correct

  // Blank keys in template order, so the evidence list reads like the Finding.
  const keys = [
    ...new Set(parts.map((part) => part.match(/\{\{(\w+)\}\}/)?.[1]).filter(Boolean)),
  ]

  return (
    <div className="relative h-full overflow-y-auto px-8 py-7">
      {/* Once the case is closed, the stamp fills the board diagonally. The
          slam animation lives on this wrapper (scale) while the stamp itself
          owns the rotation, so the transforms compose. */}
      {stamped && (
        <div
          className={`pointer-events-none absolute inset-0 z-20 flex items-center justify-center ${
            justSolved ? 'animate-stamp-slam' : ''
          }`}
        >
          <CaseStamp size="board" rotate={-16} />
        </div>
      )}

      <div className="relative mx-auto max-w-3xl">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-zinc-100">Finding</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Fill each blank. The proving query must run in Analysis before the correct answer
            becomes available.
          </p>
        </div>

        {/* The narrative with inline blanks: no surrounding box, roomy line spacing. */}
        <div className="text-base leading-[2.6] text-zinc-300">
          {parts.map((part, i) => {
            const m = part.match(/\{\{(\w+)\}\}/)
            if (!m) return <Fragment key={i}>{part}</Fragment>
            const key = m[1]
            const cfg = report.blanks[key]
            const isUnlocked = unlocked.has(key)
            const isRight = graded?.results[key]
            const isWrong = graded && !graded.results[key]

            // Dynamic option set: while the proving query hasn't run, the correct
            // answer is withheld, so the blank cannot be completed by guessing.
            const options = isUnlocked
              ? cfg.options
              : cfg.options.filter((o) => o !== cfg.targetValue)

            return (
              <Dropdown
                key={i}
                value={answers[key] || ''}
                options={options}
                play={play}
                tone={isRight ? 'right' : isWrong ? 'wrong' : 'idle'}
                onChange={(v) => {
                  game.setReportAnswer(caseData.id, key, v)
                  setGraded(null)
                }}
              />
            )
          })}
        </div>

        {/* Result banner: only for a wrong deduction; a correct one gets the
            full-board stamp instead. */}
        {graded && !graded.correct && (
          <div className="mt-6 animate-pop-in rounded-xl border border-crimson bg-crimson-dim/10 p-4 text-sm text-crimson">
            The evidence contradicts this deduction. Re-check your answers.
          </div>
        )}

        {/* Submit: gone for good once the case is closed. */}
        {!stamped && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={submit}
              disabled={!allAnswered}
              className="press rounded-lg bg-crimson px-8 py-3 text-sm font-semibold uppercase tracking-widest text-zinc-950 transition-colors hover:bg-crimson/80 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
            >
              submit report
            </button>
          </div>
        )}

        {/* What each blank needs. A blank unlocks only when a result column
            carries its exact name, which no query can guess, so the name is
            always shown. The method stays behind a click for players who
            want to work it out themselves. */}
        {!stamped && (
          <div className="mt-10 border-t border-zinc-800 pt-5">
            <h3 className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">
              Evidence needed
            </h3>
            <p className="mb-3 mt-1 text-xs text-zinc-500">
              Each blank unlocks when a query you run in Analysis returns its answer under the
              column name shown.
            </p>
            <ul className="space-y-2">
              {keys.map((key) => (
                <EvidenceRow
                  key={key}
                  cfg={report.blanks[key]}
                  done={unlocked.has(key)}
                  play={play}
                />
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function EvidenceRow({ cfg, done, play }) {
  const [showHint, setShowHint] = useState(false)

  return (
    <li className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {done ? (
          <Check className="h-4 w-4 shrink-0 text-zinc-300" strokeWidth={2.5} aria-label="unlocked" />
        ) : (
          <Lock className="h-3.5 w-3.5 shrink-0 text-zinc-600" strokeWidth={2} aria-label="locked" />
        )}
        <span className={`text-sm ${done ? 'text-zinc-500' : 'text-zinc-200'}`}>{cfg.label}</span>
        <code className="font-mono text-xs text-exception">AS {cfg.unlockedByColumn}</code>
        {!done && (
          <button
            type="button"
            onClick={() => {
              play?.('click')
              setShowHint((s) => !s)
            }}
            onMouseEnter={() => play?.('hover')}
            aria-expanded={showHint}
            className="ml-auto text-[11px] uppercase tracking-[0.2em] text-zinc-500 transition-colors hover:text-zinc-100"
          >
            {showHint ? 'hide hint' : 'hint'}
          </button>
        )}
      </div>
      {showHint && !done && (
        <p className="mt-2 text-xs leading-relaxed text-zinc-400">{cfg.hint}</p>
      )}
    </li>
  )
}
