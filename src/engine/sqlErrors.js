// @ts-check
/**
 * Translate a raw SQLite error message into a short, friendly hint about what
 * the player likely got wrong. Falls back to the original message (lightly
 * cleaned) when nothing matches.
 * @param {unknown} raw
 * @returns {string}
 */
export function friendlySqlError(raw) {
  if (!raw) return 'Something went wrong.'
  const msg = String(raw)
  const lower = msg.toLowerCase()

  // no such table: entitlement
  let m = msg.match(/no such table:\s*(\S+)/i)
  if (m) return `There’s no table called “${m[1]}”. Check the Data Map for the exact name.`

  // no such column: account.nam
  m = msg.match(/no such column:\s*(\S+)/i)
  if (m) return `There’s no column called “${m[1]}”. Check the Data Map for the exact name.`

  // near "X": syntax error
  m = msg.match(/near\s+"([^"]*)":\s*syntax error/i)
  if (m) {
    return m[1]
      ? `There’s a syntax slip near “${m[1]}” — check for a typo or a missing keyword.`
      : `There’s a syntax slip near the end — check for a missing keyword.`
  }

  if (lower.includes('incomplete input')) {
    return 'The query looks unfinished — you may be missing part of the statement.'
  }
  if (lower.includes('unrecognized token')) {
    return 'There’s an unexpected character in the query — check for stray symbols.'
  }
  if (lower.includes('ambiguous column name')) {
    m = msg.match(/ambiguous column name:\s*(\S+)/i)
    return `“${m ? m[1] : 'A column'}” exists in more than one table — prefix it with the table name (e.g. accounts.id).`
  }
  if (lower.includes('wrong number of arguments')) {
    return 'A function got the wrong number of arguments — check its parentheses.'
  }

  // Strip the "Error: " prefix if present, otherwise return as-is.
  return msg.replace(/^Error:\s*/i, '')
}
