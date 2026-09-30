import { useMemo, useState } from 'react'
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { friendlySqlError } from '../engine/sqlErrors.js'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'

/**
 * Renders a query result set with TanStack Table. Sortable columns, sticky
 * header. NULLs render as a dim placeholder.
 */
export default function ResultsTable({ result }) {
  const [sorting, setSorting] = useState([])

  const columns = useMemo(
    () =>
      (result?.columns || []).map((col) => ({
        accessorKey: col,
        header: col,
        cell: (info) => {
          const v = info.getValue()
          if (v === null || v === undefined)
            return <span className="italic text-zinc-600">NULL</span>
          return String(v)
        },
      })),
    [result?.columns],
  )

  const table = useReactTable({
    data: result?.rows || [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (!result) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-zinc-600">
        Run a query to see results.
      </div>
    )
  }

  if (result.error) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2.5 rounded-xl border border-zinc-700 bg-zinc-900/60 px-3.5 py-3 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-400/80" strokeWidth={2} />
          <span className="shrink-0 whitespace-nowrap font-semibold uppercase tracking-wider text-zinc-300">
            query didn’t run
          </span>
          <span className="shrink-0 text-zinc-600">|</span>
          <span className="text-zinc-400">{friendlySqlError(result.error)}</span>
        </div>
      </div>
    )
  }

  if (result.empty || result.rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-zinc-600">
        Query executed. 0 rows returned.
      </div>
    )
  }

  return (
    <div className="h-full animate-fade-in overflow-auto">
      <table className="w-full border-collapse text-xs">
        <thead className="sticky top-0 z-10 bg-zinc-800">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => {
                const sorted = header.column.getIsSorted()
                return (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="cursor-pointer select-none whitespace-nowrap border-b border-zinc-700 px-3 py-2 text-left font-bold uppercase tracking-wider text-zinc-300 hover:text-zinc-100/80"
                  >
                    <span className="inline-flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {sorted === 'asc' && <ChevronUp className="h-3 w-3 text-zinc-500" strokeWidth={2.5} />}
                      {sorted === 'desc' && <ChevronDown className="h-3 w-3 text-zinc-500" strokeWidth={2.5} />}
                    </span>
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row, i) => (
            <tr
              key={row.id}
              className={i % 2 ? 'bg-zinc-900/40' : 'bg-transparent'}
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="whitespace-nowrap border-b border-zinc-800/60 px-3 py-1.5 text-zinc-300"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
