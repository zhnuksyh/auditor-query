// @ts-check
/**
 * Scope-memo highlighter — the pure range math behind the marker pen.
 *
 * A highlight is a character range into a case's `engagement.report` string,
 * carrying the text it covered when it was made. Offsets alone would be
 * brittle: reword a case's report and an old save would paint the wrong words.
 * The stored `text` is the guard — on load, a highlight whose offsets no longer
 * spell the same substring is dropped rather than rendered in the wrong place.
 *
 * Ranges are kept sorted and non-overlapping. Re-highlighting across an
 * existing mark coalesces instead of stacking duplicates, so the marker behaves
 * like a real one: passing over the same words twice looks the same as once.
 */

/**
 * Split a report into paragraphs, each with its absolute start offset.
 *
 * The report renders as one `whitespace-pre-line` block, but selection math is
 * far simpler when every paragraph is its own single text node — then a DOM
 * Range's offset is just an index into that paragraph, and `base` converts it
 * to an absolute index into the report. Splitting on the blank line keeps the
 * separator length known (2), so bases stay exact.
 *
 * @param {string} report
 * @returns {{ text: string, base: number }[]}
 */
export function splitParagraphs(report) {
  const parts = report.split('\n\n')
  const out = []
  let base = 0
  for (const text of parts) {
    out.push({ text, base })
    base += text.length + 2 // the '\n\n' that split() consumed
  }
  return out
}

/**
 * Drop highlights that no longer match the report they were made against.
 *
 * @param {import('../types.js').Highlight[]} highlights
 * @param {string} report
 * @returns {import('../types.js').Highlight[]}
 */
export function reconcile(highlights, report) {
  if (!Array.isArray(highlights)) return []
  return highlights.filter(
    (h) =>
      h &&
      typeof h.start === 'number' &&
      typeof h.end === 'number' &&
      h.start >= 0 &&
      h.end <= report.length &&
      h.start < h.end &&
      report.slice(h.start, h.end) === h.text,
  )
}

/**
 * Add a range, merging it with any highlights it touches or overlaps.
 *
 * Adjacent ranges (`end === start`) merge too — dragging over two halves of a
 * phrase in separate strokes should leave one continuous mark, not a seam.
 *
 * @param {import('../types.js').Highlight[]} highlights
 * @param {number} start
 * @param {number} end
 * @param {string} report
 * @returns {import('../types.js').Highlight[]}
 */
export function addRange(highlights, start, end, report) {
  if (!(start < end)) return highlights

  let lo = start
  let hi = end
  const kept = []
  for (const h of highlights) {
    if (h.end < lo || h.start > hi) {
      kept.push(h)
    } else {
      // Overlapping or touching: absorb it into the range being added.
      lo = Math.min(lo, h.start)
      hi = Math.max(hi, h.end)
    }
  }
  kept.push({ start: lo, end: hi, text: report.slice(lo, hi) })
  return kept.sort((a, b) => a.start - b.start)
}

/**
 * Remove whichever highlight contains `offset`. Clicking a mark clears the
 * whole mark — simpler to reason about mid-case than splitting it in two, and
 * re-dragging the part you wanted back is one gesture.
 *
 * @param {import('../types.js').Highlight[]} highlights
 * @param {number} offset
 * @returns {import('../types.js').Highlight[]}
 */
export function removeAt(highlights, offset) {
  return highlights.filter((h) => offset < h.start || offset >= h.end)
}

/**
 * Cut one paragraph into alternating plain / highlighted segments for render.
 *
 * @param {{ text: string, base: number }} para
 * @param {import('../types.js').Highlight[]} highlights
 * @returns {{ text: string, start: number, marked: boolean }[]}
 */
export function segmentParagraph(para, highlights) {
  const end = para.base + para.text.length
  const within = highlights
    .filter((h) => h.start < end && h.end > para.base)
    .sort((a, b) => a.start - b.start)

  /** @type {{ text: string, start: number, marked: boolean }[]} */
  const segments = []
  let cursor = para.base
  /**
   * @param {number} from
   * @param {number} to
   * @param {boolean} marked
   */
  const push = (from, to, marked) => {
    if (to > from) {
      segments.push({ text: para.text.slice(from - para.base, to - para.base), start: from, marked })
    }
  }

  for (const h of within) {
    // A highlight may run past a paragraph edge; clamp it to this paragraph.
    const from = Math.max(h.start, para.base)
    const to = Math.min(h.end, end)
    push(cursor, from, false)
    push(from, to, true)
    cursor = to
  }
  push(cursor, end, false)
  return segments
}
