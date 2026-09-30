import { useEffect, useMemo, useState } from 'react'
import { BookOpen, ChevronLeft, Lightbulb, X } from 'lucide-react'
import { getCase } from '../cases/index.js'
import { createDatabase } from '../engine/sqlEngine.js'
import TabBar from '../components/TabBar.jsx'
import ScopeTab from '../components/ScopeTab.jsx'
import DataMapTab from '../components/DataMapTab.jsx'
import AnalysisTab from '../components/AnalysisTab.jsx'
import FindingTab from '../components/FindingTab.jsx'
import TutorialOverlay from '../components/TutorialOverlay.jsx'
import Guide from './Guide.jsx'
import WhereToBegin from './WhereToBegin.jsx'

const TABS = [
  { key: 'scene', label: 'SCOPE' },
  { key: 'board', label: 'DATA MAP' },
  { key: 'analysis', label: 'ANALYSIS' },
  { key: 'report', label: 'FINDING' },
]

export default function GameDashboard({ game, play, shake }) {
  const caseData = getCase(game.openCaseId)
  const [tab, setTab] = useState('scene')
  // Which reference overlay covers the case: 'manual' (the Audit Manual),
  // 'begin' (Where to Begin), or null for none.
  const [panel, setPanel] = useState(null)
  const togglePanel = (name) => {
    play(panel === name ? 'back' : 'click')
    setPanel(panel === name ? null : name)
  }

  const selectTab = (key) => {
    if (key !== tab) play('paper') // page-flip rustle on tab change
    setTab(key)
  }
  const [db, setDb] = useState(null)
  const [dbError, setDbError] = useState(null)

  // Tab key toggles the Audit Manual overlay from anywhere in the case.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Tab') return
      e.preventDefault()
      play(panel === 'manual' ? 'back' : 'click')
      setPanel(panel === 'manual' ? null : 'manual')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panel, play])

  // Unlocked report blanks for THIS case, hydrated from the save.
  const unlocked = useMemo(
    () => new Set(game.save.unlocks[caseData?.id] || []),
    [game.save.unlocks, caseData?.id],
  )

  // Build the case database when the case opens.
  useEffect(() => {
    let cancelled = false
    setDb(null)
    setDbError(null)
    if (!caseData?.schemaSql) return
    createDatabase(caseData.schemaSql)
      .then((database) => {
        if (!cancelled) setDb(database)
      })
      .catch((err) => {
        if (!cancelled) setDbError(err.message || String(err))
      })
    return () => {
      cancelled = true
    }
  }, [caseData?.id, caseData?.schemaSql])

  if (!caseData) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-500">
        Case not found.{' '}
        <button className="ml-2 text-zinc-300 underline" onClick={() => game.setScreen('levels')}>
          back to files
        </button>
      </div>
    )
  }

  const persistUnlocks = (nextSet) => {
    game.setUnlocks(caseData.id, Array.from(nextSet))
  }

  // Show the guided tutorial only on the tutorial case, until it's dismissed.
  const showTutorial = Boolean(caseData.tutorial) && !game.save.tutorialDone

  return (
    <div className="relative flex h-full w-full flex-col">
      {/* Case header: its inner container matches the content-card container
          below (same px-6 outer padding + max-w-4xl), so their left/right edges
          line up exactly. */}
      <header className="px-4 pb-4 pt-5 sm:px-6 sm:pt-8">
        <div className="mx-auto flex min-h-[1.25rem] w-full max-w-4xl items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                play('back')
                game.setScreen('levels')
              }}
              className="flex items-center gap-1 text-[11px] uppercase tracking-[0.3em] text-zinc-500 hover:text-zinc-100"
            >
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
              files
            </button>
            <div className="h-4 w-px bg-zinc-800" />
            <span className="text-sm font-medium tracking-wide text-zinc-200">{caseData.title}</span>
          </div>
          <div className="flex items-center gap-4">
            {game.save.solvedCases.includes(caseData.id) && (
              <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-600">
                CASE CLOSED
              </span>
            )}
            {/* Overlay toggles. z-50 keeps them clickable above the overlay
                (z-40), so an open panel's X sits exactly where its icon was
                and the other icon switches straight to its own panel. */}
            <div className="relative z-50 flex items-center gap-2">
              <PanelButton
                open={panel === 'begin'}
                onClick={() => togglePanel('begin')}
                icon={Lightbulb}
                name="Where to Begin"
                title="Where to Begin"
              />
              <PanelButton
                open={panel === 'manual'}
                onClick={() => togglePanel('manual')}
                icon={BookOpen}
                name="the Audit Manual"
                title="Audit Manual (Tab)"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Folder-card: tabs stick out of the top of a white-outlined content box.
          Centred with a max width and consistent page padding on all sides. */}
      <div className="flex min-h-0 flex-1 flex-col items-center px-3 pb-3 pt-3 sm:px-6 sm:pb-6 sm:pt-6">
        <div className="flex min-h-0 w-full max-w-4xl flex-1 flex-col">
          {/* Tab bar scrolls horizontally on narrow screens so all four fit. */}
          <div className="shrink-0 overflow-x-auto">
            <TabBar tabs={TABS} active={tab} onSelect={selectTab} />
          </div>

          {/* -1px top margin lets the active tab's open bottom merge into the card.
              Keyed on `tab` so switching replays a soft fade-up on the panel. */}
          <main className="-mt-px min-h-0 flex-1 overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-950">
            <div key={tab} className="h-full animate-fade-up">
              {tab === 'scene' && (
                <ScopeTab caseData={caseData} game={game} play={play} />
              )}
              {tab === 'board' && <DataMapTab caseData={caseData} />}
              {tab === 'analysis' && (
                <AnalysisTab
                  caseData={caseData}
                  db={db}
                  dbError={dbError}
                  game={game}
                  play={play}
                  shake={shake}
                  unlocked={unlocked}
                  onUnlocksChange={persistUnlocks}
                />
              )}
              {tab === 'report' && (
                <FindingTab
                  caseData={caseData}
                  game={game}
                  play={play}
                  shake={shake}
                  goToAnalysis={() => selectTab('analysis')}
                />
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Reference overlays, reachable without leaving the case. Keyed so
          switching between them replays the pop-in. */}
      {panel && (
        <div key={panel} className="absolute inset-0 z-40 animate-pop-in bg-zinc-950">
          {panel === 'manual' ? <Guide game={game} play={play} overlay /> : <WhereToBegin />}
        </div>
      )}

      {showTutorial && (
        <TutorialOverlay
          steps={caseData.tutorial}
          onGoToTab={selectTab}
          onFinish={() => game.setTutorialDone(true)}
          play={play}
        />
      )}
    </div>
  )
}

function PanelButton({ open, onClick, icon: Icon, name, title }) {
  return (
    <button
      onClick={onClick}
      className={`press rounded-lg border p-1.5 transition-colors hover:border-zinc-600 hover:text-zinc-100 ${
        open ? 'border-zinc-600 text-zinc-100' : 'border-zinc-800 text-zinc-500'
      }`}
      aria-label={open ? `Close ${name}` : `Open ${name}`}
      aria-pressed={open}
      title={title}
    >
      {open ? <X className="h-4 w-4" strokeWidth={2} /> : <Icon className="h-4 w-4" strokeWidth={2} />}
    </button>
  )
}
