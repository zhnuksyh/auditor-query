/**
 * Trailer audio: reuses the game's own procedural SFX engine and the looping
 * music track, so the trailer sounds exactly like the game. Nothing new is
 * synthesized or bundled — we just drive the existing engines on a schedule.
 *
 * `playSound(name)` fires the same Web-Audio effects the game uses (run,
 * success, unlock, stamp, paper, solved, click...). `updateMusic` streams the
 * same MP3. Both are gated behind a user gesture by the browser; the trailer's
 * play button is that gesture.
 */
import { playSound, setMuted, setSfxVolume, setSfxBoost, setMusicActive } from '../engine/sound.js'
import { updateMusic, setMusicSrc } from '../engine/music.js'
// Import the track as a bundled asset so Vite emits a hashed URL that resolves
// correctly from the /trailer/ subpath (a plain './music/...' path would 404
// here because the page isn't at the site root).
import themeUrl from '../../public/music/theme.mp3'

let booted = false
let muted = false

// Trailer mix: music sits well under the effects so swooshes/bangs read as
// punches over a bed, not a wall of theme. MUSIC_VOL is quiet; the SFX boost
// pushes the procedural effects above it.
const MUSIC_VOL = 0.26
const SFX_BOOST = 2.3

/** Boot the mix once (after the first user gesture). Idempotent. */
export function bootAudio() {
  if (booted) return
  booted = true
  setMusicSrc(themeUrl) // point the player at the bundled track (correct URL)
  setSfxVolume({ master: 1, sfx: 1 })
  setSfxBoost(SFX_BOOST)
  setMuted(!muted) // engine takes the "sound enabled" flag
  setMusicActive(true) // keep the room-tone ambience out of the way of music
}

/** Start (or resume) the looping theme, kept low under the effects. */
export function startMusic() {
  updateMusic({ enabled: !muted, volume: muted ? 0 : MUSIC_VOL, gesture: true })
}

export function stopMusic() {
  updateMusic({ enabled: false, volume: 0 })
}

export function setTrailerMuted(value) {
  muted = value
  setMuted(!muted)
  updateMusic({ enabled: !muted, volume: muted ? 0 : MUSIC_VOL })
}

export function isMuted() {
  return muted
}

/** Fire a named game SFX, unless muted. */
export function sfx(name) {
  if (muted || !booted) return
  playSound(name)
}
