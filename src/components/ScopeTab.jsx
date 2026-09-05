import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Highlighter, Lock } from 'lucide-react'
import {
  addRange,
  reconcile,
  removeAt,
  segmentParagraph,
  splitParagraphs,
} from '../engine/highlights.js'

export default function ScopeTab({ caseData, game, play }) {
  const scene = caseData.engagement
  if (!scene) {
    return <LockedCase caseData={caseData} />
  }
  return <SceneReport caseData={caseData} scene={scene} game={game} play={play} />
}

function SceneReport({ caseData, scene, game, play }) {
  const report = scene.report
  const bodyRef = useRef(null)
  // The marker is off by default: the report is prose to be read first, and a
  // permanently armed highlighter would swallow ordinary text selection.
  const [marking, setMarking] = useState(false)

  const paragraphs = useMemo(() => splitParagraphs(report), [report])

  // Saved highlights are checked against the current report text on every read,
  // so a reworded case silently sheds its stale marks instead of painting the
  // wrong words. See engine/highlights.js.
  const highlights = useMemo(
    () => reconcile(game.save.highlights?.[caseData.id] || [], report),
    [game.save.highlights, caseData.id, report],
  )

  const commit = useCallback(
    (next) => game.setHighlights(caseData.id, next),
    [game, caseData.id],
  )

  // Turn a browser selection into an absolute range in `report`. Each paragraph
  // is rendered as its own element carrying `data-base`, so an offset within a
  // paragraph plus that base is the absolute index — no tree walking needed.
  const offsetOf = useCallback((node, offset) => {
    const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node
    const seg = el?.closest?.('[data-seg-start]')
    if (seg) return Number(seg.dataset.segStart) + offset
    const para = el?.closest?.('[data-base]')
    if (para) return Number(para.dataset.base) + offset
    return null
  }, [])

  const onMouseUp = useCallback(() => {
    if (!marking) return
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return

    const range = sel.getRangeAt(0)
    if (!bodyRef.current?.contains(range.commonAncestorContainer)) return

    const a = offsetOf(range.startContainer, range.startOffset)
    const b = offsetOf(range.endContainer, range.endOffset)
    sel.removeAllRanges()
    if (a == null || b == null) return

    const start = Math.min(a, b)
    const end = Math.max(a, b)
    if (start >= end) return

    play?.('paper')
    commit(addRange(highlights, start, end, report))
  }, [marking, offsetOf, highlights, report, commit, play])

  // Clicking an existing mark clears it — the whole mark, not a slice of it.
  const onClickSegment = useCallback(
    (segStart) => {
      if (!marking) return
      play?.('back')
      commit(removeAt(highlights, segStart))
    },
    [marking, highlights, commit, play],
  )

  // Suppress the native long-press callout while the marker is armed, so a
  // touch drag paints instead of opening the OS copy/share menu.
  useEffect(() => {
    const el = bodyRef.current
    if (!el || !marking) return
    const block = (e) => e.preventDefault()
    el.addEventListener('contextmenu', block)
    return () => el.removeEventListener('contextmenu', block)
  }, [marking])

  return (
    <div className="h-full overflow-y-auto px-8 py-7">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-zinc-100">Scope</h2>
            <p className="mt-1 text-xs text-zinc-500">{caseData.title}</p>
          </div>
          <MarkerToggle
            on={marking}
            count={highlights.length}
            onToggle={() => {
              play?.('toggle')
              setMarking((v) => !v)
            }}
            onClear={() => {
              play?.('back')
              commit([])
            }}
          />
        </div>

        {/* Engagement vitals. The case supplies its own terms, so a case can
            head its scope with whatever a reader of that engagement needs —
            control and system for an access review, period and ledger for a
            financial one — instead of three labels fixed in the markup. */}
        <dl
          className="mb-8 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-zinc-800 bg-zinc-800"
          style={{
            gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, 14rem), 1fr))`,
          }}
        >
          {scene.vitals.map((vital) => (
            <Vital key={vital.term} term={vital.term} value={vital} />
          ))}
        </dl>

        {/* Memo body — the control detail is woven into this narrative.
            Paragraphs are separate nodes so selection offsets map cleanly onto
            the underlying report string. */}
        <div
          ref={bodyRef}
          onMouseUp={onMouseUp}
          onTouchEnd={onMouseUp}
          className={`text-base leading-[2.6] text-zinc-300 ${
            marking ? 'cursor-text selection:bg-amber-300/30' : ''
          }`}
        >
          {paragraphs.map((para) => (
            <p
              key={para.base}
              data-base={para.base}
              className="mb-[2.6em] whitespace-pre-line last:mb-0"
            >
              {segmentParagraph(para, highlights).map((seg) =>
                seg.marked ? (
                  <mark
                    key={seg.start}
                    data-seg-start={seg.start}
                    onClick={() => onClickSegment(seg.start)}
                    title={marking ? 'Click to remove this highlight' : undefined}
                    className={`rounded-[3px] bg-amber-300/25 px-0.5 py-[0.15em] text-amber-100 decoration-clone ${
                      marking ? 'cursor-pointer hover:bg-amber-300/40' : ''
                    }`}
                  >
                    {seg.text}
                  </mark>
                ) : (
                  <span key={seg.start} data-seg-start={seg.start}>
                    {seg.text}
                  </span>
                ),
              )}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}

function MarkerToggle({ on, count, onToggle, onClear }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      {count > 0 && (
        <button
          onClick={onClear}
          className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 transition-colors hover:text-zinc-300"
        >
          clear
        </button>
      )}
      <button
        onClick={onToggle}
        aria-pressed={on}
        title={on ? 'Put the highlighter away' : 'Highlight evidence in the memo'}
        className={`press flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] uppercase tracking-[0.2em] transition-colors ${
          on
            ? 'border-amber-300/40 bg-amber-300/10 text-amber-200'
            : 'border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-100'
        }`}
      >
        <Highlighter className="h-3.5 w-3.5" strokeWidth={2} />
        highlight
      </button>
    </div>
  )
}

function Vital({ term, value }) {
  // value is { line1, line2 }: two stacked lines within the single row cell.
  return (
    <div className="bg-zinc-950 p-4">
      <dt className="mb-1.5 text-[10px] uppercase tracking-[0.25em] text-zinc-600">{term}</dt>
      <dd className="text-sm text-zinc-200">{value.line1}</dd>
      <dd className="text-xs text-zinc-400">{value.line2}</dd>
    </div>
  )
}

export function LockedCase({ caseData }) {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="max-w-md text-center">
        <Lock className="mx-auto mb-4 h-9 w-9 text-zinc-700" strokeWidth={1.5} />
        <h2 className="text-2xl font-semibold text-zinc-400">{caseData.title}</h2>
        <p className="mt-2 text-sm text-zinc-600">{caseData.teaser}</p>
        <p className="mt-6 text-[11px] uppercase tracking-[0.3em] text-zinc-600">
          engagement not yet assigned — close the prior file to unlock
        </p>
      </div>
    </div>
  )
}
