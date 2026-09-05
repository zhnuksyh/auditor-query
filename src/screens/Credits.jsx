import { ChevronLeft } from 'lucide-react'

export default function Credits({ game, play }) {
  return (
    <div className="mx-auto flex h-full w-full max-w-xl flex-col justify-center px-6">
      <header className="mb-8 border-b border-zinc-800 pb-4">
        <button
          onClick={() => {
            play('back')
            game.setScreen('menu')
          }}
          className="flex items-center gap-1 text-[11px] uppercase tracking-[0.3em] text-zinc-500 hover:text-zinc-100"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
          main menu
        </button>
        <h1 className="mt-3 font-display text-4xl font-black text-zinc-100">CREDITS</h1>
      </header>

      <div className="space-y-5 text-sm text-zinc-400">
        <Credit role="Concept & Design" who="Zahin Ukasyah" />
        <Credit role="Main Menu Art" who="Rebecca Hu — Illustrator & Concept Artist" />
        <Credit role="SQL Engine" who="sql.js — SQLite compiled to WebAssembly" />
        <Credit role="Editor" who="CodeMirror 6" />
        <Credit role="Data Grid" who="TanStack Table" />
        <Credit role="Frontend" who="React + Vite + Tailwind CSS" />
        <Credit role="Visual reference" who="GRID DAILY archive aesthetic" />
        <Credit role="Inspired by" who="SQL Noir & SQL Murder Mystery" />
        <Credit role="Engine" who="Detective Query — same engine, different beat" />

        <p className="border-t border-zinc-800 pt-5 text-xs text-zinc-600">
          All engagements, systems, accounts, and audit data are entirely fictional. Any
          resemblance to real organisations, persons, or incidents is coincidental. Nothing
          here is professional audit guidance.
        </p>
      </div>
    </div>
  )
}

function Credit({ role, who }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="shrink-0 text-[11px] uppercase tracking-[0.25em] text-zinc-600">{role}</span>
      <span className="flex-1 border-b border-dotted border-zinc-800" />
      <span className="text-right text-zinc-300">{who}</span>
    </div>
  )
}
