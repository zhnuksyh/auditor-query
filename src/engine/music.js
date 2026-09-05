/**
 * Background music player. Unlike the procedural effects/ambience (Web Audio),
 * music is a plain looping <audio> element streaming an MP3 from /public/music.
 *
 * The game loops a single background track. Drop a free-to-distribute MP3 into
 * public/music/ named `theme.mp3` (see public/music/README.md). If it's missing
 * the player just stays silent; the game is fully playable without it.
 */

// Vite serves /public at the app root; `import.meta.env.BASE_URL` respects the
// relative `base` we build with, so this resolves on GitHub Pages subpaths too.
const base = import.meta.env.BASE_URL || '/'

// The single looping background track (file in public/music/).
const MUSIC_FILE = 'theme.mp3'

let audio = null
let state = {
  enabled: false,
  volume: 0.6, // effective volume (master * music), applied to the element
  started: false, // whether a user gesture has let playback begin
}

function ensureAudio() {
  if (audio) return audio
  audio = new Audio()
  audio.loop = true
  audio.preload = 'auto'
  // A missing/unsupported file shouldn't spam the console or break anything.
  audio.addEventListener('error', () => {
    /* file absent or blocked — stay silent */
  })
  return audio
}

// Optional absolute/relative override for the track URL. The trailer sets this
// because it's served from a /trailer/ subpath where the app's relative base
// ('./') would resolve to /trailer/music/ (wrong) instead of the site root.
let srcOverride = null
export function setMusicSrc(url) {
  srcOverride = url || null
}

function srcFor() {
  return srcOverride || `${base}music/${MUSIC_FILE}`
}

/** Attempt to play; browsers reject until a user gesture, which we swallow. */
function tryPlay() {
  if (!audio) return
  const p = audio.play()
  if (p && typeof p.catch === 'function') p.catch(() => {})
}

/**
 * Reconcile the player with a desired mix. Called on every settings change and
 * once after the first user gesture. Handles enabling/disabling and volume.
 */
export function updateMusic({ enabled, volume, gesture = false }) {
  if (gesture) state.started = true
  if (enabled !== undefined) state.enabled = enabled
  if (volume !== undefined) state.volume = volume

  const a = ensureAudio()
  a.volume = Math.max(0, Math.min(1, state.volume))

  const wantSrc = srcFor()
  const currentFile = a.src.split('/').pop()
  const wantFile = wantSrc.split('/').pop()
  if (currentFile !== wantFile) {
    a.src = wantSrc
  }

  if (state.enabled && state.started) {
    if (a.paused) tryPlay()
  } else {
    if (!a.paused) a.pause()
  }
}

/** Whether music is currently supposed to be sounding (for ambience gating). */
export function isMusicActive() {
  return state.enabled && state.started
}
