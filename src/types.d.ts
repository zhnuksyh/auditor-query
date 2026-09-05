/**
 * Shared type definitions for Detective Query.
 *
 * This file is types ONLY — it emits no JavaScript and is never imported at
 * runtime. Source files opt into checking with `// @ts-check` at the top and
 * reference these shapes through JSDoc (`@type`, `@param`, `@returns`), so the
 * shipped bundle is byte-for-byte identical to the untyped build.
 *
 * The point is the case data: a case is a plain object, so a mistyped
 * `triggerValue`, a blank missing from the template, or an ERD column that
 * doesn't exist in the schema are all silent failures at runtime. `npm test`
 * catches them by executing the case; these types catch them while you type.
 */

/** A column as drawn on the Case Board ERD. */
export interface ErdColumn {
  name: string
  type: 'INTEGER' | 'TEXT'
  /** Marks the primary key, rendered with a key badge. */
  pk?: boolean
  /** Foreign-key target in `table.column` form, e.g. `'suspects.id'`. */
  fk?: string
}

/** A table as drawn on the Case Board ERD. Must mirror the real schema. */
export interface ErdTable {
  name: string
  columns: ErdColumn[]
}

/**
 * One fill-in-the-blank on the Report Card.
 *
 * A blank stays locked until a query the player runs returns a row where
 * `row[unlockedByColumn]` loosely equals `triggerValue`. See
 * `src/engine/verification.js` for the comparison rules.
 */
export interface ReportBlank {
  /** Short description of what the blank is, e.g. `'the killer'`. */
  label: string
  /** The correct answer. Must be one of `options`. */
  targetValue: string
  /**
   * Result column that unlocks this blank. Matched case-insensitively, so a
   * player's `AS LAST_PING` still satisfies a `last_ping` trigger.
   */
  unlockedByColumn: string
  /** Value that must appear in `unlockedByColumn`. Compared loosely (3 == '3'). */
  triggerValue: string | number
  /** Dropdown choices. While locked the correct answer is hidden. */
  options: string[]
  /**
   * The query that proves this blank, used by the case-integrity tests to
   * verify the blank is actually reachable. See `src/cases/CASE_DESIGN.md`.
   */
  provingQuery: string
  /** One line nudging the player toward the proving query. */
  hint: string
  /**
   * Names another blank this one deliberately shares a proving query with,
   * when both are genuinely the same deduction. Without it, the case tests
   * reject a query that unlocks more than one blank — see CASE_DESIGN.md.
   */
  coUnlocksWith?: string
}

/** The Report Card: a closing paragraph with `{{key}}` tokens as dropdowns. */
export interface CaseReport {
  /** Closing paragraph. Every `{{key}}` must have a matching entry in `blanks`. */
  template: string
  blanks: Record<string, ReportBlank>
}

/**
 * One marker-pen highlight on the Scope memo.
 *
 * `start`/`end` are character offsets into `Engagement.report`. `text` is what
 * those offsets covered when the highlight was made, so a save can be checked
 * against a reworded report instead of painting the wrong words.
 */
export interface Highlight {
  start: number
  end: number
  text: string
}

/**
 * One labelled vital in the Scope header — a two-line cell under its own term.
 *
 * The term travels with the case rather than being fixed in the markup, so an
 * access review can head its scope with "Control" and "System" while a change
 * audit uses "Period" and "Environment".
 */
export interface EngagementVital {
  /** Column label, e.g. `'Control'`. Also the React key, so keep it unique. */
  term: string
  line1: string
  line2: string
}

/** The engagement memo shown on the Scope tab. */
export interface Engagement {
  /** Rendered in order, one cell each. Two to four reads best. */
  vitals: EngagementVital[]
  /** 2–4 paragraphs. Must contain every fact the player has to deduce. */
  report: string
  /**
   * Control objectives / scope limitations. Optional because only cases 01 and
   * 06 define them and nothing in the UI currently renders the array — see the
   * note in CASE_DESIGN.md. Typed as present-or-absent rather than required so
   * the existing cases check without being edited.
   */
  constraints?: string[]
}

/** One step of the guided tutorial (Case 01 only). */
export interface TutorialStep {
  /** Tab to switch to before showing the card. Omit to leave the tab alone. */
  tab?: 'scene' | 'board' | 'analysis' | 'report'
  title: string
  body: string
}

/**
 * Audit domain for the filing-cabinet folder tone. Maps to `paper.*` in
 * Tailwind. Declared per case and type-checked, though no component reads it
 * yet — the folder art is uniform yardstock today.
 */
export type FolderTheme =
  | 'access'
  | 'change'
  | 'finance'
  | 'vendor'
  | 'privacy'
  | 'continuity'

/**
 * A playable case. Everything the game needs is plain data — no binary .db
 * file, no per-case code.
 */
export interface PlayableCase {
  /** Sequential and unique, e.g. `'case_02'`. Order in `CASES` gates unlocks. */
  id: string
  code: string
  /** One-word mood/category shown on the card. */
  tag: string
  title: string
  /** 1–2 sentences for the level card. Hint at the mystery without spoiling it. */
  teaser: string
  folderTheme: FolderTheme
  /** `false` only for the first case; every later case unlocks on the previous. */
  locked: boolean
  tutorial?: TutorialStep[]
  engagement: Engagement
  /** Schema + seed data as plain SQL. Executed by sql.js to build the case DB. */
  schemaSql: string
  erd: { tables: ErdTable[] }
  report: CaseReport
  comingSoon?: undefined
}

/**
 * A "coming soon" placeholder. Renders as a locked folder on Level Select but
 * has no playable content, so the content fields are all null.
 */
export interface ComingSoonCase {
  id: string
  code: string
  tag: string
  title: string
  teaser: string
  folderTheme: FolderTheme
  locked: true
  comingSoon: true
  engagement: null
  schemaSql: null
  erd: null
  report: null
}

/** Any entry in the `CASES` roster. */
export type GameCase = PlayableCase | ComingSoonCase

/** A single result row: column name → cell value. */
export type ResultRow = Record<string, unknown>

/** What `runQuery` hands back to the UI. Never throws; errors come back here. */
export interface QueryResult {
  columns: string[]
  /** Rows of the LAST result set — what the grid displays. */
  rows: ResultRow[]
  /** Rows across EVERY result set, so unlock checks see multi-statement runs. */
  allRows: ResultRow[]
  error: string | null
  empty: boolean
}
