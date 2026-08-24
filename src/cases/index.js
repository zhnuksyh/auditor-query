import { case01 } from './case01.js'
import { case02 } from './case02.js'
import { case03 } from './case03.js'
import { case04 } from './case04.js'
import { case05 } from './case05.js'
import { case06 } from './case06.js'

/**
 * Case 07 is a "coming soon" placeholder — it renders as a folder but has no
 * playable schema yet. `comingSoon` marks it for the level-select card.
 */
const lockedStub = (over) => ({
  locked: true,
  crimeScene: null,
  schemaSql: null,
  erd: null,
  report: null,
  ...over,
})

export const CASES = [
  case01,
  case02,
  case03,
  case04,
  case05,
  case06,
  lockedStub({
    id: 'case_07',
    code: 'CODE_07',
    tag: 'TIDE',
    title: 'Slack Water',
    folderTheme: 'signal',
    teaser: 'The harbour gave the body back at dawn. The tide tables say it should never have reached that jetty.',
    comingSoon: true,
  }),
]

export function getCase(id) {
  return CASES.find((c) => c.id === id) || null
}

/** A case is unlocked if it's case_01 or the previous case has been solved. */
export function isCaseUnlocked(caseId, solvedCases) {
  const idx = CASES.findIndex((c) => c.id === caseId)
  if (idx <= 0) return true
  return solvedCases.includes(CASES[idx - 1].id)
}
