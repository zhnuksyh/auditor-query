// @ts-check
/**
 * The "Intercepted Deduction" tracker.
 *
 * After every query the player runs, we inspect the returned rows and decide
 * which Finding blanks should unlock. A blank unlocks when ANY returned row
 * has `row[unlockedByColumn] === triggerValue` (compared loosely so 3 === "3";
 * column names match ignoring case, since SQL is case-insensitive and players
 * write aliases like `AS LAST_PING`).
 *
 * A case defines its blanks like:
 *   blanks: {
 *     accountId: { label, targetValue, unlockedByColumn, triggerValue, options },
 *     ...
 *   }
 *
 * This function is pure: given the current unlock set and a fresh result, it
 * returns the union of blanks that are now unlocked.
 *
 * @param {Record<string, {unlockedByColumn: string, triggerValue: unknown}>} blanks
 * @param {Array<Record<string, unknown>>} rows
 * @param {Set<string>} alreadyUnlocked
 * @returns {{ unlocked: Set<string>, newlyUnlocked: string[] }}
 */
export function evaluateUnlocks(blanks, rows, alreadyUnlocked) {
  const unlocked = new Set(alreadyUnlocked)
  const newlyUnlocked = []

  for (const [key, config] of Object.entries(blanks)) {
    if (unlocked.has(key)) continue
    const hit = rows.some((row) => looseEqual(readColumn(row, config.unlockedByColumn), config.triggerValue))
    if (hit) {
      unlocked.add(key)
      newlyUnlocked.push(key)
    }
  }

  return { unlocked, newlyUnlocked }
}

/**
 * Resolve a configured column against the row's keys ignoring case. SQLite
 * reports result columns with whatever casing the player typed, so an unlock
 * keyed on `last_ping` must also accept `AS Last_Ping` / `AS LAST_PING`.
 * Only own keys count — never fall through to Object.prototype.
 * @param {Record<string, unknown>} row
 * @param {string} column
 * @returns {unknown}
 */
function readColumn(row, column) {
  if (Object.prototype.hasOwnProperty.call(row, column)) return row[column]
  const lower = column.toLowerCase()
  for (const key of Object.keys(row)) {
    if (key.toLowerCase() === lower) return row[key]
  }
  return undefined
}

/**
 * Loose equality so INTEGER 3 matches the string "3", trimming text.
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
function looseEqual(a, b) {
  if (a == null || b == null) return a === b
  if (typeof a === 'string' && typeof b === 'string') {
    return a.trim().toLowerCase() === b.trim().toLowerCase()
  }
  // eslint-disable-next-line eqeqeq
  return a == b || String(a).trim() === String(b).trim()
}

/**
 * Check whether the player's chosen answers match the case solution.
 * @param {Record<string, {targetValue: unknown}>} blanks
 * @param {Record<string, unknown>} answers  key -> chosen value
 * @returns {{ correct: boolean, results: Record<string, boolean> }}
 */
export function gradeReport(blanks, answers) {
  /** @type {Record<string, boolean>} */
  const results = {}
  let correct = true
  for (const [key, config] of Object.entries(blanks)) {
    const ok = looseEqual(answers[key], config.targetValue)
    results[key] = ok
    if (!ok) correct = false
  }
  return { correct, results }
}
