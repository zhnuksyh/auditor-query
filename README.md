# Detective Query

A browser-based murder mystery deduction game where you play as the **Detective**.
Field agents upload physical evidence, interviews, and timelines into relational
databases, where you sit at a terminal and write **raw SQL** to cross-reference
alibis, spot timeline inconsistencies, and crack the case.

You can't guess your way to a solution. You have to query the facts and find the
logical flaw hiding in the tables.

> Inspired by [SQL Noir](https://www.sqlnoir.com/) and the
> [SQL Murder Mystery](https://mystery.knightlab.com/).

## Core pillars

- **Deduction through SQL.** Every answer is provable with a `SELECT`; nothing is
  solvable by guessing.
- **Zero setup.** No database install, no backend, no hosting cost. The SQLite
  engine is compiled to WebAssembly and runs entirely in the browser.
- **Airtight mysteries.** Cases are built on classic tropes — timeline
  inconsistencies, physical impossibilities, forensic mismatches — made legible
  through queries.

## How it plays

1. **Main Menu** → **Level Select** (a filing-cabinet carousel of case files) →
   the four-tab case workspace.
2. Inside a case:
   - **Crime Scene** — the narrative report and forensic constraints.
   - **Case Board** — an interactive ERD of the case database (tables, columns,
     foreign-key relationships).
   - **Analysis** — a CodeMirror SQL editor over the case database, a results
     grid, and an auto-saving detective's notebook.
   - **Report Card** — a fill-in-the-blank deduction. Each blank stays locked
     until you run the query that proves it, then submit to close the case and
     unlock the next.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite (static, two HTML entry points) |
| Styling | Tailwind CSS (deep charcoal base, crimson accent) |
| DB engine | [sql.js](https://github.com/sql-js/sql.js) — SQLite compiled to WebAssembly |
| SQL editor | [CodeMirror 6](https://codemirror.net/) |
| Data grid | [TanStack Table](https://tanstack.com/table) |
| Icons | [lucide-react](https://lucide.dev/) |
| PWA | [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) — offline + installable |

Everything is fully client-side, so it deploys to any static host (GitHub Pages,
Netlify, Vercel).

## Running locally

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build to dist/
npm run preview  # preview the production build
npm test         # case-integrity checks (Node's built-in test runner)
npm run typecheck # type-check the case data and engine (no build output)
```

`npm run typecheck` runs TypeScript in check-only mode over the case data and
the engine. There are no `.ts` files — types live in `src/types.d.ts` and are
attached through JSDoc comments in files marked `// @ts-check`, so TypeScript
never emits anything and the shipped bundle is byte-for-byte identical to an
untyped build. Components, screens and the trailer are deliberately not
checked; the value is in the case data, where a mistyped `triggerValue` or a
missing blank is otherwise a silent runtime failure.

`npm test` builds every case's real schema in sql.js and verifies the case is
actually solvable: that the Case Board ERD matches the database, that each
Report Card blank has a `provingQuery` which unlocks it through the same
`evaluateUnlocks` the app uses, and that the intended answers grade as correct
while a decoy does not. Run it after editing any case — a mistyped trigger
value or a drifted seed row makes a case unsolvable without anything else
visibly breaking.

> On Windows, run these from PowerShell — some dependency post-install scripts
> (esbuild, sql.js) need `node` on the PATH.

## Deployment (GitHub Pages)

The repo ships a GitHub Actions workflow (`.github/workflows/deploy.yml`) that
builds and publishes to GitHub Pages on every push to `main`. To enable it:

1. Push to GitHub.
2. In the repo, go to **Settings → Pages → Build and deployment** and set
   **Source** to **GitHub Actions**.
3. The next push to `main` (or a manual run from the **Actions** tab) deploys to
   `https://<user>.github.io/detective-query/`.

Because asset paths are relative, the same build also works on Netlify, Vercel,
or any static host.

## Installable (PWA)

The app is a Progressive Web App — you can add it to your phone or tablet home
screen and launch it fullscreen, and it works offline once cached.

- **iOS/iPadOS (Safari):** open the site → Share → **Add to Home Screen**.
- **Android/desktop (Chrome/Edge):** use the **Install** icon in the address bar,
  or the browser menu → **Install app**.

The service worker precaches the app shell and the SQLite Wasm binary, so cases
run without a network connection after the first load.

## Project structure

```
public/           PWA icons and the menu music (copied verbatim into dist/)
src/
  assets/         static art (main-menu background)
  cases/          case data — one file per case, plus CASE_DESIGN.md and _TEMPLATE.md
  components/     tab UIs, table, dropdown, tab bar, stamp, tutorial overlay
  engine/         sql.js runtime, verification matrix, save system, audio, error hints
  screens/        Main Menu, Level Select, Guide, Options, Credits, Game Dashboard
  state/          game state and sound hooks
  trailer/        the kinetic-typography trailer — a second entry point, not a route
  types.d.ts      shared type definitions (JSDoc, no .ts source)
test/             case-integrity test suite
trailer/          the trailer's index.html entry point
```

The build produces **two pages**: the game at `/` and the trailer at `/trailer/`.
Both are plain static HTML entry points, so they work on any host without
SPA-fallback rewrites.

## Authoring a new case

Cases are pure data. `src/cases/CASE_DESIGN.md` explains what makes a case
harder than the one before it — the difficulty dials, the constraints that keep
a case solvable, and the checklist to run it against.
`src/cases/_TEMPLATE.md` is a design form covering
everything a case needs: identity, the crime-scene narrative, the database
schema and seed rows (with the single planted contradiction that makes it
solvable), and the Report Card blanks with their unlock triggers. Fill it in,
add a `caseNN.js`, and register it in `src/cases/index.js`. Give every blank a
`provingQuery` and run `npm test` — the suite will tell you if the case can't
actually be solved.

## Credits

- Concept & design — Zahin Ukasyah
- Main menu art — Rebecca Hu, Illustrator & Concept Artist
- Inspired by **SQL Noir** and the **SQL Murder Mystery**
- Built on sql.js, CodeMirror, TanStack Table, React, Vite, and Tailwind CSS

All cases, suspects, and forensic data are entirely fictional.
