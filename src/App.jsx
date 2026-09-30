import { lazy, Suspense, useCallback, useRef, useState } from 'react'
import { useGame } from './state/useGame.js'
import { useSound } from './state/useSound.js'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import MainMenu from './screens/MainMenu.jsx'
import LevelSelect from './screens/LevelSelect.jsx'
import Options from './screens/Options.jsx'
import Credits from './screens/Credits.jsx'
import Guide from './screens/Guide.jsx'

// The dashboard drags in sql.js, CodeMirror, and TanStack Table. Loading it
// lazily keeps all of that OUT of the initial bundle, so the menu and level
// select paint instantly. The heavy chunk is only fetched when a case opens.
const GameDashboard = lazy(() => lazyWithReload(() => import('./screens/GameDashboard.jsx')))

// After a redeploy, GitHub Pages serves fresh chunk filenames (content-hashed),
// but a browser holding a stale index.html still points at the OLD hashes. The
// dynamic import then 404s with "Failed to fetch dynamically imported module".
// A hard reload pulls the current HTML and fixes it, so on such a failure we
// reload once. A sessionStorage guard prevents an infinite reload loop: if the
// fresh build is genuinely broken, we let the error propagate to the boundary.
function lazyWithReload(importer) {
  const RELOAD_FLAG = 'dq-chunk-reloaded'
  return importer().then(
    (mod) => {
      // Success: clear the guard so a future stale chunk can reload again.
      sessionStorage.removeItem(RELOAD_FLAG)
      return mod
    },
    (err) => {
      const isChunkError = /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(
        err?.message || '',
      )
      if (isChunkError && !sessionStorage.getItem(RELOAD_FLAG)) {
        sessionStorage.setItem(RELOAD_FLAG, '1')
        window.location.reload()
        // Return a never-resolving promise so nothing renders before the reload.
        return new Promise(() => {})
      }
      throw err
    },
  )
}

export default function App() {
  const game = useGame()
  const play = useSound(game)

  // A one-shot screen shake for error feedback (wrong report, failed query).
  // Toggling the class off then on again re-triggers the CSS animation.
  const [shaking, setShaking] = useState(false)
  const shakeTimer = useRef(null)
  const shake = useCallback(() => {
    clearTimeout(shakeTimer.current)
    setShaking(false)
    // Next frame so the class removal is committed before we re-add it.
    requestAnimationFrame(() => {
      setShaking(true)
      shakeTimer.current = setTimeout(() => setShaking(false), 500)
    })
  }, [])

  return (
    <div
      className={`h-full w-full bg-zinc-950 text-zinc-200 ${shaking ? 'animate-shake' : ''}`}
      style={{ fontSize: `${game.save.settings.textScale}rem` }}
    >
      <ErrorBoundary>
        {/* Keyed wrapper: remounting on screen change replays the fade-up,
            giving every screen a smooth entrance transition. */}
        <div key={game.screen} className="h-full w-full animate-fade-up">
          {game.screen === 'menu' && <MainMenu game={game} play={play} />}
          {game.screen === 'levels' && <LevelSelect game={game} play={play} />}
          {game.screen === 'options' && <Options game={game} play={play} />}
          {game.screen === 'credits' && <Credits game={game} play={play} />}
          {game.screen === 'guide' && <Guide game={game} play={play} />}
          {game.screen === 'game' && (
            <Suspense fallback={<DashboardLoading />}>
              <GameDashboard game={game} play={play} shake={shake} />
            </Suspense>
          )}
        </div>
      </ErrorBoundary>
    </div>
  )
}

function DashboardLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="text-center">
        <div className="mb-3 text-[11px] uppercase tracking-[0.3em] text-zinc-300">
          loading case workspace
        </div>
        <pre className="font-mono text-[11px] leading-relaxed text-zinc-500">
{`> fetching editor + data grid ...
> preparing sql.js runtime ...`}
        </pre>
      </div>
    </div>
  )
}
