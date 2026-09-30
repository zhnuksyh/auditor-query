import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Download,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react'
import CaseStamp from '../components/CaseStamp.jsx'
import TabTour from './TabTour.jsx'
import { bootAudio, sfx, startMusic, stopMusic, setTrailerMuted } from './audio.js'

/**
 * Kinetic-typography trailer, served at /trailer/. A rAF clock walks a scene
 * timeline; each scene is a keyed component whose internal beats are plain CSS
 * animations with delays relative to the scene mount. Pausing freezes both the
 * clock and (via animation-play-state) every in-flight CSS animation, so
 * resume picks up mid-word without drifting.
 *
 * Audio reuses the GAME's own engines (procedural SFX + the looping theme) so
 * the trailer sounds identical to the product. Cues fire off the same clock.
 *
 * Export records the page start-to-finish via getDisplayMedia + MediaRecorder
 * and downloads an HD .webm — no dependencies, no server, offline-capable.
 */

const TRAILER_CSS = `
@keyframes dq-slam { 0% { opacity: 0; transform: scale(2.1); filter: blur(10px); } 100% { opacity: 1; transform: scale(1); filter: blur(0); } }
@keyframes dq-rise { 0% { opacity: 0; transform: translateY(22px); } 100% { opacity: 1; transform: translateY(0); } }
@keyframes dq-drop { 0% { opacity: 0; transform: scale(0.5); } 62% { opacity: 1; transform: scale(1.07); } 100% { opacity: 1; transform: scale(1); } }
@keyframes dq-cut { from { opacity: 0; } to { opacity: 1; } }
@keyframes dq-out { to { opacity: 0; transform: scale(0.94); filter: blur(6px); } }
@keyframes dq-type { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 -2% 0 0); } }
@keyframes dq-blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
@keyframes dq-flash { 0% { opacity: 0.14; } 100% { opacity: 0; } }
.dq-paused *, .dq-paused *::before, .dq-paused *::after { animation-play-state: paused !important; }
.dq-blink { animation: dq-blink 0.9s steps(1) infinite; }
/* Blinks a couple of times then settles SOLID — used on the title underscore so
   it stops blinking once the CASE CLOSED stamp lands (~1.8s in). */
@keyframes dq-blink-settle { 0%,49% { opacity: 1; } 50%,99% { opacity: 0; } 100% { opacity: 1; } }
.dq-blink-stop { animation: dq-blink-settle 0.9s steps(1) 2 forwards; }
.dq-caret { display: inline-block; width: 0.55em; height: 1.05em; margin-left: 0.2em; vertical-align: text-bottom; background: #f2b25c; animation: dq-blink 0.9s steps(1) infinite; }
.dq-scanlines { background: repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 3px); }
`

const SQL_TEXTURE = `SELECT * FROM suspects WHERE alibi IS NULL;
SELECT name FROM keycard_logs JOIN alibis USING (suspect_id);
SELECT tod_from, tod_to FROM coroner_reports;
WHERE swipe_time BETWEEN '23:10' AND '23:25'
JOIN forensics ON forensics.case_id = cases.id
GROUP BY suspect_id HAVING count(*) > 1
`.repeat(8)

// Where to send viewers at the end — the source repo, shown beside the icon.
const REPO_URL = 'https://github.com/zhnuksyh/detective-query'

function GithubIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Kinetic building blocks
// ---------------------------------------------------------------------------

const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)'
const EASE_POP = 'cubic-bezier(0.34, 1.56, 0.64, 1)'

const KINDS = {
  slam: { name: 'dq-slam', dur: 0.26, ease: EASE_OUT },
  rise: { name: 'dq-rise', dur: 0.3, ease: EASE_OUT },
  drop: { name: 'dq-drop', dur: 0.3, ease: EASE_POP },
  cut: { name: 'dq-cut', dur: 0.01, ease: 'linear' },
}

function K({ at = 0, until, kind = 'slam', className = '', style, children }) {
  const k = KINDS[kind]
  const anims = [`${k.name} ${k.dur}s ${k.ease} ${at}s both`]
  if (until != null) anims.push(`dq-out 0.16s cubic-bezier(0.7, 0, 0.84, 0) ${until}s forwards`)
  return (
    <div className={className} style={{ animation: anims.join(', '), ...style }}>
      {children}
    </div>
  )
}

function TypeLine({ at, dur = 0.45, className = '', children }) {
  return (
    <div
      className={`overflow-hidden whitespace-nowrap ${className}`}
      style={{ animation: `dq-type ${dur}s steps(26, end) ${at}s both` }}
    >
      {children}
    </div>
  )
}

function Center({ className = '', children }) {
  return (
    <div className={`flex h-full w-full items-center justify-center ${className}`}>{children}</div>
  )
}

function Shake({ at, children }) {
  return (
    <div className="animate-shake" style={{ animationDelay: `${at}s` }}>
      {children}
    </div>
  )
}

const CELL = '[grid-area:1/1]'
// BIG/MID carry NO color — callers set it explicitly. (Baking a color in here
// collides with an overriding text-* class: equal-specificity utilities are
// resolved by stylesheet order, not class-string order, so the intended color
// would silently lose. This bit the crimson "LYING." once already.)
const BIG =
  'font-display font-black uppercase leading-none tracking-tight text-[clamp(2.4rem,8vw,6.5rem)]'
const MID =
  'font-display font-black uppercase leading-none tracking-tight text-[clamp(1.6rem,5vw,4rem)]'

// ---------------------------------------------------------------------------
// Scenes. Each `cues` entry fires a game SFX at a scene-relative time.
// ---------------------------------------------------------------------------

function SceneBoot() {
  // Each line types itself in left-to-right, one after the next. A caret sits
  // at the end of whichever line is currently being written (it appears when
  // that line starts typing and hides once the next line begins), so it reads
  // like something is being typed at a terminal.
  return (
    <Center>
      <div className="w-full max-w-md px-8 font-mono text-[13px] leading-loose text-zinc-400">
        <TypeLine at={0} dur={0.55} className="relative">
          <span className="text-crimson">bdf@forensics:~$</span> open incident_4471.case
          <Caret at={0} until={0.6} />
        </TypeLine>
        <TypeLine at={0.6} dur={0.5} className="relative">
          // BUREAU OF DIGITAL FORENSICS
          <Caret at={0.6} until={1.1} />
        </TypeLine>
        <TypeLine at={1.1} dur={0.5} className="relative">
          // CLEARANCE: ANALYST — GRANTED
          <Caret at={1.1} until={1.6} />
        </TypeLine>
        <TypeLine at={1.6} dur={0.45} className="relative text-zinc-200">
          &gt; connection established
          <Caret at={1.6} />
        </TypeLine>
      </div>
    </Center>
  )
}

// A blinking block caret that appears at `at` and (optionally) hides at `until`,
// so it can hop from the end of one typed line to the next. Composes the blink
// with a delayed show (and optional hide) in one `animation` shorthand — the
// inline style would otherwise clobber the `.dq-caret` class's own blink.
function Caret({ at, until }) {
  const anims = [
    `dq-blink 0.8s steps(1) ${at}s infinite`,
    `dq-cut 0.01s linear ${at}s both`,
  ]
  if (until != null) anims.push(`dq-out 0.01s linear ${until}s forwards`)
  return (
    <span
      className="ml-0.5 inline-block h-[1em] w-[0.5em] translate-y-[0.12em] bg-crimson align-baseline"
      style={{ animation: anims.join(', ') }}
    />
  )
}

function SceneCrime() {
  return (
    <Center className="px-6 text-center">
      <div className="grid place-items-center">
        <K at={0} until={0.95} className={`${BIG} ${CELL} text-zinc-100`}>A BODY.</K>
        <K at={0.95} until={1.95} className={`${BIG} ${CELL} text-zinc-100`}>A LOCKED ROOM.</K>
        <K at={1.95} className={`${BIG} ${CELL} text-zinc-100`}>
          <Shake at={2.1}>FOUR SUSPECTS.</Shake>
        </K>
      </div>
    </Center>
  )
}

function SceneAlibi() {
  return (
    <Center className="px-6 text-center">
      <div className="grid place-items-center">
        <K at={0} until={1.55} kind="cut" className={CELL}>
          <div className="flex flex-wrap justify-center gap-x-[0.35em]">
            {'EVERYONE HAS AN ALIBI.'.split(' ').map((w, i) => (
              <K key={w} at={0.05 + i * 0.14} kind="rise" className={`${MID} text-zinc-100`}>
                {w}
              </K>
            ))}
          </div>
        </K>
        <K at={1.6} kind="cut" className={CELL}>
          <Shake at={2.15}>
            <div className="flex flex-wrap justify-center gap-x-[0.35em]">
              {'SOMEONE IS LYING.'.split(' ').map((w, i) => (
                <K
                  key={w}
                  at={1.6 + i * 0.22}
                  className={`${BIG} ${w.startsWith('LYING') ? 'text-crimson' : 'text-zinc-100'}`}
                >
                  {w}
                </K>
              ))}
            </div>
          </Shake>
        </K>
      </div>
    </Center>
  )
}

function SceneData() {
  return (
    <Center className="px-6 text-center">
      <div className="flex flex-col items-center gap-4">
        <K at={0} kind="rise" className={`${MID} text-zinc-500`}>NO WITNESSES.</K>
        <K at={0.55} kind="rise" className={`${MID} text-zinc-500`}>NO CONFESSIONS.</K>
        <K at={1.2} className={`${MID} text-zinc-100`}>
          ONLY <span className="text-crimson">DATA.</span>
        </K>
      </div>
    </Center>
  )
}

function SceneVerbs() {
  return (
    <Center className="px-6 text-center">
      <div className="grid place-items-center">
        <K at={0} until={0.62} className={`${MID} ${CELL} text-zinc-100`}>
          QUERY WITH <span className="text-crimson">SQL.</span>
        </K>
        <K at={0.65} until={1.22} className={`${MID} ${CELL} text-[clamp(2rem,6vw,5rem)] text-zinc-100`}>JOIN.</K>
        <K at={1.25} until={1.82} className={`${MID} ${CELL} text-[clamp(2.4rem,7vw,6rem)] text-zinc-100`}>FILTER.</K>
        <K at={1.85} className={`${BIG} ${CELL} text-crimson`}>
          <Shake at={2.0}>DEDUCE.</Shake>
        </K>
      </div>
    </Center>
  )
}

function SceneBoardIntro() {
  return (
    <Center className="px-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <K at={0} kind="rise" className="font-display text-[11px] font-semibold uppercase tracking-[0.4em] text-zinc-500">
          One case file. Four tabs.
        </K>
        <K at={0.35} className={`${MID} text-zinc-100`}>THIS IS THE DESK.</K>
      </div>
    </Center>
  )
}

function SceneProve() {
  return (
    <Center className="px-6 text-center">
      <div className="grid place-items-center">
        <K at={0} until={1.0} className={`${MID} ${CELL} text-zinc-500`}>DON'T GUESS.</K>
        <K at={1.05} className={`${CELL}`}>
          <Shake at={1.2}>
            <div className={`${BIG} text-crimson`}>PROVE IT.</div>
          </Shake>
        </K>
      </div>
    </Center>
  )
}

function SceneTitle() {
  return (
    <Center className="px-6">
      <div className="relative text-center">
        <K at={0} className="font-display text-[clamp(2rem,7vw,5.5rem)] font-black leading-none tracking-tight text-zinc-100 drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]">
          DETECTIVE<span className="dq-blink-stop text-exception">_</span>QUERY
        </K>
        <K at={0.5} kind="rise" className="mt-5 font-display text-sm font-semibold uppercase tracking-[0.35em] text-zinc-400 sm:text-base">
          Write real SQL. Crack the case.
        </K>

        {/* Call to action: play now + source repo (one link, by the icon). */}
        <K at={2.4} kind="rise" className="mt-9 flex flex-col items-center gap-3">
          <span className="font-display text-[11px] font-semibold uppercase tracking-[0.4em] text-zinc-500">
            Play now at
          </span>
          <a
            href={REPO_URL}
            className="press inline-flex items-center gap-2.5 font-mono text-sm tracking-wide text-zinc-300 transition-colors hover:text-crimson"
          >
            <GithubIcon className="h-5 w-5" />
            github.com/zhnuksyh/detective-query
          </a>
        </K>

        <div
          className="pointer-events-none absolute -right-6 -top-14 animate-stamp-slam sm:-right-20 sm:-top-20"
          style={{ animationDelay: '1.5s' }}
        >
          <div className="scale-[0.45] sm:scale-[0.6]">
            <CaseStamp size="board" rotate={-14} />
          </div>
        </div>
      </div>
    </Center>
  )
}

// The tab-tour scene needs the scene-relative clock, so it's wrapped to receive
// `t` and forward cues. It's the visual centrepiece — a real playable dashboard.
function SceneTabTour({ t, onCue }) {
  return <TabTour t={t} onCue={onCue} />
}

// ---------------------------------------------------------------------------
// Timeline. `cues`: [time(s), sfxName] fired once as the clock crosses it.
// `clock: true` scenes receive the scene-relative `t` + an onCue callback.
// ---------------------------------------------------------------------------

const SCENES = [
  { id: 'boot', dur: 2.0, Comp: SceneBoot, cues: [[0.1, 'click'], [1.15, 'success']] },
  { id: 'crime', dur: 3.0, Comp: SceneCrime, cues: [[0, 'stamp'], [0.95, 'stamp'], [1.95, 'stamp']] },
  { id: 'alibi', dur: 3.0, Comp: SceneAlibi, cues: [[0.05, 'paper'], [1.6, 'error']] },
  { id: 'data', dur: 2.6, Comp: SceneData, cues: [[0, 'tab'], [0.55, 'tab'], [1.2, 'unlock']] },
  { id: 'verbs', dur: 2.6, Comp: SceneVerbs, cues: [[0, 'tab'], [0.65, 'tab'], [1.25, 'tab'], [1.85, 'stamp']] },
  { id: 'boardintro', dur: 1.5, Comp: SceneBoardIntro, cues: [[0.35, 'paper']] },
  { id: 'tabtour', dur: 13.8, Comp: SceneTabTour, clock: true, cues: [] },
  { id: 'prove', dur: 2.4, Comp: SceneProve, cues: [[0, 'error'], [1.05, 'stamp']] },
  { id: 'title', dur: 6.0, Comp: SceneTitle, cues: [[0, 'stamp'], [1.8, 'solved']] },
]

const STARTS = SCENES.reduce((acc, s) => {
  acc.push((acc[acc.length - 1] ?? 0) + s.dur)
  return acc
}, [0]).slice(0, -1)

const TOTAL = SCENES.reduce((sum, s) => sum + s.dur, 0)

export default function Trailer() {
  const [playing, setPlaying] = useState(false) // wait for a gesture (audio)
  const [started, setStarted] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [run, setRun] = useState(0)
  const [muted, setMuted] = useState(false)
  const [recording, setRecording] = useState(false)
  const rootRef = useRef(null)

  const done = elapsed >= TOTAL

  // rAF clock: advances only while playing and not finished.
  useEffect(() => {
    if (!playing || done) return
    let raf
    let last = performance.now()
    const tick = (now) => {
      const dt = (now - last) / 1000
      last = now
      setElapsed((e) => Math.min(TOTAL, e + dt))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, done, run])

  // --- Audio cue scheduler ------------------------------------------------
  // Track which (run, sceneIdx, cueIndex) cues have fired so each plays once,
  // and reset on restart. We compare the previous elapsed to the current one.
  const firedRef = useRef(new Set())
  const prevElapsedRef = useRef(0)

  const sceneIdx = useMemo(() => {
    let idx = 0
    for (let i = 0; i < SCENES.length; i++) if (elapsed >= STARTS[i]) idx = i
    return idx
  }, [elapsed])

  useEffect(() => {
    if (!playing) {
      prevElapsedRef.current = elapsed
      return
    }
    // Fire any cue whose absolute time we crossed since the last frame.
    SCENES.forEach((scene, si) => {
      scene.cues.forEach(([rel, name], ci) => {
        const abs = STARTS[si] + rel
        const key = `${run}:${si}:${ci}`
        if (abs <= elapsed && abs > prevElapsedRef.current && !firedRef.current.has(key)) {
          firedRef.current.add(key)
          sfx(name)
        }
      })
    })
    prevElapsedRef.current = elapsed
  }, [elapsed, playing, run])

  // Cues fired from inside the tab-tour scene (it owns its own beat timing).
  const onTourCue = useCallback((name) => sfx(name), [])

  // --- Controls -----------------------------------------------------------
  const begin = useCallback(() => {
    bootAudio()
    startMusic()
    setStarted(true)
    setPlaying(true)
  }, [])

  const restart = useCallback(() => {
    firedRef.current = new Set()
    prevElapsedRef.current = 0
    setElapsed(0)
    setRun((r) => r + 1)
    bootAudio()
    startMusic()
    setStarted(true)
    setPlaying(true)
  }, [])

  const togglePlay = useCallback(() => {
    if (!started) return begin()
    if (done) return restart()
    setPlaying((p) => !p)
  }, [started, done, begin, restart])

  // Jump a whole scene forward/backward. Scene granularity (not seconds) keeps
  // it snappy and always lands on a clean beat. Bumping `run` remounts the
  // scene so its CSS entrance animations replay from the jumped-to point, and
  // resetting the cue bookkeeping lets audio cues fire correctly after a seek.
  const seek = useCallback(
    (dir) => {
      if (!started) return begin()
      const target = Math.max(0, Math.min(SCENES.length - 1, sceneIdx + dir))
      const at = STARTS[target]
      firedRef.current = new Set()
      prevElapsedRef.current = at
      setElapsed(at)
      setRun((r) => r + 1)
      setPlaying(true)
      startMusic()
    },
    [started, begin, sceneIdx],
  )

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m
      setTrailerMuted(next)
      return next
    })
  }, [])

  // Music follows the play state so pausing the trailer pauses the score.
  useEffect(() => {
    if (!started) return
    if (playing && !done) startMusic()
    else stopMusic()
  }, [playing, done, started])

  // Keys: Space = play/pause, R = restart, M = mute, ←/→ = seek by scene.
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space') {
        e.preventDefault()
        togglePlay()
      } else if (e.key === 'r' || e.key === 'R') {
        restart()
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMute()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        seek(1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        seek(-1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePlay, restart, toggleMute, seek])

  // --- Export: record the page start-to-finish as an HD .webm -------------
  const exportVideo = useCallback(async () => {
    if (recording) return
    if (!navigator.mediaDevices?.getDisplayMedia || typeof MediaRecorder === 'undefined') {
      alert('Video export needs a Chromium-based browser (Chrome/Edge). Try there, or screen-record manually.')
      return
    }
    let stream
    try {
      // preferCurrentTab hints Chrome to preselect this tab; the user still
      // confirms the share (a browser security requirement we can't bypass).
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 60, width: 1920, height: 1080 },
        // CRITICAL: turn OFF the browser's voice-oriented audio processing.
        // For captured *tab* audio these default to on and are tuned for
        // speech — auto-gain-control pumps the volume up and down and noise
        // suppression chews on music/SFX, which is what made the recorded
        // audio sound unstable and "weird". Disabling them captures the tab's
        // sound faithfully. High sample rate for music fidelity.
        audio: {
          autoGainControl: false,
          echoCancellation: false,
          noiseSuppression: false,
          channelCount: 2,
          sampleRate: 48000,
        },
        preferCurrentTab: true,
      })
    } catch {
      return // user cancelled the picker
    }

    // Record WebM (VP9, then VP8) — Chromium's mature, high-quality encoder
    // path with stable audio muxing. We deliberately do NOT ask MediaRecorder
    // for video/mp4: several Chromium builds accept that mime but route to an
    // immature MP4 muxer that drops video quality and produces unstable audio.
    // WebM gives the best result; convert to .mp4 afterward with any tool
    // (VLC/ffmpeg) — a guaranteed in-browser MP4 would need ffmpeg.wasm (~30MB).
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm'
    const rec = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: 16_000_000,
      audioBitsPerSecond: 192_000,
    })
    const chunks = []
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)

    // Leave the clean capture state: exit fullscreen, restore chrome + cursor.
    const cleanup = () => {
      stream.getTracks().forEach((tr) => tr.stop())
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
      setRecording(false)
    }
    rec.onstop = () => {
      cleanup()
      const blob = new Blob(chunks, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'detective-query-trailer.webm'
      a.click()
      URL.revokeObjectURL(url)
    }
    // If the user stops sharing from the browser bar, finalise cleanly.
    stream.getVideoTracks()[0].addEventListener('ended', () => {
      if (rec.state !== 'inactive') rec.stop()
    })

    // Fullscreen the trailer so the recorded frame is edge-to-edge with no
    // browser UI, then hide the on-screen controls + cursor (via `recording`).
    try {
      await rootRef.current?.requestFullscreen?.()
    } catch {
      // Fullscreen may be blocked; recording still proceeds windowed.
    }
    setRecording(true)
    rec.start()
    // Play the trailer from the top; stop recording a beat after it finishes.
    restart()
    setTimeout(() => {
      if (rec.state !== 'inactive') rec.stop()
    }, (TOTAL + 0.6) * 1000)
  }, [recording, restart])

  const scene = SCENES[sceneIdx]
  const SceneComp = scene.Comp
  const sceneT = elapsed - STARTS[sceneIdx]

  return (
    <div
      ref={rootRef}
      className={`relative h-full w-full overflow-hidden bg-zinc-950 text-zinc-200 ${playing ? '' : 'dq-paused'} ${recording ? 'cursor-none' : ''}`}
    >
      <style>{TRAILER_CSS}</style>

      {/* Backdrop layers */}
      <pre className="pointer-events-none absolute inset-0 select-none overflow-hidden whitespace-pre-wrap break-all p-6 font-mono text-[11px] leading-relaxed text-zinc-100/[0.03]">
        {SQL_TEXTURE}
      </pre>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 30% 40%, rgba(242,178,92,0.06), transparent), radial-gradient(ellipse 55% 45% at 72% 65%, rgba(168,111,33,0.07), transparent)',
        }}
      />
      <div className="dq-scanlines pointer-events-none absolute inset-0" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 45%, rgba(9,9,11,0.8) 100%)',
        }}
      />

      {/* Active scene (remounts on scene change / restart) */}
      <div key={`${run}-${scene.id}`} className="absolute inset-0">
        {scene.clock ? <SceneComp t={sceneT} onCue={onTourCue} /> : <SceneComp />}
        <div
          className="pointer-events-none absolute inset-0 bg-white"
          style={{ animation: 'dq-flash 0.18s ease-out both' }}
        />
      </div>

      {/* Start gate: first play needs a click (browsers block audio otherwise) */}
      {!started && (
        <button
          onClick={begin}
          className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-zinc-950/70 backdrop-blur-sm"
        >
          <span className="grid h-20 w-20 place-items-center rounded-full border border-white/20 bg-zinc-950/60 text-zinc-100 transition-transform hover:scale-105">
            <Play className="h-8 w-8 translate-x-0.5" />
          </span>
          <span className="font-display text-sm font-semibold uppercase tracking-[0.35em] text-zinc-300">
            Play trailer
          </span>
          <span className="font-mono text-[10px] tracking-widest text-zinc-600">with sound ♪</span>
        </button>
      )}

      {/* Chrome — the whole control cluster is hidden while recording so the
          exported frame is clean (no buttons, no REC badge, no cursor). */}
      {!recording && (
        <div className="absolute right-5 top-5 flex items-center gap-2">
          {!playing && started && (
            <span className="animate-pop-in rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 font-mono text-[10px] tracking-[0.25em] text-zinc-400 backdrop-blur">
              PAUSED
            </span>
          )}
          <ChromeButton onClick={toggleMute} label={muted ? 'Unmute (M)' : 'Mute (M)'}>
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </ChromeButton>
          <ChromeButton
            onClick={() => seek(-1)}
            label="Previous scene (←)"
            disabled={started && sceneIdx === 0}
          >
            <SkipBack className="h-4 w-4" />
          </ChromeButton>
          <ChromeButton onClick={togglePlay} label={done ? 'Replay' : playing ? 'Pause (Space)' : 'Play (Space)'}>
            {playing && !done ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </ChromeButton>
          <ChromeButton
            onClick={() => seek(1)}
            label="Next scene (→)"
            disabled={started && sceneIdx === SCENES.length - 1}
          >
            <SkipForward className="h-4 w-4" />
          </ChromeButton>
          <ChromeButton onClick={restart} label="Restart (R)">
            <RotateCcw className="h-4 w-4" />
          </ChromeButton>
          <ChromeButton onClick={exportVideo} label="Export HD video" disabled={recording} accent>
            {recording ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          </ChromeButton>
        </div>
      )}

      {/* Progress bar with scene tick marks — hidden while recording. */}
      {!recording && (
      <div className="absolute inset-x-0 bottom-0 h-1 bg-zinc-800/60">
        <div className="h-full bg-crimson" style={{ width: `${(elapsed / TOTAL) * 100}%` }} />
        {STARTS.slice(1).map((s) => (
          <div
            key={s}
            className="absolute top-0 h-full w-px bg-zinc-950"
            style={{ left: `${(s / TOTAL) * 100}%` }}
          />
        ))}
      </div>
      )}
    </div>
  )
}

function ChromeButton({ onClick, label, children, disabled, accent }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`press rounded-lg border p-2.5 backdrop-blur transition-colors disabled:opacity-40 ${
        accent
          ? 'border-crimson/50 bg-crimson/15 text-crimson hover:border-crimson hover:bg-crimson/25'
          : 'border-white/10 bg-zinc-950/60 text-zinc-300 hover:border-crimson/70 hover:text-zinc-100'
      }`}
    >
      {children}
    </button>
  )
}
