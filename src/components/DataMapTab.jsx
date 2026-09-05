import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { LockedCase } from './ScopeTab.jsx'

export default function DataMapTab({ caseData }) {
  if (!caseData.erd) return <LockedCase caseData={caseData} />

  return <Board tables={caseData.erd.tables} />
}

function Board({ tables }) {
  const edges = useMemo(() => {
    const out = []
    tables.forEach((t) =>
      t.columns.forEach((col) => {
        if (col.fk) {
          const [toTable, toCol] = col.fk.split('.')
          out.push({ from: cellKey(t.name, col.name), to: cellKey(toTable, toCol) })
        }
      }),
    )
    return out
  }, [tables])

  const containerRef = useRef(null)
  const cellRefs = useRef({})
  const [paths, setPaths] = useState([])

  const registerCell = useRef((key, el) => {
    if (el) cellRefs.current[key] = el
    else delete cellRefs.current[key]
  }).current

  useLayoutEffect(() => {
    let frame = 0
    const measure = () => {
      const container = containerRef.current
      if (!container) return
      const base = container.getBoundingClientRect()
      const next = []
      for (const edge of edges) {
        const a = cellRefs.current[edge.from]
        const b = cellRefs.current[edge.to]
        if (!a || !b) continue
        const ra = a.getBoundingClientRect()
        const rb = b.getBoundingClientRect()
        // Anchor each end on whichever horizontal side faces the other cell, so
        // the connector loops around the outside of the cards, never through them.
        const aCx = ra.left + ra.width / 2
        const bCx = rb.left + rb.width / 2
        const aRight = bCx >= aCx
        const bRight = aCx > bCx
        const p1 = {
          x: (aRight ? ra.right : ra.left) - base.left,
          y: ra.top - base.top + ra.height / 2,
          side: aRight ? 1 : -1,
        }
        const p2 = {
          x: (bRight ? rb.right : rb.left) - base.left,
          y: rb.top - base.top + rb.height / 2,
          side: bRight ? 1 : -1,
        }
        next.push(sideAwarePath(p1, p2))
      }
      setPaths((prev) =>
        prev.length === next.length && prev.every((p, i) => p === next[i]) ? prev : next,
      )
    }
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }
    schedule()
    const ro = new ResizeObserver(schedule)
    if (containerRef.current) ro.observe(containerRef.current)
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
      window.removeEventListener('resize', schedule)
    }
  }, [edges])

  return (
    <div className="h-full overflow-auto px-8 py-7">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-1 text-2xl font-semibold text-zinc-100">Case Board</h2>
        <p className="mb-8 text-xs text-zinc-500">
          The tables you can query. Dotted lines trace foreign keys to the column they reference.
        </p>

        <div ref={containerRef} className="relative">
          <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible">
            {paths.map((d, i) => (
              <path
                key={i}
                d={d}
                className="animate-dash-flow"
                fill="none"
                stroke="#a1a1aa"
                strokeWidth="1.5"
                strokeDasharray="2 4"
                strokeLinecap="round"
                opacity="0.4"
              />
            ))}
          </svg>

          {/* Cards flow into rows; unrelated tables share a row, relationships stay near. */}
          <div className="relative z-10 flex flex-wrap gap-x-8 gap-y-8">
            {tables.map((t) => (
              <TableCard key={t.name} table={t} registerCell={registerCell} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function TableCard({ table, registerCell }) {
  return (
    <div className="w-56 shrink-0 overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900">
      <div className="border-b border-zinc-800 px-4 py-3">
        <span className="text-sm font-semibold tracking-wide text-zinc-100">{table.name}</span>
      </div>
      <ul className="divide-y divide-zinc-800/60">
        {table.columns.map((col) => (
          <li
            key={col.name}
            ref={(el) => registerCell(cellKey(table.name, col.name), el)}
            className="flex items-center justify-between px-4 py-2 text-xs"
          >
            <span className={col.pk ? 'font-semibold text-zinc-100' : 'text-zinc-300'}>
              {col.name}
              {col.pk && <span className="ml-1.5 text-[9px] uppercase text-zinc-500">pk</span>}
              {col.fk && <span className="ml-1.5 text-[9px] uppercase text-zinc-400">fk</span>}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-zinc-600">{col.type}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function cellKey(table, col) {
  return `${table}::${col}`
}

/**
 * Cubic Bézier between two anchor points that each stick out horizontally from
 * their card's near side, so the curve loops around the outside of the cards.
 */
function sideAwarePath(p1, p2) {
  // Clean "Z" elbow that never tangles: run horizontally out from each cell to a
  // single shared mid-X, then one vertical segment bridges the two rows there.
  // Rounded corners at the two bends. If the anchors already share a row, it's a
  // straight horizontal line.
  const midX = (p1.x + p2.x) / 2
  if (Math.abs(p2.y - p1.y) < 1) {
    return `M ${p1.x} ${p1.y} H ${p2.x}`
  }
  const dir = p2.y > p1.y ? 1 : -1 // vertical travel direction
  const sx1 = Math.sign(midX - p1.x) || 1 // horizontal direction leg 1
  const sx2 = Math.sign(p2.x - midX) || 1 // horizontal direction leg 2
  const r = Math.min(
    10,
    Math.abs(midX - p1.x),
    Math.abs(p2.x - midX),
    Math.abs(p2.y - p1.y) / 2,
  )

  return [
    `M ${p1.x} ${p1.y}`,
    `H ${midX - sx1 * r}`,
    `Q ${midX} ${p1.y} ${midX} ${p1.y + dir * r}`, // round down/up onto the vertical
    `V ${p2.y - dir * r}`,
    `Q ${midX} ${p2.y} ${midX + sx2 * r} ${p2.y}`, // round onto the second leg
    `H ${p2.x}`,
  ].join(' ')
}
