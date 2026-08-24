/**
 * Minimal type declarations for sql.js.
 *
 * sql.js ships no typings of its own and there is no maintained `@types/sql.js`
 * worth adding a dependency for, so this declares just the surface the app
 * actually uses: initialising the Wasm runtime, constructing a Database, and
 * running statements. Anything else stays untyped rather than guessed at.
 *
 * The app imports the explicit dist entry (`sql.js/dist/sql-wasm.js`) because
 * under Vite dev the package's module field doesn't reliably expose initSqlJs;
 * both specifiers are declared here so either import site type-checks.
 */

declare module 'sql.js' {
  /** One result set from `Database.exec`. */
  export interface QueryExecResult {
    columns: string[]
    values: unknown[][]
  }

  export class Database {
    constructor(data?: ArrayLike<number> | Buffer | null)
    /** Run one or more statements, returning a result set per SELECT. */
    exec(sql: string): QueryExecResult[]
    /** Run statements for their side effects (CREATE/INSERT); returns nothing. */
    run(sql: string): Database
    /** Free the underlying Wasm memory. */
    close(): void
    /** Serialise the database to a byte array. */
    export(): Uint8Array
  }

  export interface SqlJsStatic {
    Database: typeof Database
  }

  export interface InitSqlJsConfig {
    /** Maps the `.wasm` filename to a URL — Vite gives us a hashed asset path. */
    locateFile?: (file: string) => string
  }

  const initSqlJs: (config?: InitSqlJsConfig) => Promise<SqlJsStatic>
  export default initSqlJs
}

declare module 'sql.js/dist/sql-wasm.js' {
  import initSqlJs from 'sql.js'
  export default initSqlJs
}

/** Vite resolves this to a hashed asset URL string at build time. */
declare module 'sql.js/dist/sql-wasm.wasm?url' {
  const url: string
  export default url
}
