// @ts-check
import { case01 } from './case01.js'
import { case02 } from './case02.js'
import { case03 } from './case03.js'
import { case04 } from './case04.js'
import { case05 } from './case05.js'
import { case06 } from './case06.js'
import { case07 } from './case07.js'
import { case08 } from './case08.js'
import { case09 } from './case09.js'

/** @type {import('../types.js').GameCase[]} */
export const CASES = [
  case01,
  case02,
  case03,
  case04,
  case05,
  case06,
  case07,
  case08,
  case09,
]

/**
 * @param {string} id
 * @returns {import('../types.js').GameCase | null}
 */
export function getCase(id) {
  return CASES.find((c) => c.id === id) || null
}

/** A case is unlocked if it's case_01 or the previous case has been solved. */
/**
 * @param {string} caseId
 * @param {string[]} solvedCases
 * @returns {boolean}
 */
export function isCaseUnlocked(caseId, solvedCases) {
  const idx = CASES.findIndex((c) => c.id === caseId)
  if (idx <= 0) return true
  return solvedCases.includes(CASES[idx - 1].id)
}
