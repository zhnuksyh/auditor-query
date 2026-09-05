import { useState } from 'react'
import bgUrl from '../assets/main-menu-bg.jpg'

const MENU = [
  { key: 'new', label: 'NEW GAME' },
  { key: 'continue', label: 'CONTINUE' },
  { key: 'guide', label: 'AUDIT MANUAL' },
  { key: 'options', label: 'OPTIONS' },
  { key: 'credits', label: 'CREDITS' },
]

const REPO_URL = 'https://github.com/zhnuksyh/auditor-query'
const VERSION = 'v0.1.1'

// A faint SQL snippet tiled behind the art for texture.
const SQL_TEXTURE = `SELECT * FROM accounts WHERE disabled_on IS NULL;
SELECT user_id FROM entitlements JOIN roles USING (role_id);
SELECT opened_at, closed_at FROM change_requests;
WHERE granted_on BETWEEN '2026-03-01' AND '2026-03-31'
LEFT JOIN approvals ON approvals.change_id = changes.id
GROUP BY reviewer_id HAVING count(*) > 1
`.repeat(6)

export default function MainMenu({ game, play }) {
  const [confirmNew, setConfirmNew] = useState(false)

  // There's meaningful progress if any case is solved or a case was opened.
  const hasProgress =
    game.save.solvedCases.length > 0 ||
    game.save.lastCaseId != null ||
    Object.keys(game.save.notebooks || {}).length > 0

  const startNewGame = () => {
    game.hardReset()
    game.setScreen('levels')
  }

  const handle = (key) => {
    play('click')
    switch (key) {
      case 'new':
        // Starting fresh wipes progress — confirm first if there's any.
        if (hasProgress) setConfirmNew(true)
        else startNewGame()
        break
      case 'continue':
        game.setScreen('levels')
        break
      case 'options':
        game.setScreen('options')
        break
      case 'credits':
        game.setScreen('credits')
        break
      case 'guide':
        game.setScreen('guide')
        break
      default:
        break
    }
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Background art */}
      <img
        src={bgUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Faint SQL texture blended over the art. */}
      <pre className="pointer-events-none absolute inset-0 select-none overflow-hidden whitespace-pre-wrap break-all p-6 font-mono text-[11px] leading-relaxed text-zinc-100/[0.04] mix-blend-overlay">
        {SQL_TEXTURE}
      </pre>

      {/* Darken + left-weighted gradient so the menu stays legible. */}
      <div className="absolute inset-0 bg-zinc-950/45" />
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/40 to-transparent" />
      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 45%, rgba(9,9,11,0.75) 100%)',
        }}
      />

      {/* Content: left-aligned title + menu, sitting slightly above centre and
          nudged further in from the left edge. */}
      <div className="relative flex h-full w-full flex-col justify-center pb-16 pl-8 pr-8 sm:pb-24 sm:pl-32 sm:pr-10 lg:pl-48">
        <h1 className="mb-8 font-display text-3xl font-black leading-none tracking-tight text-zinc-100 drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)] sm:mb-10 sm:text-5xl lg:text-6xl">
          AUDITOR<span className="text-[#f2b25c]">_</span>QUERY
        </h1>

        <ul className="flex w-full max-w-[240px] flex-col gap-2.5">
          {MENU.map((item, i) => {
            // Continue is only meaningful once there's a save to resume.
            const disabled = item.key === 'continue' && !hasProgress
            return (
              <li key={item.key} className="stagger-item animate-fade-up" style={{ '--stagger-i': i }}>
                <button
                  onClick={() => !disabled && handle(item.key)}
                  onMouseEnter={() => !disabled && play('hover')}
                  disabled={disabled}
                  className="press w-full rounded-xl border border-white/10 bg-zinc-950/50 px-5 py-3 text-left font-display text-sm font-semibold uppercase tracking-[0.2em] text-zinc-300 backdrop-blur-sm transition-colors hover:border-[#f26d78]/70 hover:bg-zinc-950/70 disabled:cursor-not-allowed disabled:border-white/5 disabled:text-zinc-600 disabled:hover:border-white/5 disabled:hover:bg-zinc-950/50"
                >
                  {item.label}
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Version (left) + repo link (right), bottom edge. */}
      <div className="absolute bottom-4 right-6 z-10 flex items-center gap-4 text-zinc-400">
        <span className="text-sm tracking-widest text-zinc-500">{VERSION}</span>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          onMouseEnter={() => play('hover')}
          className="transition-colors hover:text-zinc-100"
          aria-label="View the source on GitHub"
          title="View the source on GitHub"
        >
          <svg viewBox="0 0 16 16" className="h-6 w-6 fill-current" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
        </a>
      </div>

      {/* Confirm overwriting an existing save before starting a new game. */}
      {confirmNew && (
        <div className="absolute inset-0 z-50 flex animate-fade-in items-center justify-center bg-zinc-950/70 backdrop-blur-sm">
          <div className="mx-6 w-full max-w-sm animate-pop-in rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
            <h2 className="font-display text-lg font-bold uppercase tracking-wide text-zinc-100">
              Start a new game?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              This will erase your current progress — solved cases, unlocked files, and
              notebook notes. This can’t be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  play('back')
                  setConfirmNew(false)
                }}
                className="press rounded-lg border border-zinc-700 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  play('click')
                  setConfirmNew(false)
                  startNewGame()
                }}
                className="press rounded-lg bg-crimson px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white transition-colors hover:bg-crimson/80"
              >
                Erase &amp; start
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
