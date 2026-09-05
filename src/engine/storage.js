// @ts-check
/**
 * localStorage-backed save system. Everything is client-side, so a player's
 * progress, notebook text, and unlocked levels live entirely in the browser.
 */

const KEY = 'detective-query:save:v1'

const DEFAULT_STATE = {
  // Case ids that have been fully solved (report submitted correctly).
  solvedCases: [],
  // Per-case detective's notebook text, keyed by case id.
  notebooks: {},
  // Per-case Crime Scene highlights, keyed by case id -> Highlight[].
  // Each is { start, end, text }: character offsets into the case's report
  // string, plus the text they covered when made (see engine/highlights.js).
  highlights: {},
  // Per-case set of unlocked report blanks, keyed by case id -> string[].
  unlocks: {},
  // Per-case SQL editor draft, keyed by case id.
  sqlDrafts: {},
  // Per-case report-card dropdown selections, keyed by case id -> { blank: value }.
  reportAnswers: {},
  // Last case the player opened, for CONTINUE.
  lastCaseId: null,
  // Whether the Case 01 guided tutorial has been finished/dismissed.
  tutorialDone: false,
  settings: {
    sound: true,
    textScale: 1,
    // Audio mix. Volumes are 0..1 and compose multiplicatively with master.
    music: true,
    masterVolume: 0.8,
    musicVolume: 0.6,
    sfxVolume: 0.8,
  },
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return structuredClone(DEFAULT_STATE)
    const parsed = JSON.parse(raw)
    return { ...structuredClone(DEFAULT_STATE), ...parsed, settings: { ...DEFAULT_STATE.settings, ...(parsed.settings || {}) } }
  } catch {
    return structuredClone(DEFAULT_STATE)
  }
}

/** @param {unknown} state */
export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Storage full or blocked (private mode): fail silently, game still playable.
  }
}

export function resetState() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
  return structuredClone(DEFAULT_STATE)
}
