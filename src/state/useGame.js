import { useCallback, useEffect, useState } from 'react'
import { loadState, saveState, resetState } from '../engine/storage.js'

/**
 * Top-level game state: which screen we're on, the persisted save, and the
 * currently open case. Persistence is transparent — any mutation via the
 * returned helpers writes through to localStorage.
 */
export function useGame() {
  const [screen, setScreen] = useState('menu') // 'menu' | 'levels' | 'options' | 'credits' | 'game'
  const [openCaseId, setOpenCaseId] = useState(null)
  const [save, setSave] = useState(() => loadState())

  useEffect(() => {
    saveState(save)
  }, [save])

  const patch = useCallback((updater) => {
    setSave((prev) => (typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }))
  }, [])

  const openCase = useCallback(
    (caseId) => {
      setOpenCaseId(caseId)
      patch((s) => ({ ...s, lastCaseId: caseId }))
      setScreen('game')
    },
    [patch],
  )

  const markSolved = useCallback(
    (caseId) => {
      patch((s) =>
        s.solvedCases.includes(caseId)
          ? s
          : { ...s, solvedCases: [...s.solvedCases, caseId] },
      )
    },
    [patch],
  )

  const setNotebook = useCallback(
    (caseId, text) => {
      patch((s) => ({ ...s, notebooks: { ...s.notebooks, [caseId]: text } }))
    },
    [patch],
  )

  const setHighlights = useCallback(
    (caseId, highlights) => {
      patch((s) => ({ ...s, highlights: { ...s.highlights, [caseId]: highlights } }))
    },
    [patch],
  )

  const setSqlDraft = useCallback(
    (caseId, text) => {
      patch((s) => ({ ...s, sqlDrafts: { ...s.sqlDrafts, [caseId]: text } }))
    },
    [patch],
  )

  const setReportAnswer = useCallback(
    (caseId, key, value) => {
      patch((s) => ({
        ...s,
        reportAnswers: {
          ...s.reportAnswers,
          [caseId]: { ...(s.reportAnswers?.[caseId] || {}), [key]: value },
        },
      }))
    },
    [patch],
  )

  const setUnlocks = useCallback(
    (caseId, unlockedArray) => {
      patch((s) => ({ ...s, unlocks: { ...s.unlocks, [caseId]: unlockedArray } }))
    },
    [patch],
  )

  const setSettings = useCallback(
    (partial) => {
      patch((s) => ({ ...s, settings: { ...s.settings, ...partial } }))
    },
    [patch],
  )

  const setTutorialDone = useCallback(
    (done = true) => patch((s) => ({ ...s, tutorialDone: done })),
    [patch],
  )

  const hardReset = useCallback(() => {
    // Wiping progress must not revert the player's preferences: "NEW GAME" and
    // "Reset all progress" both funnel through here, and audio/display settings
    // aren't progress. The save effect re-persists the merged state right after
    // resetState() clears storage.
    setSave((prev) => ({ ...resetState(), settings: prev.settings }))
    setOpenCaseId(null)
    setScreen('menu')
  }, [])

  return {
    screen,
    setScreen,
    openCaseId,
    openCase,
    save,
    markSolved,
    setNotebook,
    setHighlights,
    setSqlDraft,
    setReportAnswer,
    setUnlocks,
    setSettings,
    setTutorialDone,
    hardReset,
  }
}
