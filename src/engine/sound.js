/**
 * Procedural sound engine. Every effect is synthesized with the Web Audio API
 * at play time — there are NO audio asset files, which keeps the zero-barrier,
 * $0-hosting pillar intact (nothing extra to download, no binaries in the repo).
 *
 * The engine is a lazy singleton: the AudioContext is only created on the first
 * sound, and only after a user gesture (browsers block audio before that). A
 * muted flag lets the Options "Sound" toggle silence everything cheaply.
 */

let ctx = null
let master = null
let muted = false

// Volume mix (0..1). The audible SFX level is BASE_GAIN * master * sfx * boost;
// the BASE keeps the synth palette gentle regardless of the user's slider.
const BASE_GAIN = 0.3
let masterVolume = 0.8
let sfxVolume = 0.8
// Extra multiplier on the SFX bus. Defaults to 1 (no change for the game); the
// trailer bumps this so effects punch above its background music.
let sfxBoost = 1

// Ambience graph (built lazily on first start). A soft, slowly-drifting room
// tone that sits far under the effects to give the app a "live workspace" feel.
// It plays only when sound is on AND background music isn't (so they don't
// muddy each other) — see `ambienceAllowed`.
let ambience = null
let musicActive = false // set by the app so ambience yields to music

function ensureContext() {
  if (ctx) return ctx
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  ctx = new AC()
  master = ctx.createGain()
  master.gain.value = BASE_GAIN * masterVolume * sfxVolume * sfxBoost
  master.connect(ctx.destination)
  return ctx
}

function applyMasterGain() {
  if (!master || !ctx) return
  // Muting cuts the whole synth bus; otherwise scale by the mix.
  const target = muted ? 0.0001 : BASE_GAIN * masterVolume * sfxVolume * sfxBoost
  master.gain.setTargetAtTime(target, ctx.currentTime, 0.05)
}

/** True when the ambience bed should be audible right now. */
function ambienceAllowed() {
  return !muted && !musicActive
}

function applyAmbienceGain() {
  if (!ambience || !ctx) return
  const target = ambienceAllowed() ? ambience.level : 0.0001
  ambience.gain.gain.setTargetAtTime(target, ctx.currentTime, 0.4)
}

export function setMuted(value) {
  muted = !value // callers pass the "sound enabled" flag
  applyMasterGain()
  applyAmbienceGain()
}

/** Update the SFX side of the mix (master + sfx sliders, both 0..1). */
export function setSfxVolume({ master: m, sfx } = {}) {
  if (m !== undefined) masterVolume = clamp01(m)
  if (sfx !== undefined) sfxVolume = clamp01(sfx)
  applyMasterGain()
}

/**
 * Set an extra multiplier on the SFX bus (default 1). The trailer uses this to
 * make effects punch above its music without touching the game's own mix.
 */
export function setSfxBoost(value) {
  sfxBoost = Math.max(0, Number(value) || 1)
  applyMasterGain()
}

/** Tell the engine whether background music is currently playing. */
export function setMusicActive(active) {
  musicActive = !!active
  applyAmbienceGain()
}

function clamp01(v) {
  return Math.max(0, Math.min(1, Number(v) || 0))
}

/**
 * Build a shared noise buffer (a few seconds of white noise) we can loop for
 * the ambience bed. Reused so we don't allocate on every start.
 */
let noiseBuffer = null
function getNoiseBuffer() {
  if (noiseBuffer) return noiseBuffer
  const len = ctx.sampleRate * 3
  noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = noiseBuffer.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  return noiseBuffer
}

/**
 * Start the looping ambience bed: a low sine drone plus heavily low-passed
 * noise (a faint "air conditioning / server room" hush), with a slow LFO on
 * the filter so it breathes rather than sitting static. Idempotent.
 */
export function startAmbience() {
  const c = ensureContext()
  if (!c || ambience) return
  if (c.state === 'suspended') c.resume()

  const level = 0.5 // relative to master; kept low so effects stay on top
  const bed = c.createGain()
  bed.gain.value = ambienceAllowed() ? level : 0.0001
  bed.connect(master)

  // Low drone.
  const drone = c.createOscillator()
  drone.type = 'sine'
  drone.frequency.value = 58
  const droneGain = c.createGain()
  droneGain.gain.value = 0.12
  drone.connect(droneGain)
  droneGain.connect(bed)
  drone.start()

  // Filtered noise hush.
  const noise = c.createBufferSource()
  noise.buffer = getNoiseBuffer()
  noise.loop = true
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 320
  lp.Q.value = 0.6
  const noiseGain = c.createGain()
  noiseGain.gain.value = 0.06
  noise.connect(lp)
  lp.connect(noiseGain)
  noiseGain.connect(bed)
  noise.start()

  // Slow LFO gently sweeps the filter so the hush "breathes".
  const lfo = c.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = 0.05
  const lfoGain = c.createGain()
  lfoGain.gain.value = 120
  lfo.connect(lfoGain)
  lfoGain.connect(lp.frequency)
  lfo.start()

  ambience = { gain: bed, level, nodes: [drone, noise, lfo] }
}

/**
 * Play a single oscillator "voice" with a short attack/decay envelope.
 * All of the named effects below are built from one or more of these.
 */
function tone({ freq, type = 'sine', start = 0, dur = 0.12, gain = 1, glideTo = null }) {
  if (!ctx || !master) return
  const t0 = ctx.currentTime + start
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (glideTo != null) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur)

  // Fast attack, exponential decay — reads as a clean digital "blip".
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)

  osc.connect(g)
  g.connect(master)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

/**
 * A short burst of band-passed noise — the raw material for "paper" and other
 * textural, non-pitched sounds. The band-pass centre sweeps over the burst so
 * it reads as a quick rustle/flip rather than a flat shhh.
 */
function noiseBurst({ start = 0, dur = 0.18, gain = 1, freq = 1800, sweepTo = 900, q = 0.8 }) {
  if (!ctx || !master) return
  const t0 = ctx.currentTime + start
  const src = ctx.createBufferSource()
  src.buffer = getNoiseBuffer()
  src.loop = true

  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.Q.value = q
  bp.frequency.setValueAtTime(freq, t0)
  bp.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur)

  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)

  src.connect(bp)
  bp.connect(g)
  g.connect(master)
  src.start(t0)
  src.stop(t0 + dur + 0.02)
}

// The sound palette. Each entry is a small composition of tones.
const EFFECTS = {
  // Light UI feedback.
  hover: () => tone({ freq: 620, type: 'sine', dur: 0.05, gain: 0.55 }),
  click: () => tone({ freq: 420, type: 'triangle', dur: 0.08, gain: 1.05, glideTo: 300 }),
  tab: () => tone({ freq: 520, type: 'triangle', dur: 0.09, gain: 0.9, glideTo: 660 }),
  // Tab switch: a paper-flip rustle — two overlapping noise sweeps for the
  // "page lifting then settling" texture, with a soft low thump underneath.
  paper: () => {
    noiseBurst({ dur: 0.14, gain: 0.75, freq: 2600, sweepTo: 1100, q: 0.7 })
    noiseBurst({ start: 0.06, dur: 0.13, gain: 0.5, freq: 1500, sweepTo: 700, q: 0.9 })
    tone({ freq: 150, type: 'sine', start: 0.05, dur: 0.09, gain: 0.4, glideTo: 90 })
  },
  toggle: () => tone({ freq: 700, type: 'square', dur: 0.06, gain: 0.6 }),
  back: () => tone({ freq: 360, type: 'triangle', dur: 0.1, gain: 0.9, glideTo: 240 }),

  // Dropdown interactions.
  open: () => tone({ freq: 480, type: 'sine', dur: 0.07, gain: 0.6, glideTo: 600 }),
  select: () => tone({ freq: 560, type: 'triangle', dur: 0.08, gain: 0.75 }),

  // SQL run + results.
  run: () => {
    tone({ freq: 300, type: 'square', dur: 0.05, gain: 0.4 })
    tone({ freq: 460, type: 'square', start: 0.05, dur: 0.06, gain: 0.4 })
  },
  success: () => {
    // A rising two-note "query returned rows" confirmation.
    tone({ freq: 523, type: 'sine', dur: 0.1, gain: 0.6 })
    tone({ freq: 784, type: 'sine', start: 0.08, dur: 0.14, gain: 0.55 })
  },
  error: () => {
    // A low, dissonant buzz for a failed query.
    tone({ freq: 180, type: 'sawtooth', dur: 0.18, gain: 0.5, glideTo: 120 })
    tone({ freq: 174, type: 'square', start: 0.02, dur: 0.16, gain: 0.25 })
  },

  // The game's key moments.
  unlock: () => {
    // Bright ascending arpeggio — "evidence obtained".
    tone({ freq: 659, type: 'sine', dur: 0.12, gain: 0.6 })
    tone({ freq: 880, type: 'sine', start: 0.09, dur: 0.12, gain: 0.6 })
    tone({ freq: 1175, type: 'sine', start: 0.18, dur: 0.18, gain: 0.55 })
  },
  stamp: () => {
    // Heavy rubber-stamp slam: a sharp smack of noise, a deep pitch-dropping
    // thud, and a low body resonance so it lands with real weight.
    noiseBurst({ dur: 0.07, gain: 1.2, freq: 1100, sweepTo: 260, q: 0.5 })
    tone({ freq: 150, type: 'sine', dur: 0.28, gain: 1.3, glideTo: 42 })
    tone({ freq: 95, type: 'triangle', start: 0.015, dur: 0.32, gain: 0.7, glideTo: 48 })
    noiseBurst({ start: 0.04, dur: 0.16, gain: 0.35, freq: 500, sweepTo: 150, q: 0.7 })
  },
  solved: () => {
    // A four-note fanfare for CASE CLOSED.
    const notes = [523, 659, 784, 1047]
    notes.forEach((f, i) =>
      tone({ freq: f, type: 'triangle', start: i * 0.11, dur: 0.22, gain: 0.6 }),
    )
    tone({ freq: 1568, type: 'sine', start: 0.44, dur: 0.4, gain: 0.4 })
  },
}

/**
 * Play a named effect. No-op when muted or when the effect is unknown. The
 * first call after a user gesture lazily boots (and resumes) the AudioContext.
 */
export function playSound(name) {
  if (muted) return
  const c = ensureContext()
  if (!c) return
  if (c.state === 'suspended') c.resume()
  const effect = EFFECTS[name]
  if (effect) {
    try {
      effect()
    } catch {
      // Never let an audio glitch break gameplay.
    }
  }
}
