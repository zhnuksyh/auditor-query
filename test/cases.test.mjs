/**
 * Case integrity tests.
 *
 * A case is only shippable if every Report Card blank can actually be REACHED
 * by running SQL against the case database. This suite builds each case's real
 * schema in sql.js and, for every blank, runs that blank's `provingQuery` and
 * asserts the query genuinely unlocks it through the production
 * `evaluateUnlocks` — the same function the app calls after a player's query.
 *
 * That closes the failure mode that hurts most: a case that reads fine but is
 * unsolvable because a trigger value was mistyped, a seed row drifted, or a
 * comparison silently misbehaved (e.g. 'HH:MM' strings compared lexically).
 *
 * Run with: npm test   (node:test, no extra dependencies)
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

import { CASES } from '../src/cases/index.js'
import { evaluateUnlocks, gradeReport } from '../src/engine/verification.js'

// sql.js ships as UMD/CommonJS; require it the way the app's dist entry does.
const require = createRequire(import.meta.url)
const initSqlJs = require('sql.js/dist/sql-wasm.js')

const SQL = await initSqlJs()

/** Cases with real content. `comingSoon` stubs are intentionally schema-less. */
const playable = CASES.filter((c) => !c.comingSoon)

/** Mirror of sqlEngine.runQuery's row shaping, minus the UI-facing error handling. */
function execRows(db, sql) {
  const results = db.exec(sql)
  if (!results || results.length === 0) return []
  return results.flatMap((set) =>
    set.values.map((valueRow) =>
      Object.fromEntries(set.columns.map((col, i) => [col, valueRow[i]])),
    ),
  )
}

test('the case roster is well-formed', () => {
  // Guards against a vacuous green run: if the test glob ever stops matching,
  // `node --test` reports 0 tests and still exits 0. This file failing to load
  // is loud, but a roster that silently empties out would not be.
  assert.ok(playable.length >= 5, `expected the full case roster, saw ${playable.length}`)

  const ids = CASES.map((c) => c.id)
  assert.equal(new Set(ids).size, ids.length, 'case ids must be unique')

  // Level Select unlocks case N by looking at case N-1, so order matters.
  const sorted = [...ids].sort()
  assert.deepEqual(ids, sorted, 'CASES must stay in ascending id order')

  assert.equal(CASES[0].locked, false, 'the first case must start unlocked')
})

for (const gameCase of playable) {
  test(`${gameCase.id} — ${gameCase.title}`, async (t) => {
    const db = new SQL.Database()

    t.after(() => db.close())

    await t.test('schema and seed data load', () => {
      assert.doesNotThrow(
        () => db.run(gameCase.schemaSql),
        'schemaSql must execute cleanly',
      )
    })

    await t.test('the Case Board ERD matches the real database', () => {
      const liveTables = execRows(
        db,
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
      ).map((r) => r.name)

      for (const table of gameCase.erd.tables) {
        assert.ok(
          liveTables.includes(table.name),
          `ERD shows table "${table.name}" but the schema never creates it`,
        )

        // The board is the player's map of what's queryable — a column drawn
        // there that doesn't exist sends them down a dead end.
        const liveColumns = execRows(db, `PRAGMA table_info(${table.name})`).map((r) => r.name)
        for (const column of table.columns) {
          assert.ok(
            liveColumns.includes(column.name),
            `ERD shows ${table.name}.${column.name}, which the table doesn't have`,
          )
        }
      }

      for (const name of liveTables) {
        assert.ok(
          gameCase.erd.tables.some((tbl) => tbl.name === name),
          `table "${name}" exists but is missing from the Case Board ERD`,
        )
      }
    })

    await t.test('every blank in the template has a config, and vice versa', () => {
      const tokens = [...gameCase.report.template.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1])
      const configured = Object.keys(gameCase.report.blanks)

      for (const token of tokens) {
        assert.ok(
          configured.includes(token),
          `template references {{${token}}} with no matching blank config`,
        )
      }
      for (const key of configured) {
        assert.ok(
          tokens.includes(key),
          `blank "${key}" is configured but never appears in the template`,
        )
      }
    })

    await t.test('each blank is solvable and provable', async (tt) => {
      for (const [key, blank] of Object.entries(gameCase.report.blanks)) {
        await tt.test(key, () => {
          // The correct answer must be offered, or the case can't be submitted.
          assert.ok(
            blank.options.includes(blank.targetValue),
            `targetValue "${blank.targetValue}" is not among the dropdown options`,
          )
          assert.ok(blank.hint, 'every blank needs a hint')

          assert.ok(
            blank.provingQuery,
            'every blank needs a provingQuery showing it can be reached with SQL',
          )

          let rows
          assert.doesNotThrow(() => {
            rows = execRows(db, blank.provingQuery)
          }, 'provingQuery must be valid SQL against this case schema')

          assert.ok(rows.length > 0, 'provingQuery returned no rows')

          // The real unlock path — not a re-implementation of it.
          const { unlocked } = evaluateUnlocks(
            { [key]: blank },
            rows,
            new Set(),
          )
          assert.ok(
            unlocked.has(key),
            `provingQuery ran but did not unlock "${key}" ` +
              `(looking for ${JSON.stringify(blank.triggerValue)} in column "${blank.unlockedByColumn}")`,
          )
        })
      }
    })

    await t.test('the intended solution grades as correct', () => {
      const answers = Object.fromEntries(
        Object.entries(gameCase.report.blanks).map(([key, blank]) => [key, blank.targetValue]),
      )
      const { correct } = gradeReport(gameCase.report.blanks, answers)
      assert.ok(correct, 'the case\'s own targetValues must grade as a correct report')
    })

    await t.test('a wrong answer does not grade as correct', () => {
      const [firstKey, firstBlank] = Object.entries(gameCase.report.blanks)[0]
      const wrong = firstBlank.options.find((o) => o !== firstBlank.targetValue)
      assert.ok(wrong, 'each blank needs at least one decoy option')

      const answers = Object.fromEntries(
        Object.entries(gameCase.report.blanks).map(([key, blank]) => [key, blank.targetValue]),
      )
      answers[firstKey] = wrong

      const { correct } = gradeReport(gameCase.report.blanks, answers)
      assert.ok(!correct, 'a wrong answer must not pass grading')
    })
  })
}
