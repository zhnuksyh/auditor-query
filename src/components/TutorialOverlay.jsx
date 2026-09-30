import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

/**
 * A lightweight guided-tutorial overlay for the tutorial case (Case 01). It
 * walks the player through the four tabs with a small assist card pinned to the
 * bottom of the screen. Each step can request a tab (via `onGoToTab`), and the
 * whole thing is dismissable; completing or skipping calls `onFinish`, which
 * flips the persisted `tutorialDone` flag so it doesn't reappear.
 */
export default function TutorialOverlay({ steps, onGoToTab, onFinish, play }) {
  const [i, setI] = useState(0)
  const step = steps[i]
  const isLast = i === steps.length - 1

  // Switch to the tab this step targets whenever the step changes.
  useEffect(() => {
    if (step?.tab) onGoToTab(step.tab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i])

  if (!step) return null

  const next = () => {
    play?.('click')
    if (isLast) onFinish()
    else setI((n) => n + 1)
  }
  const back = () => {
    play?.('click')
    setI((n) => Math.max(0, n - 1))
  }
  const skip = () => {
    play?.('click')
    onFinish()
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-6">
      <div className="pointer-events-auto w-full max-w-md animate-fade-up rounded-2xl border border-exception/40 bg-zinc-900/95 p-5 shadow-2xl backdrop-blur">
        {/* Header row */}
        <div className="mb-2 flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-exception">
              Tutorial
            </span>
            <span className="text-[10px] tracking-widest text-zinc-500">
              {i + 1} / {steps.length}
            </span>
          </div>
          <button
            onClick={skip}
            onMouseEnter={() => play?.('hover')}
            className="text-zinc-500 transition-colors hover:text-zinc-200"
            aria-label="Skip tutorial"
            title="Skip tutorial"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <h3 className="font-display text-base font-bold text-zinc-100">{step.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-300">{step.body}</p>

        {/* Controls */}
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={skip}
            onMouseEnter={() => play?.('hover')}
            className="text-[11px] uppercase tracking-widest text-zinc-500 hover:text-zinc-300"
          >
            Skip
          </button>
          <div className="flex items-center gap-2">
            {i > 0 && (
              <button
                onClick={back}
                onMouseEnter={() => play?.('hover')}
                className="rounded-lg border border-zinc-700 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-300 transition-colors hover:border-zinc-500"
              >
                Back
              </button>
            )}
            <button
              onClick={next}
              onMouseEnter={() => play?.('hover')}
              className="rounded-lg bg-exception px-5 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-950 transition-colors hover:bg-exception/80"
            >
              {isLast ? 'Got it' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
