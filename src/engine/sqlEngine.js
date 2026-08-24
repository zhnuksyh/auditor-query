// @ts-check
/** @type {Promise<import('sql.js').SqlJsStatic> | null} */
let sqlPromise = null

/**
 * Peel .default layers off an interop-wrapped module until a function surfaces.
 * @param {any} mod
 * @returns {any}
 */
function unwrapFn(mod) {
  let cur = mod
  for (let i = 0; i < 4 && cur && typeof cur !== 'function'; i++) {
    cur = cur.default
  }
  return cur
}

/**
 * Lazily initialise the sql.js Wasm runtime exactly once.
 *
 * Both the sql.js JS glue AND the ~660 KB .wasm binary are pulled in via
 * dynamic import(), so nothing sql.js-related lives in the initial bundle or
 * the module-evaluation path. The engine is only fetched the first time a case
 * database is actually built.
 *
 * @returns {Promise<import('sql.js').SqlJsStatic>}
 */
export function getSqlJs() {
  if (!sqlPromise) {
    sqlPromise = (async () => {
      const [sqlModule, wasmModule] = await Promise.all([
        // Import the explicit dist entry, not the bare "sql.js" specifier: under
        // Vite dev the package's module field doesn't reliably expose initSqlJs,
        // whereas the dist UMD file does (as the default export).
        import('sql.js/dist/sql-wasm.js'),
        // Vite resolves this to a hashed asset URL at build time; the ?url import
        // is now evaluated lazily rather than at module top, so it never blocks
        // (or crashes) the initial render.
        import('sql.js/dist/sql-wasm.wasm?url'),
      ])
      // sql.js is a UMD module. Depending on Vite dev vs. prod interop the init
      // function can be the namespace, `.default`, or double-wrapped
      // `.default.default`. Unwrap until we actually hold a function.
      const initSqlJs = unwrapFn(sqlModule)
      if (typeof initSqlJs !== 'function') {
        throw new Error('sql.js init export not found on module')
      }
      const wasmUrl = wasmModule.default || wasmModule
      return initSqlJs({ locateFile: () => wasmUrl })
    })()
  }
  return sqlPromise
}

/**
 * Build an in-memory database from a schema + seed SQL script.
 * Each case ships its schema as a plain SQL string so no binary .db is needed.
 * @param {string} schemaSql
 * @returns {Promise<import('sql.js').Database>}
 */
export async function createDatabase(schemaSql) {
  const SQL = await getSqlJs()
  const db = new SQL.Database()
  db.run(schemaSql)
  return db
}

/**
 * Execute an arbitrary SQL string.
 * Returns the LAST result set (the one the player usually cares about) as
 * { columns, rows } plus any error message. Never throws — errors are returned
 * so the UI can render them in the results panel.
 *
 * `allRows` covers every result set of a multi-statement run, so unlock checks
 * still see a proving query even when it isn't the final statement.
 *
 * @param {import('sql.js').Database} db
 * @param {string} sql
 * @returns {{ columns: string[], rows: Array<Record<string, unknown>>, allRows: Array<Record<string, unknown>>, error: string|null, empty: boolean }}
 */
export function runQuery(db, sql) {
  const trimmed = (sql || '').trim()
  if (!trimmed) {
    return { columns: [], rows: [], allRows: [], error: null, empty: true }
  }
  try {
    const results = db.exec(trimmed)
    if (!results || results.length === 0) {
      // Statement ran but returned no result set (e.g. an UPDATE, or empty SELECT).
      return { columns: [], rows: [], allRows: [], error: null, empty: true }
    }
    /** @param {import('sql.js').QueryExecResult} set */
    const toRows = (set) =>
      set.values.map((valueRow) => {
        /** @type {Record<string, unknown>} */
        const obj = {}
        set.columns.forEach((col, i) => {
          obj[col] = valueRow[i]
        })
        return obj
      })
    const rows = toRows(results[results.length - 1])
    const allRows = results.length === 1 ? rows : results.flatMap(toRows)
    return { columns: results[results.length - 1].columns, rows, allRows, error: null, empty: rows.length === 0 }
  } catch (err) {
    return { columns: [], rows: [], allRows: [], error: /** @type {Error} */ (err).message || String(err), empty: false }
  }
}
